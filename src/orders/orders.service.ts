import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../billing/stripe.service.js';
import { BillingService } from '../billing/billing.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { OrderStatus, PaymentStatus, ProductStatus } from '../generated/prisma/enums.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Unifies and maps database OrderStatus enum to the 5 canonical order statuses:
   * 'New' | 'Processing' | 'Delivery Sent' | 'Completed' | 'Cancelled'
   */
  public toCanonicalStatus(
    status: any,
  ): 'New' | 'Processing' | 'Delivery Sent' | 'Completed' | 'Cancelled' {
    const s = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'PROCESSING' || s === 'CONFIRMED') return 'Processing';
    if (s === 'DELIVERY_SENT' || s === 'IN_TRANSIT' || s === 'SHIPPED') return 'Delivery Sent';
    if (s === 'COMPLETED' || s === 'DELIVERED') return 'Completed';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'Cancelled';
    return 'New'; // PENDING or default
  }

  /**
   * Helper to format order for API response matching client expectations
   */
  private formatOrder(order: any) {
    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: formattedDate,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      district: order.district,
      upazila: order.upazila,
      city: order.city,
      postalCode: order.postalCode,
      notes: order.notes,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus === 'SUCCEEDED' ? 'Paid' : 'Pending Payment',
      status: this.toCanonicalStatus(order.status),
      rawStatus: order.status,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      transactionId: order.transactionId || order.stripePaymentIntentId,
      courierName: order.courierName || 'KrishiKunjo Cold-Chain Logistics',
      trackingNumber: order.trackingNumber || `KK-TRK-${order.orderNumber.replace(/[^0-9]/g, '') || '9921'}`,
      estimatedDelivery: order.estimatedDelivery || '2-3 Business Days',
      trackingMilestones: order.trackingMilestones || [],
      isDeleted: Boolean((order as any).isDeleted),
      deletedAt: (order as any).deletedAt || null,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        category: item.category || 'General Agriculture',
        sku: item.sku || 'KK-AGRO-ITEM',
        price: item.price,
        quantity: item.quantity,
        deliveryCharge: item.deliveryCharge || 0,
        vendorId: item.vendorId || null,
        total: item.price * item.quantity,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * 1. Place a new order with items, delivery calculation, and optional Stripe payment
   */
  async create(dto: CreateOrderDto, userId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const totalOrdersCount = await this.prisma.order.count();
    const orderNumber = `KK-ORD-${(88000 + totalOrdersCount + 1).toString()}`;

    // Calculate Subtotal & Delivery Fee
    const calculatedSubtotal = dto.items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    // Max delivery fee among items or provided deliveryFee
    let calculatedDelivery =
      dto.deliveryFee !== undefined
        ? Number(dto.deliveryFee)
        : Math.max(...dto.items.map((i) => Number(i.deliveryCharge || 0)), 60);

    // If subtotal >= 2000, free delivery
    if (calculatedSubtotal >= 2000 && dto.deliveryFee === undefined) {
      calculatedDelivery = 0;
    }

    const discount = Number(dto.discount || 0);
    const totalAmount = Math.max(0, calculatedSubtotal + calculatedDelivery - discount);

    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let orderStatus: OrderStatus = OrderStatus.PENDING;
    let transactionId: string | undefined = undefined;
    let stripePaymentIntentId: string | undefined = undefined;

    const isStripeOrCard =
      dto.paymentMethod?.toLowerCase().includes('stripe') ||
      dto.paymentMethod?.toLowerCase().includes('card') ||
      dto.paymentMethod?.toLowerCase().includes('online');

    // Process Stripe Payment if paying online
    if (isStripeOrCard && dto.cardNumber && dto.cardExpiry && dto.cardCvc) {
      const [expMonthStr, expYearStr] = (dto.cardExpiry || '').split('/');
      const cardPayload = {
        number: dto.cardNumber,
        expMonth: Number(expMonthStr) || 12,
        expYear: Number(expYearStr && expYearStr.length === 2 ? `20${expYearStr}` : expYearStr) || 2028,
        cvc: dto.cardCvc,
        name: dto.cardholderName || dto.customerName,
      };

      const paymentResult = await this.stripeService.processSoilTestPayment({
        farmerName: dto.customerName,
        phone: dto.customerPhone,
        email: dto.customerEmail,
        amount: totalAmount,
        card: cardPayload,
        packageName: `KrishiKunjo Order ${orderNumber} (${dto.items.length} items)`,
      });

      if (!paymentResult || !paymentResult.success) {
        throw new BadRequestException('Payment failed. Please verify your card details.');
      }

      paymentStatus = PaymentStatus.SUCCEEDED;
      orderStatus = OrderStatus.CONFIRMED;
      transactionId = paymentResult.transactionId;
      stripePaymentIntentId = paymentResult.stripePaymentId;
    }

    const nowFormatted = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const initialMilestones = [
      {
        title: 'Order Placed',
        description: 'Your agricultural supply order was successfully registered in the system.',
        timestamp: nowFormatted,
        completed: true,
        current: orderStatus === OrderStatus.PENDING,
      },
      {
        title: 'Order Confirmed & Agronomist Verified',
        description: 'Verified by KrishiKunjo Regional Hub agronomist for batch quality.',
        timestamp: paymentStatus === PaymentStatus.SUCCEEDED ? nowFormatted : 'Pending',
        completed: paymentStatus === PaymentStatus.SUCCEEDED,
        current: paymentStatus === PaymentStatus.SUCCEEDED,
      },
      {
        title: 'Packed in Temperature-Controlled Seal',
        description: 'Dispatched from Gazipur Agro Distribution Depot.',
        timestamp: 'Pending Dispatch',
        completed: false,
      },
      {
        title: 'In Transit / Courier Handover',
        description: 'Package in transit with regional cold-chain delivery vehicle.',
        timestamp: 'Pending',
        completed: false,
      },
      {
        title: 'Farmgate Delivery',
        description: 'Handover and signature verification at delivery address.',
        timestamp: 'Estimated in 2-3 Days',
        completed: false,
      },
    ];

    // Resolve items with valid database products and vendors
    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        let validProductId: string | null = null;
        let validVendorId: string | null = item.vendorId || null;

        if (item.productId) {
          const prod = await this.prisma.product.findFirst({
            where: {
              OR: [{ id: String(item.productId) }, { slug: String(item.productId) }],
            },
            select: { id: true, vendorId: true },
          });

          if (prod) {
            validProductId = prod.id;
            if (!validVendorId && prod.vendorId) {
              validVendorId = prod.vendorId;
            }
          }
        }

        return {
          productId: validProductId,
          productName: item.productName.trim(),
          productImage: item.productImage.trim(),
          category: item.category?.trim() || 'Agriculture',
          sku: item.sku?.trim() || null,
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          deliveryCharge: Number(item.deliveryCharge || 0),
          vendorId: validVendorId,
        };
      }),
    );

    // Create Order and Items in DB
    const createdOrder = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail.trim().toLowerCase(),
        customerPhone: dto.customerPhone.trim(),
        deliveryAddress: dto.deliveryAddress.trim(),
        district: dto.district.trim(),
        upazila: dto.upazila?.trim() || null,
        city: dto.city?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        notes: dto.notes?.trim() || null,
        subtotal: calculatedSubtotal,
        deliveryFee: calculatedDelivery,
        discount,
        total: totalAmount,
        paymentMethod: dto.paymentMethod || 'Cash on Delivery',
        paymentStatus,
        status: orderStatus,
        transactionId,
        stripePaymentIntentId,
        courierName: 'KrishiKunjo Cold-Chain Logistics',
        trackingNumber: `KK-TRK-${orderNumber.replace(/[^0-9]/g, '')}`,
        estimatedDelivery: '2-3 Business Days',
        trackingMilestones: initialMilestones,
        items: {
          create: resolvedItems,
        },
      },
      include: {
        items: true,
      },
    });

    this.logger.log(`Created new order #${createdOrder.orderNumber} for ${createdOrder.customerName}`);
    return this.formatOrder(createdOrder);
  }

  /**
   * Helper to normalize flexible status strings to Prisma OrderStatus
   */
  private normalizeStatus(status?: string): OrderStatus | undefined {
    if (!status) return undefined;
    const s = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'ALL') return undefined;
    if (s === 'NEW' || s === 'PENDING') return OrderStatus.PENDING;
    if (s === 'CONFIRMED' || s === 'PROCESSING') return OrderStatus.PROCESSING;
    if (s === 'DELIVERY_SENT' || s === 'IN_TRANSIT' || s === 'SHIPPED') return OrderStatus.SHIPPED;
    if (s === 'COMPLETED' || s === 'DELIVERED') return OrderStatus.DELIVERED;
    if (s === 'CANCELLED' || s === 'CANCELED') return OrderStatus.CANCELLED;
    if (Object.values(OrderStatus).includes(s as OrderStatus)) return s as OrderStatus;
    return undefined;
  }

  /**
   * Helper to normalize payment status strings to Prisma PaymentStatus
   */
  private normalizePaymentStatus(status?: string): PaymentStatus | undefined {
    if (!status) return undefined;
    const s = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'ALL') return undefined;
    if (s === 'PAID' || s === 'SUCCEEDED' || s === 'SUCCESS') return PaymentStatus.SUCCEEDED;
    if (s === 'PENDING' || s === 'PENDING_PAYMENT') return PaymentStatus.PENDING;
    if (s === 'FAILED') return PaymentStatus.FAILED;
    if (Object.values(PaymentStatus).includes(s as PaymentStatus)) return s as PaymentStatus;
    return undefined;
  }

  /**
   * 2. Find all orders with optional search & filters
   */
  async findAll(query: QueryOrderDto) {
    const where: any = {};

    // Soft-delete filtering: default to active non-deleted orders
    if (query.isDeleted === 'true' || query.isDeleted === '1') {
      where.isDeleted = true;
    } else if (query.isDeleted === 'all' || query.includeDeleted === 'true') {
      // include all orders without isDeleted filter
    } else {
      where.isDeleted = false;
    }

    if (query.email?.trim()) {
      where.customerEmail = { contains: query.email.trim(), mode: 'insensitive' };
    }

    if (query.phone?.trim()) {
      where.customerPhone = { contains: query.phone.trim() };
    }

    if (query.status && query.status.trim() !== 'All') {
      const normalized = this.normalizeStatus(query.status);
      if (normalized) {
        if (normalized === OrderStatus.PROCESSING) {
          where.status = { in: [OrderStatus.PROCESSING, OrderStatus.CONFIRMED] };
        } else {
          where.status = normalized;
        }
      }
    }

    if (query.vendorId?.trim()) {
      where.items = {
        some: {
          vendorId: query.vendorId.trim(),
        },
      };
    }

    if (query.paymentStatus && query.paymentStatus.trim() !== 'All') {
      const normalizedPay = this.normalizePaymentStatus(query.paymentStatus);
      if (normalizedPay) {
        where.paymentStatus = normalizedPay;
      }
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        {
          items: {
            some: {
              productName: { contains: q, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const take = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const page = Math.max(1, Number(query.page) || 1);
    const skip = (page - 1) * take;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => this.formatOrder(o)),
      total,
      page,
      limit: take,
    };
  }

  /**
   * 3. Find single order by ID or orderNumber
   */
  async findOne(idOrNumber: string) {
    const trimmed = idOrNumber?.trim();
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmed }, { orderNumber: trimmed }],
      },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }

    return this.formatOrder(order);
  }

  /**
   * 4. Update order status & delivery details
   */
  async updateStatus(idOrNumber: string, dto: UpdateOrderStatusDto) {
    const trimmed = idOrNumber?.trim();
    const existing = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmed }, { orderNumber: trimmed }],
      },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }

    const nextStatus = this.normalizeStatus(dto.status);
    const nextPaymentStatus = this.normalizePaymentStatus(dto.paymentStatus);

    const dataToUpdate: any = {};
    if (nextStatus !== undefined) {
      dataToUpdate.status = nextStatus;
    }

    if (nextPaymentStatus !== undefined) {
      dataToUpdate.paymentStatus = nextPaymentStatus;
    } else if (nextStatus === OrderStatus.DELIVERED && existing.paymentMethod === 'Cash on Delivery') {
      dataToUpdate.paymentStatus = PaymentStatus.SUCCEEDED;
    }

    if (dto.courierName !== undefined) dataToUpdate.courierName = dto.courierName?.trim() || null;
    if (dto.trackingNumber !== undefined) dataToUpdate.trackingNumber = dto.trackingNumber?.trim() || null;
    if (dto.estimatedDelivery !== undefined) dataToUpdate.estimatedDelivery = dto.estimatedDelivery?.trim() || null;

    // When status changes to DELIVERED, advance delivery milestones
    if (nextStatus === OrderStatus.DELIVERED) {
      if (Array.isArray(existing.trackingMilestones)) {
        const updatedMilestones = (existing.trackingMilestones as any[]).map((m: any) => ({
          ...m,
          completed: true,
          current: m.title?.includes('Delivery') || m.title?.includes('Farmgate'),
        }));
        dataToUpdate.trackingMilestones = updatedMilestones;
      }
    }

    // 1. Stock Decrement on DELIVERED
    if (nextStatus === OrderStatus.DELIVERED && existing.status !== OrderStatus.DELIVERED) {
      for (const item of existing.items) {
        if (item.productId) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const newStock = Math.max(0, product.stock - (item.quantity || 1));
            const newStatus =
              newStock === 0 ? ProductStatus.OUT_OF_STOCK : product.status;

            await this.prisma.product.update({
              where: { id: product.id },
              data: {
                stock: newStock,
                status: newStatus,
              },
            });

            this.logger.log(
              `Stock deducted for product '${product.name}' (${product.id}): ${product.stock} -> ${newStock} upon delivery of order #${existing.orderNumber}`,
            );
          }
        }
      }

      // Automated Vendor Settlement: 100% on platform; Admin retains commission; vendor payout scheduled for 10 minutes later
      const vendorTotals = new Map<string, number>();
      for (const item of existing.items) {
        if (item.vendorId) {
          const itemTotal = Number(item.price) * Number(item.quantity);
          vendorTotals.set(
            item.vendorId,
            (vendorTotals.get(item.vendorId) || 0) + itemTotal,
          );
        }
      }

      for (const [vendorId, totalAmount] of vendorTotals.entries()) {
        try {
          await this.billingService.recordOrderSettlement({
            orderId: existing.orderNumber,
            customerEmail: existing.customerEmail,
            vendorId,
            totalAmount,
            currency: 'usd',
          });
        } catch (e: any) {
          this.logger.error(
            `Error creating vendor payout settlement for order #${existing.orderNumber}: ${e.message}`,
          );
        }
      }
    } else if (existing.status === OrderStatus.DELIVERED && nextStatus === OrderStatus.CANCELLED) {
      // 2. Restore stock if delivered order is cancelled
      for (const item of existing.items) {
        if (item.productId) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const restoredStock = product.stock + (item.quantity || 1);
            const restoredStatus =
              product.status === ProductStatus.OUT_OF_STOCK && restoredStock > 0
                ? ProductStatus.ACTIVE
                : product.status;

            await this.prisma.product.update({
              where: { id: product.id },
              data: {
                stock: restoredStock,
                status: restoredStatus,
              },
            });

            this.logger.log(
              `Stock restored for product '${product.name}' (${product.id}): ${product.stock} -> ${restoredStock} due to order cancellation`,
            );
          }
        }
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    const canonicalStatus = this.toCanonicalStatus(updated.status);

    this.logger.log(`Order #${existing.orderNumber} status updated to ${canonicalStatus}`);

    return {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: canonicalStatus,
      rawStatus: updated.status,
      paymentStatus: updated.paymentStatus === 'SUCCEEDED' ? 'Paid' : 'Pending Payment',
      message: 'Order status updated successfully',
    };
  }

  /**
   * 5. Delete an order
   */
    /**
   * 5. Delete an order (Supports both SOFT delete and HARD delete)
   */
  async remove(idOrNumber: string, mode: 'soft' | 'hard' = 'soft') {
    const trimmed = idOrNumber?.trim();
    const existing = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmed }, { orderNumber: trimmed }],
      },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }

    if (mode === 'soft') {
      await this.prisma.order.update({
        where: { id: existing.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Order #${existing.orderNumber} soft-deleted (archived) successfully`);
      return {
        success: true,
        mode: 'soft',
        message: `Order #${existing.orderNumber} removed from active list (archived)`,
      };
    }

    // Hard delete: permanently erase
    await this.prisma.$transaction(async (tx) => {
      // Disassociate transaction if exists
      await tx.transaction
        .updateMany({
          where: { orderId: existing.id },
          data: { orderId: null },
        })
        .catch(() => {});

      // Disassociate product reviews if exists
      await (tx as any).productReview
        ?.updateMany({
          where: { orderId: existing.id },
          data: { orderId: null },
        })
        .catch(() => {});

      // Delete order messages if exists
      await (tx as any).orderMessage
        ?.deleteMany({
          where: { orderId: existing.id },
        })
        .catch(() => {});

      await tx.orderItem.deleteMany({
        where: { orderId: existing.id },
      });

      await tx.order.delete({
        where: { id: existing.id },
      });
    });

    this.logger.log(`Order #${existing.orderNumber} permanently deleted successfully`);
    return {
      success: true,
      mode: 'hard',
      message: `Order #${existing.orderNumber} permanently deleted successfully`,
    };
  }

  /**
   * Restore a soft-deleted order back to active list
   */
  async restore(idOrNumber: string) {
    const trimmed = idOrNumber?.trim();
    const existing = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmed }, { orderNumber: trimmed }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    this.logger.log(`Order #${existing.orderNumber} restored to active list`);
    return {
      success: true,
      message: `Order #${existing.orderNumber} restored successfully`,
    };
  }

  /**
   * 6. Bulk Delete Orders (Supports both SOFT delete and HARD delete)
   */
  async bulkRemove(ids: string[], mode: 'soft' | 'hard' = 'soft') {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, count: 0, message: 'No orders provided for deletion' };
    }

    const trimmedIds = ids.map((id) => String(id || '').trim()).filter(Boolean);

    if (mode === 'soft') {
      const res = await this.prisma.order.updateMany({
        where: {
          OR: [{ id: { in: trimmedIds } }, { orderNumber: { in: trimmedIds } }],
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return {
        success: true,
        mode: 'soft',
        count: res.count,
        message: `${res.count} orders removed from active list (archived)`,
      };
    }

    // Hard delete:
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ id: { in: trimmedIds } }, { orderNumber: { in: trimmedIds } }],
      },
      select: { id: true, orderNumber: true },
    });

    let deletedCount = 0;
    for (const order of orders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.transaction
            .updateMany({ where: { orderId: order.id }, data: { orderId: null } })
            .catch(() => {});

          await (tx as any).productReview
            ?.updateMany({ where: { orderId: order.id }, data: { orderId: null } })
            .catch(() => {});

          await (tx as any).orderMessage
            ?.deleteMany({ where: { orderId: order.id } })
            .catch(() => {});

          await tx.orderItem.deleteMany({ where: { orderId: order.id } });
          await tx.order.delete({ where: { id: order.id } });
        });
        deletedCount++;
      } catch (err: any) {
        this.logger.error(`Failed to permanently delete order ${order.orderNumber}: ${err.message}`);
      }
    }

    return {
      success: true,
      mode: 'hard',
      count: deletedCount,
      message: `${deletedCount} orders permanently deleted successfully`,
    };
  }

  /**
   * 7. Get Order Invoice Data
   */
  async getInvoice(idOrNumber: string) {
    const order = await this.findOne(idOrNumber);
    return {
      order,
      invoiceNumber: `INV-${order.orderNumber.replace(/[^0-9]/g, '') || '1001'}`,
      issuedDate: order.orderDate,
    };
  }

  /**
   * 8. Get Order Invoice Print HTML
   */
  async getInvoicePrintHtml(idOrNumber: string) {
    const order = await this.findOne(idOrNumber);
    const itemsHtml = (order.items || []).map((it: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${it.name || it.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${it.qty || it.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">৳${Number(it.price || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">৳${(Number(it.price || 0) * Number(it.qty || it.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${order.orderNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #0E4F5A; padding-bottom: 15px; }
    .logo { font-size: 24px; font-weight: bold; color: #0E4F5A; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
    .total-box { margin-top: 25px; text-align: right; }
    .total-line { font-size: 18px; font-weight: bold; color: #0E4F5A; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">KrishiKunjo Invoice</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Order #${order.orderNumber}</div>
    </div>
    <div style="text-align: right; font-size: 13px; color: #64748b;">
      <div>Date: ${order.orderDate}</div>
      <div>Status: ${order.status} (${order.paymentStatus})</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 25px;">
    <div>
      <strong>Billed To:</strong><br />
      ${order.customerName}<br />
      ${order.customerEmail} | ${order.customerPhone}<br />
      ${order.deliveryAddress || ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="total-box">
    <div style="font-size: 14px; color: #64748b;">Subtotal: ৳${Number(order.subtotal || 0).toFixed(2)}</div>
    <div style="font-size: 14px; color: #64748b;">Delivery Fee: ৳${Number(order.deliveryFee || 0).toFixed(2)}</div>
    <div class="total-line" style="margin-top: 8px;">Total: ৳${Number(order.total || 0).toFixed(2)}</div>
  </div>
</body>
</html>`;
  }

}
