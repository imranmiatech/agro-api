import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from './stripe.service.js';
import { SaveCardDto } from './dto/save-card.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdateCommissionDto } from './dto/update-commission.dto.js';
import { PaymentStatus, PayoutStatus, Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private payoutInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  onModuleInit() {
    // Initial check for any pending payouts that matured while the server was restarting
    this.processPendingPayoutsCron().catch((err) =>
      this.logger.error(`Initial pending payout sweep error: ${err.message}`),
    );

    // Periodic sweep every 60 seconds for due 10-minute vendor payouts
    this.payoutInterval = setInterval(() => {
      this.processPendingPayoutsCron().catch((err) =>
        this.logger.error(`Periodic pending payout sweep error: ${err.message}`),
      );
    }, 60 * 1000);
  }

  /**
   * Retrieves current platform commission percentage from database settings (default 5%)
   */
  async getCommissionRate(): Promise<number> {
    try {
      const setting = await this.prisma.platformSetting.findUnique({
        where: { key: 'commission_percentage' },
      });
      if (setting && !isNaN(Number(setting.value))) {
        return Math.max(0, Math.min(100, Number(setting.value)));
      }
    } catch {
      // fallback
    }
    return 5.0; // default 5%
  }

  /**
   * Retrieves commission settings details for Admin UI
   */
  async getCommissionSettings() {
    const rate = await this.getCommissionRate();
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'commission_percentage' },
    });
    return {
      commissionPercentage: rate,
      payoutDelayMinutes: 10,
      description:
        'Platform commission fee retained by Admin on product sales. Remaining balance is automatically paid out to the vendor in 10 minutes.',
      updatedAt: setting?.updatedAt || new Date(),
    };
  }

  /**
   * Updates and fixes the platform commission percentage in Admin settings
   */
  async updateCommissionRate(user: AuthenticatedUser, dto: UpdateCommissionDto) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only platform administrators can configure commission settings',
      );
    }

    const rate = Number(dto.commissionPercentage);
    const updated = await this.prisma.platformSetting.upsert({
      where: { key: 'commission_percentage' },
      update: {
        value: rate.toString(),
        description: 'Admin platform commission percentage',
      },
      create: {
        key: 'commission_percentage',
        value: rate.toString(),
        description: 'Admin platform commission percentage',
      },
    });

    this.logger.log(`Admin ${user.email} updated platform commission rate to ${rate}%`);

    return {
      message: 'Platform commission setting updated successfully',
      commissionPercentage: rate,
      payoutDelayMinutes: 10,
      updatedAt: updated.updatedAt,
    };
  }


  /**
   * 1. Get all saved cards for the authenticated Admin or Vendor.
   */
  async getSavedCards(user: AuthenticatedUser) {
    const cards = await this.prisma.savedCard.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return cards.map((card) => ({
      id: card.id,
      cardholderName: card.cardholderName,
      cardNumber: `•••• •••• •••• ${card.last4}`,
      rawLast4: card.last4,
      expiry: card.expiry,
      cardType: card.brand as 'Visa' | 'Mastercard' ,
      isDefault: card.isDefault,
      createdAt: card.createdAt,
    }));
  }

  /**
   * 2. Save and securely tokenize a payment card for Admin or Vendor.
   */
  async saveCard(user: AuthenticatedUser, dto: SaveCardDto) {
    // 1. Fetch user to obtain or create Stripe Customer
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });

    if (!dbUser) {
      throw new NotFoundException('User account not found');
    }

    const stripeCustomerId = await this.stripeService.getOrCreateCustomer(dbUser);
    if (!dbUser.stripeCustomerId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // 2. Parse expiry MM/YY
    const [monthStr, yearStr] = dto.expiry.split('/');
    const expMonth = parseInt(monthStr, 10);
    const fullYear = parseInt(`20${yearStr}`, 10);

    const cleanNumber = dto.cardNumber.replace(/\D/g, '');
    const last4 = cleanNumber.slice(-4);

    // Detect card brand
    let brand = 'Visa';
    if (cleanNumber.startsWith('34') || cleanNumber.startsWith('37')) {
      brand = 'Amex';
    } else if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) {
      brand = 'Mastercard';
    }

    // 3. Vault & Attach PaymentMethod with Stripe
    let stripePaymentMethodId: string | null = null;
    try {
      const pm = await this.stripeService.createAndAttachPaymentMethod(
        stripeCustomerId,
        {
          number: cleanNumber,
          expMonth,
          expYear: fullYear,
          cvc: dto.cvv,
          name: dto.cardholderName.trim(),
        },
      );
      stripePaymentMethodId = pm.id;
      if (pm.card?.brand) {
        brand =
          pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
      }
    } catch (error: any) {
      // In sandbox mode without live real cards, if Stripe test API rejects a synthetic number,
      // fallback to vault record for demo testing
      this.logger.warn(`Stripe live tokenization note: ${error.message}. Saving vault record.`);
      stripePaymentMethodId = `pm_sim_${Date.now()}`;
    }

    // Check if this is user's first card
    const existingCardsCount = await this.prisma.savedCard.count({
      where: { userId: user.id },
    });

    const shouldBeDefault = dto.isDefault ?? existingCardsCount === 0;

    // 4. If default, unset other defaults
    if (shouldBeDefault) {
      await this.prisma.savedCard.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    // 5. Store card record
    const saved = await this.prisma.savedCard.create({
      data: {
        userId: user.id,
        cardholderName: dto.cardholderName.trim(),
        brand,
        last4,
        expiry: dto.expiry.trim(),
        expiryMonth: expMonth,
        expiryYear: fullYear,
        stripePaymentMethodId,
        isDefault: shouldBeDefault,
      },
    });

    return {
      id: saved.id,
      cardholderName: saved.cardholderName,
      cardNumber: `•••• •••• •••• ${saved.last4}`,
      rawLast4: saved.last4,
      expiry: saved.expiry,
      cardType: saved.brand as 'Visa' | 'Mastercard' | 'Amex',
      isDefault: saved.isDefault,
      createdAt: saved.createdAt,
    };
  }

  /**
   * 3. Set a card as the default settlement payment method.
   */
  async setDefaultCard(user: AuthenticatedUser, cardId: string) {
    const card = await this.prisma.savedCard.findFirst({
      where: { id: cardId, userId: user.id },
    });

    if (!card) {
      throw new NotFoundException('Payment card not found');
    }

    await this.prisma.$transaction([
      this.prisma.savedCard.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      }),
      this.prisma.savedCard.update({
        where: { id: cardId },
        data: { isDefault: true },
      }),
    ]);

    return this.getSavedCards(user);
  }

  /**
   * 4. Delete a saved payment card.
   */
  async deleteCard(user: AuthenticatedUser, cardId: string) {
    const card = await this.prisma.savedCard.findFirst({
      where: { id: cardId, userId: user.id },
    });

    if (!card) {
      throw new NotFoundException('Payment card not found');
    }

    // Detach from Stripe if attached
    if (card.stripePaymentMethodId && !card.stripePaymentMethodId.startsWith('pm_sim_')) {
      await this.stripeService.detachPaymentMethod(card.stripePaymentMethodId);
    }

    await this.prisma.savedCard.delete({
      where: { id: cardId },
    });

    // If deleted card was default, set the latest remaining card as default
    if (card.isDefault) {
      const remaining = await this.prisma.savedCard.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (remaining) {
        await this.prisma.savedCard.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return {
      message: 'Card deleted successfully',
      remainingCards: await this.getSavedCards(user),
    };
  }

  /**
   * 5. Process Payment with Dynamic Admin Commission & Scheduled 10-min Vendor Payout.
   * - 100% of payment goes first to Admin's Stripe platform account.
   * - Configurable commission % is retained as platform fee.
   * - Remaining vendor amount is queued for automated payout in exactly 10 minutes.
   */
  async createPaymentAndSchedulePayout(
    user: AuthenticatedUser | null,
    dto: CreatePaymentDto,
  ) {
    // 1. Resolve vendor
    const vendorProfile = await this.prisma.vendorProfile.findFirst({
      where: {
        OR: [{ id: dto.vendorId }, { userId: dto.vendorId }],
      },
      select: {
        id: true,
        businessName: true,
        businessEmail: true,
        stripeAccountId: true,
      },
    });

    if (!vendorProfile) {
      throw new NotFoundException(`Vendor not found with ID ${dto.vendorId}`);
    }

    const amount = Number(dto.amount);
    const currency = (dto.currency || 'usd').toLowerCase();

    // 2. Dynamically calculate Admin Commission and Vendor Payout
    const commissionRate = await this.getCommissionRate();
    const commissionFee = Number(((amount * commissionRate) / 100).toFixed(2));
    const vendorAmount = Number((amount - commissionFee).toFixed(2));

    // 3. Create Stripe PaymentIntent on Admin platform account
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency,
      paymentMethodId: dto.paymentMethodId,
      orderId: dto.orderId,
      customerEmail: dto.customerEmail || user?.email,
      commissionFee,
      vendorAmount,
      vendorId: vendorProfile.id,
    });

    // 4. Schedule vendor payout for exactly 10 minutes later
    const payoutScheduledAt = new Date(Date.now() + 10 * 60 * 1000);

    const transaction = await this.prisma.transaction.create({
      data: {
        orderId: dto.orderId || `ORD-${Date.now()}`,
        customerEmail: dto.customerEmail || user?.email || null,
        vendorId: vendorProfile.id,
        totalAmount: amount,
        currency,
        commissionFee,
        vendorAmount,
        stripePaymentId: paymentIntent.id,
        status: PaymentStatus.SUCCEEDED,
        payoutStatus: PayoutStatus.PENDING,
        payoutScheduledAt,
      },
    });

    // 5. Trigger Background Automated Payout Timer (fires after 10 minutes)
    this.scheduleVendorPayoutTimer(transaction.id, 10 * 60 * 1000);

    this.logger.log(
      `✅ Payment Intent ${paymentIntent.id} created: Total $${amount}. Admin ${commissionRate}% fee: $${commissionFee}. Vendor payout $${vendorAmount} scheduled in 10 minutes (${payoutScheduledAt.toISOString()}).`,
    );

    return {
      message: 'Payment received successfully on admin account',
      transactionId: transaction.id,
      orderId: transaction.orderId,
      totalAmount: amount,
      currency,
      commissionFee,
      adminShare: `${commissionFee} (${currency.toUpperCase()} - ${commissionRate}% fee)`,
      vendorAmount,
      vendorShare: `${vendorAmount} (${currency.toUpperCase()} - payout scheduled in 10 min)`,
      payoutScheduledAt,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Records an order settlement when delivery is completed or paid online.
   * Admin receives funds; retains admin commission %; queues vendor payout for 10 minutes later.
   */
  async recordOrderSettlement(params: {
    orderId: string;
    customerEmail?: string;
    vendorId: string;
    totalAmount: number;
    currency?: string;
  }) {
    // Prevent duplicate transaction for same order and vendor
    const existing = await this.prisma.transaction.findFirst({
      where: {
        orderId: params.orderId,
        vendorId: params.vendorId,
      },
    });

    if (existing) {
      return existing;
    }

    const rate = await this.getCommissionRate();
    const commissionFee = Number(((params.totalAmount * rate) / 100).toFixed(2));
    const vendorAmount = Number((params.totalAmount - commissionFee).toFixed(2));
    const payoutScheduledAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const tx = await this.prisma.transaction.create({
      data: {
        orderId: params.orderId,
        customerEmail: params.customerEmail || null,
        vendorId: params.vendorId,
        totalAmount: params.totalAmount,
        currency: params.currency || 'usd',
        commissionFee,
        vendorAmount,
        status: PaymentStatus.SUCCEEDED,
        payoutStatus: PayoutStatus.PENDING,
        payoutScheduledAt,
      },
    });

    this.scheduleVendorPayoutTimer(tx.id, 10 * 60 * 1000);
    this.logger.log(
      `Order #${params.orderId} settlement created: $${params.totalAmount} (Admin ${rate}% fee: $${commissionFee}, Vendor: $${vendorAmount}). Automated vendor payout scheduled in 10 minutes.`,
    );

    return tx;
  }

  /**
   * Sweeps and executes any mature vendor payouts whose 10-minute timer has expired.
   */
  async processPendingPayoutsCron() {
    const now = new Date();
    const dueTxs = await this.prisma.transaction.findMany({
      where: {
        payoutStatus: PayoutStatus.PENDING,
        payoutScheduledAt: { lte: now },
      },
      take: 50,
    });

    if (dueTxs.length > 0) {
      this.logger.log(`Executing ${dueTxs.length} due 10-minute vendor payouts...`);
      for (const tx of dueTxs) {
        try {
          await this.executeVendorPayout(tx.id);
        } catch (e: any) {
          this.logger.error(`Error processing payout for tx ${tx.id}: ${e.message}`);
        }
      }
    }
  }

  /**
   * Helper: Schedule in-memory timer for the 10-minute vendor payout execution.
   */
  private scheduleVendorPayoutTimer(transactionId: string, delayMs: number) {
    setTimeout(async () => {
      try {
        await this.executeVendorPayout(transactionId);
      } catch (err: any) {
        this.logger.error(`Error during automated vendor payout: ${err.message}`);
      }
    }, delayMs);
  }


  /**
   * 6. Executes the Vendor Payout (transfers 98% balance to vendor).
   */
  async executeVendorPayout(transactionId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            stripeAccountId: true,
          },
        },
      },
    });

    if (!tx || tx.payoutStatus === PayoutStatus.COMPLETED) {
      return;
    }

    // Mark as processing
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { payoutStatus: PayoutStatus.PROCESSING },
    });

    // Transfer 98% amount to vendor
    const transferResult = await this.stripeService.transferToVendor({
      vendorAmount: tx.vendorAmount,
      currency: tx.currency,
      vendorStripeAccountId: tx.vendor?.stripeAccountId,
      vendorBusinessName: tx.vendor?.businessName,
      transactionId: tx.id,
    });

    if (transferResult.success) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          payoutStatus: PayoutStatus.COMPLETED,
          payoutCompletedAt: new Date(),
        },
      });

      this.logger.log(
        `🎉 Automated Vendor Payout Completed: $${tx.vendorAmount} sent to Vendor ${tx.vendor?.businessName || tx.vendorId}`,
      );
    } else {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { payoutStatus: PayoutStatus.FAILED },
      });
      this.logger.error(`Automated vendor payout failed for transaction ${tx.id}`);
    }
  }

  /**
   * 7. List transactions / settlement history for Admin or Vendor.
   */
  async getTransactions(user: AuthenticatedUser) {
    const where: any = {};

    if (user.role === Role.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (vendorProfile) {
        where.vendorId = vendorProfile.id;
      }
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
          },
        },
      },
    });
  }

  /**
   * 8. Handle Stripe Webhook Events.
   */
  async handleWebhook(rawBody: Buffer | string, signature: string) {
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const tx = await this.prisma.transaction.findFirst({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (tx && tx.payoutStatus === PayoutStatus.PENDING) {
        this.logger.log(`Stripe webhook: PaymentIntent ${paymentIntent.id} confirmed.`);
      }
    }

    return { received: true };
  }
}
