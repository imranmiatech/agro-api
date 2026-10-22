import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller.js';
import { ConsultationsService } from './consultations.service.js';
import { ConsultationsGateway } from './consultations.gateway.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway],
  exports: [ConsultationsService, ConsultationsGateway],
})
export class ConsultationsModule {}
