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
import { CategoryModule } from './category/category.module.js';
import { BillingModule } from './billing/billing.module.js';
import { PartnersModule } from './partners/partners.module.js';
import { ContentModule } from './content/content.module.js';
import { ExpertsModule } from './experts/experts.module.js';
import { ConsultationsModule } from './consultations/consultations.module.js';
import { SoilTestsModule } from './soil-tests/soil-tests.module.js';
import { ContactModule } from './contact/contact.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { OrderMessagesModule } from './order-messages/order-messages.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { VendorSupportModule } from './vendor-support/vendor-support.module.js';
import { OverviewModule } from './overview/overview.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    ProfileModule,
    UsersModule,
    ProductsModule,
    CategoryModule,
    BillingModule,
    PartnersModule,
    ContentModule,
    ExpertsModule,
    ConsultationsModule,
    SoilTestsModule,
    ContactModule,
    OrdersModule,
    OrderMessagesModule,
    ReviewsModule,
    VendorSupportModule,
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}