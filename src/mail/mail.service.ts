import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user =
      process.env.SMTP_USER ||
      process.env.email ||
      'imranmiatech@gmail.com';
    const rawPass =
      process.env.SMTP_PASS ||
      process.env.app_password ||
      'ayrx jzke qkrl urqs';
    // Gmail app passwords work best with spaces removed
    const pass = rawPass.replace(/\s+/g, '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, expiresInMinutes = 5): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo Marketplace" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0B5460; margin: 0; }
          .logo p { font-size: 13px; color: #64748b; margin-top: 4px; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .content { text-align: center; }
          .content h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .content p { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .otp-card { background: #f0fdf4; border: 2px dashed #0B5460; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0B5460; font-family: monospace; }
          .badge { display: inline-block; font-size: 12px; font-weight: 600; color: #b45309; background: #fef3c7; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo Marketplace</h1>
            <p>Vendor Partner Registration</p>
          </div>
          <div class="divider"></div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for starting your vendor partner application. Please enter the one-time verification code below to verify your email and continue registration.</p>
            <div>
              <span class="badge">Valid for ${expiresInMinutes} minutes</span>
            </div>
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              If you didn't request this verification code, you can safely ignore this email.
            </p>
          </div>
          <div class="divider"></div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo Marketplace. All rights reserved.<br>
            Automated system notification &bull; Do not reply to this email
          </div>
        </div>
      </body>
    </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: `[Krisikunjo] Your Vendor Verification Code: ${otp}`,
        text: `Your Krisikunjo vendor verification code is: ${otp}. It will expire in ${expiresInMinutes} minutes.`,
        html,
      });

      this.logger.log(`OTP email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}:`, error);
      // We log but don't crash so the flow can still return debugOtp in development
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, expiresInMinutes = 10): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo Marketplace" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0B5460; margin: 0; }
          .logo p { font-size: 13px; color: #64748b; margin-top: 4px; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .content { text-align: center; }
          .content h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .content p { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .otp-card { background: #fef2f2; border: 2px dashed #ef4444; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; font-family: monospace; }
          .badge { display: inline-block; font-size: 12px; font-weight: 600; color: #b45309; background: #fef3c7; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo Marketplace</h1>
            <p>Account Security & Password Recovery</p>
          </div>
          <div class="divider"></div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Use the verification code below to verify your identity and set a new password.</p>
            <div>
              <span class="badge">Valid for ${expiresInMinutes} minutes</span>
            </div>
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              If you did not request a password reset, please change your credentials immediately or contact support.
            </p>
          </div>
          <div class="divider"></div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo Marketplace. All rights reserved.<br>
            Automated system notification &bull; Do not reply to this email
          </div>
        </div>
      </body>
    </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: `[Krisikunjo] Password Reset Code: ${otp}`,
        text: `Your Krisikunjo password reset verification code is: ${otp}. It will expire in ${expiresInMinutes} minutes.`,
        html,
      });

      this.logger.log(`Password reset email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      return false;
    }
  }
}
