import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module.js';

import { OtpService } from './otp/otp.service.js';
import { RegistrationController } from './registration/registration.controller.js';
import { RegistrationService } from './registration/registration.service.js';
import { LoginController } from './login/login.controller.js';
import { LoginService } from './login/login.service.js';
import { PasswordResetController } from './password-reset/password-reset.controller.js';
import { PasswordResetService } from './password-reset/password-reset.service.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'multi_vendor_jwt_super_secret_key_2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    RegistrationController,
    LoginController,
    PasswordResetController,
  ],
  providers: [
    AuthService,
    OtpService,
    RegistrationService,
    LoginService,
    PasswordResetService,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    OtpService,
    RegistrationService,
    LoginService,
    PasswordResetService,
    JwtAuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}
