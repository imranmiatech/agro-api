import { Module } from '@nestjs/common';
import { SoilTestsService } from './soil-tests.service.js';
import { SoilPdfService } from './soil-pdf.service.js';
import { SoilTestsController } from './soil-tests.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';
import { BillingModule } from '../billing/billing.module.js';

@Module({
  imports: [PrismaModule, MailModule, BillingModule],
  controllers: [SoilTestsController],
  providers: [SoilTestsService, SoilPdfService],
  exports: [SoilTestsService, SoilPdfService],
})
export class SoilTestsModule {}
