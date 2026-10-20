import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OtpService } from '../otp/otp.service.js';
import { LoginService } from '../login/login.service.js';
import { CustomerRegisterDto } from './dto/customer-register.dto.js';
import { VendorRegisterDto } from './dto/vendor-register.dto.js';
import { SendOtpDto } from '../otp/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto.js';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly loginService: LoginService,
  ) {}

  /**
   * 1. Customer Registration (Immediate activation, no OTP required)
   */
  async registerCustomer(dto: CustomerRegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        password: hashedPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const { accessToken, refreshToken } = await this.loginService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      message: 'Account created successfully',
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * 2. Vendor Step 1: Send OTP to prospective business email
   */
  async sendVendorOtp(dto: SendOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException('An active account with this email already exists. Please log in.');
    }

    return this.otpService.sendOtp({
      email,
      type: 'VENDOR_REGISTRATION',
      expiresInMinutes: 5,
      message: 'Verification OTP has been sent to your email address.',
    });
  }

  /**
   * 3. Vendor Step 2: Verify OTP code
   */
  async verifyVendorOtp(dto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp({
      email: dto.email,
      otpCode: dto.otpCode,
      type: 'VENDOR_REGISTRATION',
    });

    return {
      verified: true,
      message: result.message,
    };
  }

  /**
   * 4. Vendor Step 4: Finalize Vendor Registration
   */
  async registerVendor(dto: VendorRegisterDto) {
    const email = dto.email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Verify OTP was passed
    const isVerified = await this.otpService.isEmailVerifiedForRegistration(email);
    if (!isVerified) {
      throw new BadRequestException('Please complete email verification (OTP) before submitting registration.');
    }

    // Generate slug
    const baseSlug = dto.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slug = `${baseSlug}-${randomSuffix}`;

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user and profile transactionally
    const newUser = await this.prisma.user.create({
      data: {
        name: dto.contactPerson,
        email,
        password: hashedPassword,
        role: 'VENDOR',
        status: 'INACTIVE', // Awaiting admin approval
        isEmailVerified: true,
        vendorProfile: {
          create: {
            businessName: dto.businessName,
            slug,
            shortDescription: dto.shortDescription,
            businessEmail: email,
            businessPhone: dto.phoneNumber,
            category: dto.category,
            logo: dto.logo,
            isOtpVerified: true,
            country: dto.country,
            city: dto.city,
            address: dto.address,
            openingHours: dto.openingHours,
            contactPerson: dto.contactPerson,
            contactRole: dto.contactRole,
            contactEmail: dto.contactEmail.toLowerCase().trim(),
            contactPhone: dto.contactPhone,
            status: 'PENDING',
          },
        },
      },
      include: {
        vendorProfile: true,
      },
    });

    return {
      message: 'Your partner registration request has been submitted successfully and is awaiting administrator approval.',
      vendorId: newUser.vendorProfile?.id,
      businessName: newUser.vendorProfile?.businessName,
      status: newUser.vendorProfile?.status,
    };
  }
}
