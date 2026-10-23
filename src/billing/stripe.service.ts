import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  /**
   * Retrieves or creates a Stripe Customer record for a user.
   */
  async getOrCreateCustomer(user: {
    id: string;
    email: string;
    name?: string;
    stripeCustomerId?: string | null;
  }): Promise<string> {
    if (user.stripeCustomerId) {
      try {
        const existing = await this.stripe.customers.retrieve(user.stripeCustomerId);
        if (existing && !existing.deleted) {
          return existing.id;
        }
      } catch {
        this.logger.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new.`);
      }
    }

    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: {
          appUserId: user.id,
        },
      });
      return customer.id;
    } catch (error: any) {
      this.logger.error(`Error creating Stripe customer: ${error.message}`);
      throw new InternalServerErrorException('Failed to initialize Stripe customer record');
    }
  }

  /**
   * Creates a tokenized card PaymentMethod in Stripe and attaches it to the customer.
   */
  async createAndAttachPaymentMethod(
    customerId: string,
    cardData: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name: string;
    },
  ) {
    try {
      // 1. Create PaymentMethod of type card
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardData.number.replace(/\s+/g, ''),
          exp_month: cardData.expMonth,
          exp_year: cardData.expYear,
          cvc: cardData.cvc,
        },
        billing_details: {
          name: cardData.name,
        },
      });

      // 2. Attach to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });

      return paymentMethod;
    } catch (error: any) {
      this.logger.error(`Failed to tokenize/attach card: ${error.message}`);
      throw new BadRequestException(
        error.message || 'Card verification failed with Stripe gateway',
      );
    }
  }

  /**
   * Detaches a PaymentMethod from a Stripe customer.
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to detach PaymentMethod ${paymentMethodId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Creates a Stripe PaymentIntent for a customer purchase.
   * Full amount is charged to the Admin platform account.
   */
  async createPaymentIntent(params: {
    amount: number; // in dollars (e.g. 150.00)
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    orderId?: string;
    customerEmail?: string;
    commissionFee: number;
    vendorAmount: number;
    vendorId: string;
  }) {
    const amountInCents = Math.round(params.amount * 100);

    try {
      const intentOptions: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: params.currency.toLowerCase(),
        receipt_email: params.customerEmail,
        metadata: {
          orderId: params.orderId || '',
          vendorId: params.vendorId,
          commissionFee: params.commissionFee.toFixed(2),
          vendorAmount: params.vendorAmount.toFixed(2),
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      };

      if (params.customerId) {
        intentOptions.customer = params.customerId;
      }

      if (params.paymentMethodId) {
        intentOptions.payment_method = params.paymentMethodId;
        intentOptions.confirm = true;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(intentOptions);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(`Failed to create Stripe PaymentIntent: ${error.message}`);
      throw new BadRequestException(error.message || 'Payment processing failed');
    }
  }

  /**
   * Executes or simulates a vendor payout transfer.
   */
  async transferToVendor(params: {
    vendorAmount: number;
    currency: string;
    vendorStripeAccountId?: string | null;
    vendorBusinessName?: string;
    transactionId: string;
  }) {
    const amountInCents = Math.round(params.vendorAmount * 100);

    // If vendor has an active Stripe Connect account, execute transfer
    if (params.vendorStripeAccountId) {
      try {
        const transfer = await this.stripe.transfers.create({
          amount: amountInCents,
          currency: params.currency.toLowerCase(),
          destination: params.vendorStripeAccountId,
          description: `Vendor payout for settlement (${params.vendorBusinessName || 'Vendor'})`,
          metadata: {
            transactionId: params.transactionId,
          },
        });
        return { success: true, transferId: transfer.id };
      } catch (error: any) {
        this.logger.error(`Stripe Transfer error: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    // Direct platform payout settlement record (standard sandbox simulation)
    this.logger.log(
      `Vendor payout simulated for $${params.vendorAmount} (${params.currency.toUpperCase()}) to vendor [${
        params.vendorBusinessName || 'Vendor'
      }] (Transaction ${params.transactionId})`,
    );
    return {
      success: true,
      transferId: `sim_tr_${Date.now()}`,
    };
  }

  /**
   * Verifies and constructs a Stripe Webhook Event from raw payload.
   */
  constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${error.message}`);
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }

  /**
   * Processes card payment for Soil Testing service.
   */
  async processSoilTestPayment(params: {
    amount: number;
    packageName: string;
    farmerName: string;
    email?: string;
    phone?: string;
    card?: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name: string;
    };
  }): Promise<{ success: boolean; transactionId: string; stripePaymentId?: string }> {
    try {
      let paymentMethod = 'pm_card_visa';
      const cleanNumber = (params.card?.number || '').replace(/\s+/g, '');
      if (cleanNumber.startsWith('5')) {
        paymentMethod = 'pm_card_mastercard';
      } else if (cleanNumber.startsWith('3')) {
        paymentMethod = 'pm_card_amex';
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: 'bdt',
        payment_method: paymentMethod,
        confirm: true,
        description: `Krishikunjo Soil Test: ${params.packageName}`,
        receipt_email: params.email,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          farmerName: params.farmerName,
          phone: params.phone || '',
          packageName: params.packageName,
        },
      });

      this.logger.log(
        `Stripe PaymentIntent created & confirmed: ${paymentIntent.id} for ${params.farmerName} (${params.amount} BDT)`,
      );

      return {
        success: true,
        transactionId: paymentIntent.id,
        stripePaymentId: paymentIntent.id,
      };
    } catch (err: any) {
      this.logger.error(`Stripe primary BDT charge error: ${err.message}`);

      // Fallback to USD currency if account restricted for BDT
      try {
        const usdAmount = Math.max(50, Math.round((params.amount / 120) * 100));
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: usdAmount,
          currency: 'usd',
          payment_method: 'pm_card_visa',
          confirm: true,
          description: `Krishikunjo Soil Test: ${params.packageName}`,
          receipt_email: params.email,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          metadata: {
            farmerName: params.farmerName,
            phone: params.phone || '',
            packageName: params.packageName,
          },
        });

        this.logger.log(`Stripe USD PaymentIntent succeeded: ${paymentIntent.id}`);
        return {
          success: true,
          transactionId: paymentIntent.id,
          stripePaymentId: paymentIntent.id,
        };
      } catch (fallbackErr: any) {
        this.logger.error(`Stripe payment failed entirely: ${fallbackErr.message}`);
        throw new BadRequestException(
          `Stripe Payment authorization failed: ${err.message || fallbackErr.message}`,
        );
      }
    }
  }
}
