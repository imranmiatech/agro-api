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
   * 1. Get Current Authenticated User Profile (All Roles: CUSTOMER, VENDOR, ADMIN)
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
   * 2. Update Profile for ANY authenticated user (CUSTOMER, VENDOR, ADMIN)
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
      // 1. Update basic user details for ANY role (Customer, Admin, Vendor)
      const userDataToUpdate: { name?: string; avatar?: string } = {};

      const nameToUpdate = dto.name || dto.contactPerson;
      if (nameToUpdate && nameToUpdate.trim()) {
        userDataToUpdate.name = nameToUpdate.trim();
      }

      const avatarToUpdate = dto.avatar || dto.logo;
      if (avatarToUpdate && typeof avatarToUpdate === 'string') {
        userDataToUpdate.avatar = avatarToUpdate.trim();
      }

      if (Object.keys(userDataToUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userDataToUpdate,
        });
      }

      // 2. If user is a VENDOR and has a VendorProfile, update vendor storefront fields
      if (user.role === 'VENDOR' && user.vendorProfile) {
        const vendorDataToUpdate: any = {};
        if (dto.businessName?.trim()) vendorDataToUpdate.businessName = dto.businessName.trim();
        if (avatarToUpdate && typeof avatarToUpdate === 'string') vendorDataToUpdate.logo = avatarToUpdate.trim();
        if (dto.shortDescription !== undefined) vendorDataToUpdate.shortDescription = dto.shortDescription?.trim() || null;
        if (dto.businessPhone !== undefined) vendorDataToUpdate.businessPhone = dto.businessPhone?.trim() || null;
        if (dto.category !== undefined) vendorDataToUpdate.category = dto.category?.trim() || null;
        if (dto.country !== undefined) vendorDataToUpdate.country = dto.country?.trim() || user.vendorProfile.country;
        if (dto.city !== undefined) vendorDataToUpdate.city = dto.city?.trim() || user.vendorProfile.city;
        if (dto.address !== undefined) vendorDataToUpdate.address = dto.address?.trim() || null;
        if (dto.openingHours !== undefined) vendorDataToUpdate.openingHours = dto.openingHours?.trim() || null;
        if (nameToUpdate?.trim()) vendorDataToUpdate.contactPerson = nameToUpdate.trim();
        if (dto.contactRole !== undefined) vendorDataToUpdate.contactRole = dto.contactRole?.trim() || null;
        if (dto.contactPhone !== undefined) vendorDataToUpdate.contactPhone = dto.contactPhone?.trim() || user.vendorProfile.contactPhone;

        if (Object.keys(vendorDataToUpdate).length > 0) {
          await tx.vendorProfile.update({
            where: { userId },
            data: vendorDataToUpdate,
          });
        }
      }

      return this.getProfile(userId);
    });
  }

  /**
   * 3. Change Account Password (All Roles: CUSTOMER, VENDOR, ADMIN)
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
