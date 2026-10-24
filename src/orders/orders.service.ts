import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../billing/stripe.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { OrderStatus, PaymentStatus } from '../generated/prisma/enums.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
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
          create: dto.items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName.trim(),
            productImage: item.productImage.trim(),
            category: item.category?.trim() || 'Agriculture',
            sku: item.sku?.trim() || null,
            price: Number(item.price),
            quantity: Number(item.quantity) || 1,
            deliveryCharge: Number(item.deliveryCharge || 0),
            vendorId: item.vendorId || null,
          })),
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
  async remove(idOrNumber: string) {
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

    await this.prisma.$transaction(async (tx) => {
      // Disassociate transaction if exists
      await tx.transaction
        .updateMany({
          where: { orderId: existing.id },
          data: { orderId: null },
        })
        .catch(() => {});

      await tx.orderItem.deleteMany({
        where: { orderId: existing.id },
      });

      await tx.order.delete({
        where: { id: existing.id },
      });
    });

    this.logger.log(`Order #${existing.orderNumber} deleted successfully`);
    return { success: true, message: `Order #${existing.orderNumber} deleted successfully` };
  }
}
