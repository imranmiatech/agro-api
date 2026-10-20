import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service.js';
import { SendOtpDto } from '../otp/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@ApiTags('Auth - Password Reset')
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset OTP sent to email')
  @ApiOperation({
    summary: 'Request Password Reset OTP',
    description: 'Generates a 6-digit OTP code and emails it to the account holder.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP sent to email',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Password reset OTP sent to email',
        data: {
          message: 'Password reset code has been sent to your email address.',
          email: 'admin@gmail.com',
          expiresInSeconds: 600,
          debugOtp: '984512',
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No account found with this email' })
  async forgotPassword(@Body() dto: SendOtpDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  @Post('verify-forgot-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP verified successfully')
  @ApiOperation({
    summary: 'Verify Password Reset OTP',
    description: 'Validates the 6-digit OTP code before proceeding to password update.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP code verified',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'OTP verified successfully',
        data: {
          verified: true,
          message: 'OTP code verified successfully. You may now reset your password.',
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyForgotOtp(@Body() dto: VerifyOtpDto) {
    return this.passwordResetService.verifyForgotOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successfully')
  @ApiOperation({
    summary: 'Set New Password with Verified OTP',
    description: 'Updates the user account password upon supplying valid OTP verification.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Password reset successfully',
        data: {
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.',
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }
}
