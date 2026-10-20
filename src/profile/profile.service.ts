import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Current Authenticated User & Vendor Profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
            shortDescription: true,
            businessEmail: true,
            businessPhone: true,
            category: true,
            country: true,
            city: true,
            address: true,
            openingHours: true,
            contactPerson: true,
            contactRole: true,
            contactEmail: true,
            contactPhone: true,
            status: true,
            approvedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  /**
   * Update Profile (Customer & Vendor)
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update basic user details if provided
      const userDataToUpdate: { name?: string; avatar?: string } = {};
      if (dto.name || dto.contactPerson) {
        userDataToUpdate.name = dto.name || dto.contactPerson;
      }
      if (dto.logo) {
        userDataToUpdate.avatar = dto.logo;
      }
      if (Object.keys(userDataToUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userDataToUpdate,
        });
      }

      // 2. Update VendorProfile if user is a VENDOR
      if (user.role === 'VENDOR' && user.vendorProfile) {
        await tx.vendorProfile.update({
          where: { userId },
          data: {
            businessName: dto.businessName ?? undefined,
            logo: dto.logo ?? undefined,
            shortDescription: dto.shortDescription ?? undefined,
            businessPhone: dto.businessPhone ?? undefined,
            category: dto.category ?? undefined,
            country: dto.country ?? undefined,
            city: dto.city ?? undefined,
            address: dto.address ?? undefined,
            openingHours: dto.openingHours ?? undefined,
            contactPerson: dto.contactPerson ?? dto.name ?? undefined,
            contactRole: dto.contactRole ?? undefined,
            contactPhone: dto.contactPhone ?? undefined,
          },
        });
      }

      return this.getProfile(userId);
    });
  }

  /**
   * Change Password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password cannot be identical to your old password.');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
