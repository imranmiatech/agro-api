import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
import { imageFileFilter } from '../common/upload/multer.config.js';

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * 1. GET /api/v1/profile - Get Authenticated User Profile (All Roles: CUSTOMER, VENDOR, ADMIN)
   */
  @Get()
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({
    summary: 'Get Authenticated User Profile (Customer, Vendor, Admin)',
    description:
      'Fetches profile details for the currently logged-in user. Works for all user roles (CUSTOMER, VENDOR, ADMIN). If the user is a VENDOR, their vendor store profile is also included.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current profile retrieved successfully for all roles',
  })
  @ApiResponse({ status: 401, description: 'Missing or expired Bearer token' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  /**
   * 2. PATCH /api/v1/profile - Update Profile (All Roles: CUSTOMER, VENDOR, ADMIN)
   */
  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'file', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: imageFileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
      },
    ),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({
    summary: 'Update Profile & Merchant Storefront (All Roles: Customer, Vendor, Admin)',
    description:
      'Allows any authenticated user (CUSTOMER, VENDOR, ADMIN) to update their name, avatar, or contact information. If the user is a VENDOR, their merchant storefront details and store logo will also be updated.',
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
    @UploadedFiles()
    files?: {
      avatar?: Express.Multer.File[];
      logo?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    const uploadedFile =
      files?.avatar?.[0] || files?.logo?.[0] || files?.file?.[0];

    if (uploadedFile) {
      const uploadedUrl = await this.cloudinaryService.uploadImage(
        uploadedFile,
        'agro/profiles',
      );
      dto.avatar = uploadedUrl;
      dto.logo = uploadedUrl;
    }

    return this.profileService.updateProfile(user.id, dto);
  }

  /**
   * 3. POST /api/v1/profile/change-password - Change Account Password (All Roles: CUSTOMER, VENDOR, ADMIN)
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password changed successfully')
  @ApiOperation({
    summary: 'Change Account Password (All Roles: Customer, Vendor, Admin)',
    description:
      'Allows any authenticated user (CUSTOMER, VENDOR, ADMIN) to change their account password after validating their current password.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'New password cannot be identical to old password',
  })
  @ApiResponse({ status: 401, description: 'Current password does not match' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, dto);
  }
}
