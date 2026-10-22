import { Module } from '@nestjs/common';
import { SoilTestsService } from './soil-tests.service.js';
import { SoilTestsController } from './soil-tests.controller.js';

@Module({
  controllers: [SoilTestsController],
  providers: [SoilTestsService],
  exports: [SoilTestsService],
})
export class SoilTestsModule {}
