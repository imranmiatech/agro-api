import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module.js';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}