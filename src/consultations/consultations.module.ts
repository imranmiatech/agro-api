import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller.js';
import { ConsultationsService } from './consultations.service.js';
import { ConsultationsGateway } from './consultations.gateway.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway],
  exports: [ConsultationsService, ConsultationsGateway],
})
export class ConsultationsModule {}
