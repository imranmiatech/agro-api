import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module.js';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
