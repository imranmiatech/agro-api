import { Injectable } from '@nestjs/common';
import { RegistrationService } from './registration/registration.service.js';
import { LoginService } from './login/login.service.js';
import { OtpService } from './otp/otp.service.js';
import { PasswordResetService } from './password-reset/password-reset.service.js';
import { CustomerRegisterDto } from './registration/dto/customer-register.dto.js';
import { VendorRegisterDto } from './registration/dto/vendor-register.dto.js';
import { LoginDto } from './login/dto/login.dto.js';
import { RefreshTokenDto } from './login/dto/refresh-token.dto.js';
import { SendOtpDto } from './otp/dto/send-otp.dto.js';
import { VerifyOtpDto } from './otp/dto/verify-otp.dto.js';
import { ResetPasswordDto } from './password-reset/dto/reset-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly loginService: LoginService,
    private readonly otpService: OtpService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * 1. Customer Registration
   */
  registerCustomer(dto: CustomerRegisterDto) {
    return this.registrationService.registerCustomer(dto);
  }

  /**
   * 2. Vendor Registration - Step 1: Send Email OTP
   */
  sendVendorOtp(dto: SendOtpDto) {
    return this.registrationService.sendVendorOtp(dto);
  }

  /**
   * 3. Vendor Registration - Step 2: Verify Email OTP
   */
  verifyVendorOtp(dto: VerifyOtpDto) {
    return this.registrationService.verifyVendorOtp(dto);
  }

  /**
   * 4. Vendor Registration - Step 4: Submit Partner Application
   */
  registerVendor(dto: VendorRegisterDto) {
    return this.registrationService.registerVendor(dto);
  }

  /**
   * 5. Universal Login (Customer, Vendor, Admin)
   */
  login(dto: LoginDto) {
    return this.loginService.login(dto);
  }

  /**
   * 6. Refresh Access & Refresh Tokens
   */
  refreshTokens(dto: RefreshTokenDto) {
    return this.loginService.refreshTokens(dto);
  }

  /**
   * 7. Password Recovery - Send Reset OTP
   */
  forgotPassword(dto: SendOtpDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  /**
   * 8. Password Recovery - Verify Reset OTP
   */
  verifyForgotOtp(dto: VerifyOtpDto) {
    return this.passwordResetService.verifyForgotOtp(dto);
  }

  /**
   * 9. Password Recovery - Set New Password
   */
  resetPassword(dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }

  /**
   * 10. Logout User
   */
  logout(res?: any, refreshToken?: string) {
    return this.loginService.logout(res, refreshToken);
  }
}

