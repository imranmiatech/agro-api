import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { MailModule } from './mail/mail.module.js';
import { UsersModule } from './users/users.module.js';
import { ProductsModule } from './products/products.module.js';
import { BillingModule } from './billing/billing.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    ProfileModule,
    UsersModule,
    ProductsModule,
    BillingModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'multi-vendor-api',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
