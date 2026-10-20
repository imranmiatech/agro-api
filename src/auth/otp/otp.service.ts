import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { OtpType } from '../../generated/prisma/enums.js';

export interface SendOtpOptions {
  email: string;
  type: OtpType;
  expiresInMinutes?: number;
  message?: string;
}

export interface VerifyOtpOptions {
  email: string;
  otpCode: string;
  type: OtpType;
  markAsUsed?: boolean;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generates, persists, and delivers an OTP code via email
   */
  async sendOtp(options: SendOtpOptions) {
    const email = options.email.toLowerCase().trim();
    const type = options.type;
    const expiresInMinutes = options.expiresInMinutes ?? 5;

    // Invalidate earlier active OTPs of the same type for this email
    await this.prisma.otpVerification.deleteMany({
      where: {
        email,
        type,
      },
    });

    // Generate 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Save to database
    await this.prisma.otpVerification.create({
      data: {
        email,
        otpCode,
        type,
        expiresAt,
        isUsed: false,
      },
    });

    this.logger.log(`[OTP GENERATED] Type: ${type} | Email: ${email} | Expires: ${expiresInMinutes}m`);

    // Console output for local dev convenience
    console.log(`\n========================================`);
    console.log(`🔐 [OTP DISPATCH - ${type}]`);
    console.log(`To: ${email}`);
    console.log(`Code: ${otpCode}`);
    console.log(`Expires in: ${expiresInMinutes} minutes`);
    console.log(`========================================\n`);

    // Dispatch email notification based on type
    if (type === 'FORGOT_PASSWORD') {
      await this.mailService.sendPasswordResetEmail(email, otpCode, expiresInMinutes);
    } else {
      await this.mailService.sendOtpEmail(email, otpCode, expiresInMinutes);
    }

    return {
      message: options.message || 'Verification OTP has been sent to your email address.',
      email,
      expiresInSeconds: expiresInMinutes * 60,
      debugOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  /**
   * Verifies an OTP code against database records
   */
  async verifyOtp(options: VerifyOtpOptions) {
    const email = options.email.toLowerCase().trim();
    const otpCode = options.otpCode.trim();
    const type = options.type;

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        otpCode,
        type,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid verification code.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (options.markAsUsed) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { isUsed: true },
      });
    }

    return {
      verified: true,
      record,
      message: 'OTP code verified successfully.',
    };
  }

  /**
   * Checks whether the user has a recent verified OTP for registration
   */
  async isEmailVerifiedForRegistration(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const recentOtp = await this.prisma.otpVerification.findFirst({
      where: {
        email: normalizedEmail,
        type: 'VENDOR_REGISTRATION',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Valid if OTP exists and is either already created within 1 hour
    if (!recentOtp) {
      return false;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return recentOtp.createdAt >= oneHourAgo;
  }
}
