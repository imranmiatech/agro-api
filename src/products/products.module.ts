import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module.js';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
