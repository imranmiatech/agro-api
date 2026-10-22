import { Module } from '@nestjs/common';
import { ExpertsController } from './experts.controller.js';
import { ExpertsService } from './experts.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ExpertsController],
  providers: [ExpertsService],
  exports: [ExpertsService],
})
export class ExpertsModule {}
