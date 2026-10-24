import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OrderMessagesController } from './order-messages.controller.js';
import { OrderMessagesService } from './order-messages.service.js';
import { OrderMessagesGateway } from './order-messages.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [OrderMessagesController],
  providers: [OrderMessagesService, OrderMessagesGateway],
  exports: [OrderMessagesService, OrderMessagesGateway],
})
export class OrderMessagesModule {}
