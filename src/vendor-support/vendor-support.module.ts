import { Module } from '@nestjs/common';
import { VendorSupportController } from './vendor-support.controller.js';
import { VendorSupportService } from './vendor-support.service.js';
import { VendorSupportGateway } from './vendor-support.gateway.js';

@Module({
  controllers: [VendorSupportController],
  providers: [VendorSupportService, VendorSupportGateway],
  exports: [VendorSupportService, VendorSupportGateway],
})
export class VendorSupportModule {}
