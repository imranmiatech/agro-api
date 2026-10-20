import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OtpService } from '../otp/otp.service.js';
import { SendOtpDto } from '../otp/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * 1. Send Password Reset OTP
   */
  async forgotPassword(dto: SendOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No account found associated with this email address.');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('This account has been suspended. Please contact administrator.');
    }

    return this.otpService.sendOtp({
      email,
      type: 'FORGOT_PASSWORD',
      expiresInMinutes: 10,
      message: 'Password reset code has been sent to your email address.',
    });
  }

  /**
   * 2. Verify Password Reset OTP
   */
  async verifyForgotOtp(dto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp({
      email: dto.email,
      otpCode: dto.otpCode,
      type: 'FORGOT_PASSWORD',
      markAsUsed: false,
    });

    return {
      verified: true,
      message: result.message,
    };
  }

  /**
   * 3. Set New Password with verified OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    // Verify and consume OTP atomically
    await this.otpService.verifyOtp({
      email,
      otpCode: dto.otpCode,
      type: 'FORGOT_PASSWORD',
      markAsUsed: true,
    });

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}
