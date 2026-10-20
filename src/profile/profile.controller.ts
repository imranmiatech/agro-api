import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import {
  imageFileFilter,
} from '../common/upload/multer.config.js';

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({
    summary: 'Get Authenticated User Profile',
    description:
      'Fetches account details for the currently logged-in user. If the user is a VENDOR, also returns their comprehensive Vendor Store profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current profile retrieved successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: {
          id: 'u1d2e3f4-5678-90ab-cdef-1234567890ef',
          name: 'Jane Smith',
          email: 'hello@business.com',
          role: 'VENDOR',
          status: 'ACTIVE',
          isEmailVerified: true,
          vendorProfile: {
            id: 'v1d2e3f4-5678-90ab-cdef-1234567890cd',
            businessName: 'Little Stars Nursery',
            slug: 'little-stars-nursery-4891',
            logo: 'https://images.unsplash.com/...',
            shortDescription: 'Leading early childhood education...',
            businessEmail: 'hello@business.com',
            businessPhone: '+44 7700 900000',
            category: 'Supermarket',
            country: 'United Arab Emirates',
            city: 'Dubai',
            address: '123 High Street, Business Bay',
            openingHours: 'Mon–Fri 9:00–18:00',
            contactPerson: 'Jane Smith',
            contactRole: 'Store Manager',
            contactEmail: 'jane@business.com',
            contactPhone: '+44 7700 900001',
            status: 'APPROVED',
          },
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or expired Bearer token' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({
    summary: 'Update Profile & Merchant Storefront (Supports Image Upload)',
    description:
      'Allows customer or vendor to update their profile information, storefront details, logo image file, opening hours, or contact info.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.logo = await this.cloudinaryService.uploadImage(file, 'agro/logos');
    }
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password changed successfully')
  @ApiOperation({
    summary: 'Change Account Password',
    description: 'Validates the current password and securely updates to the new password.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'New password cannot be identical to old password' })
  @ApiResponse({ status: 401, description: 'Current password does not match' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, dto);
  }
}
