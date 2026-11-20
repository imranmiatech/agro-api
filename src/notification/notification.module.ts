import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
