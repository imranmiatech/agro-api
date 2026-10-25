import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { OrderPdfService } from './order-pdf.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BillingModule } from '../billing/billing.module.js';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfService],
  exports: [OrdersService, OrderPdfService],
})
export class OrdersModule {}
