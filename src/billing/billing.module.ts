import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { StripeService } from './stripe.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService, StripeService],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
