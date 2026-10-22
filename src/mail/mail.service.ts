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

  /**
   * Sends a Thank You confirmation email to the user upon submitting the contact form
   */
  async sendContactThankYouEmail(
    to: string,
    name: string,
    subject = 'General Inquiry',
    message?: string,
  ): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo Support" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0B5460; margin: 0; letter-spacing: -0.5px; }
          .logo p { font-size: 13px; color: #64748b; margin-top: 4px; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .badge { display: inline-block; font-size: 12px; font-weight: 600; color: #047857; background: #d1fae5; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
          .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
          .message-body { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
          .inquiry-card { background: #f8fafc; border-left: 4px solid #0B5460; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .inquiry-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .inquiry-val { font-size: 14px; color: #1e293b; font-weight: 500; margin-top: 2px; }
          .inquiry-msg { font-size: 13px; color: #334155; margin-top: 8px; white-space: pre-wrap; font-style: italic; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo Agri Marketplace</h1>
            <p>Customer Care & Agricultural Inquiries</p>
          </div>
          <div class="divider"></div>
          <div style="text-align: center;">
            <span class="badge">&#10003; Inquiry Received Successfully</span>
          </div>
          <div class="greeting">Dear ${name || 'Valued Farmer'},</div>
          <p class="message-body">
            Thank you for reaching out to <strong>Krisikunjo</strong>! We have received your inquiry and our agricultural advisory and support team is actively reviewing your message.
          </p>
          <div class="inquiry-card">
            <div class="inquiry-label">Topic / Subject</div>
            <div class="inquiry-val">${subject}</div>
            ${
              message
                ? `
            <div class="inquiry-label" style="margin-top: 12px;">Your Message</div>
            <div class="inquiry-msg">"${message}"</div>
            `
                : ''
            }
          </div>
          <p class="message-body">
            We aim to respond to all inquiries within <strong>2 business hours</strong>. If your matter is urgent, you can also reach our helpline directly via our website.
          </p>
          <p class="message-body" style="margin-bottom: 0;">
            Warm regards,<br>
            <strong>The Krisikunjo Support Team</strong>
          </p>
          <div class="divider"></div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo. All rights reserved.<br>
            Dhaka, Bangladesh &bull; info@krisikunjo.com
          </div>
        </div>
      </body>
    </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: `[Krisikunjo] Thank You for Contacting Us - "${subject}"`,
        text: `Hello ${name},\n\nThank you for reaching out to Krisikunjo! We have received your inquiry regarding "${subject}". Our specialist team will get back to you shortly.\n\nBest regards,\nKrisikunjo Support Team`,
        html,
      });

      this.logger.log(`Contact Thank You email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Contact Thank You email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Sends an issue resolution notification email to the user when admin resolves the inquiry
   */
  async sendContactResolutionEmail(
    to: string,
    name: string,
    subject = 'Inquiry',
    replyMessage?: string,
  ): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo Support" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0B5460; margin: 0; }
          .logo p { font-size: 13px; color: #64748b; margin-top: 4px; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .badge { display: inline-block; font-size: 12px; font-weight: 600; color: #047857; background: #d1fae5; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
          .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
          .message-body { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
          .response-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .response-title { font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .response-content { font-size: 14px; color: #14532d; line-height: 1.6; white-space: pre-wrap; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo Agri Marketplace</h1>
            <p>Support Ticket & Inquiry Resolution</p>
          </div>
          <div class="divider"></div>
          <div style="text-align: center;">
            <span class="badge">&#10003; Issue Resolved</span>
          </div>
          <div class="greeting">Hello ${name || 'Farmer'},</div>
          <p class="message-body">
            Good news! Your inquiry regarding <strong>"${subject}"</strong> has been reviewed and resolved by our administration team.
          </p>
          ${
            replyMessage
              ? `
          <div class="response-card">
            <div class="response-title">Official Resolution Note</div>
            <div class="response-content">${replyMessage}</div>
          </div>
          `
              : `
          <div class="response-card">
            <div class="response-title">Status Update</div>
            <div class="response-content">Our team has addressed and completed the required action for your inquiry. Thank you for your patience!</div>
          </div>
          `
          }
          <p class="message-body">
            If you need further assistance or have additional questions, please do not hesitate to contact us again.
          </p>
          <p class="message-body" style="margin-bottom: 0;">
            Thank you for being with <strong>Krisikunjo</strong>.<br>
            <strong>Customer Support & Services</strong>
          </p>
          <div class="divider"></div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo. All rights reserved.<br>
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
        subject: `[Krisikunjo] Your Inquiry Has Been Resolved: "${subject}"`,
        text: `Hello ${name},\n\nYour inquiry regarding "${subject}" has been resolved by our support team.\n\nResolution details: ${replyMessage || 'Your issue has been resolved.'}\n\nThank you for choosing Krisikunjo!\n\nBest regards,\nKrisikunjo Team`,
        html,
      });

      this.logger.log(`Resolution email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send resolution email to ${to}:`, error);
      return false;
    }
  }
}
