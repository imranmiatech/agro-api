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

  /**
   * Sends a Thank You & Consultation Resolution email to the farmer when their ticket is resolved
   */
  async sendConsultationResolvedEmail(
    to: string,
    farmerName: string,
    ticketNumber: string,
    subject: string,
    expertName?: string,
    crop?: string,
    latestAdvice?: string,
  ): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo Agri Advisory" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0E3128; margin: 0; }
          .logo p { font-size: 13px; color: #15803d; margin-top: 4px; font-weight: 600; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .badge { display: inline-block; font-size: 12px; font-weight: 700; color: #047857; background: #d1fae5; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
          .message-body { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
          .ticket-card { background: #f8fafc; border-left: 4px solid #0E3128; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0; border-left-width: 4px; }
          .ticket-badge { font-family: monospace; font-size: 12px; font-weight: 700; color: #0E3128; background: #e6f4ea; padding: 3px 8px; border-radius: 6px; display: inline-block; margin-bottom: 10px; }
          .info-row { margin-bottom: 8px; font-size: 13px; }
          .info-label { font-weight: 600; color: #64748b; }
          .info-val { color: #1e293b; font-weight: 500; }
          .advice-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin: 18px 0; }
          .advice-title { font-size: 12px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; items-center: gap-1; }
          .advice-text { font-size: 14px; color: #064e3b; line-height: 1.6; white-space: pre-line; }
          .thank-you-note { background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; border: 1px dashed #86efac; }
          .thank-you-title { font-size: 15px; font-weight: 700; color: #166534; margin-bottom: 4px; }
          .thank-you-desc { font-size: 13px; color: #15803d; line-height: 1.5; margin: 0; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo Agri Advisory</h1>
            <p>Direct Agricultural Expert Support</p>
          </div>
          <div class="divider"></div>
          <div style="text-align: center;">
            <span class="badge">&#10003; Consultation Resolved</span>
          </div>
          <div class="greeting">Dear ${farmerName || 'Valued Farmer'},</div>
          <p class="message-body">
            Thank you for consulting with <strong>Krisikunjo Agricultural Advisory Service</strong>! We are pleased to inform you that your consultation ticket has been successfully reviewed and marked as <strong>Resolved</strong> by our agricultural specialist.
          </p>

          <div class="ticket-card">
            <span class="ticket-badge">Ticket ${ticketNumber}</span>
            <div class="info-row">
              <span class="info-label">Topic / Issue:</span>
              <span class="info-val"> ${subject}</span>
            </div>
            ${
              crop
                ? `<div class="info-row">
                    <span class="info-label">Crop:</span>
                    <span class="info-val"> ${crop}</span>
                   </div>`
                : ''
            }
            ${
              expertName
                ? `<div class="info-row">
                    <span class="info-label">Assigned Specialist:</span>
                    <span class="info-val"> ${expertName}</span>
                   </div>`
                : ''
            }
          </div>

          ${
            latestAdvice
              ? `
          <div class="advice-box">
            <div class="advice-title">&#127793; Specialist Diagnosis &amp; Advice</div>
            <div class="advice-text">${latestAdvice}</div>
          </div>
          `
              : ''
          }

          <div class="thank-you-note">
            <div class="thank-you-title">&#10024; Thank You for Choosing Krisikunjo!</div>
            <p class="thank-you-desc">
              We hope our expert recommendations help protect your yield and support your farming success. You can log into your Krisikunjo account anytime to rate your consultation experience or open a new consultation.
            </p>
          </div>

          <p class="message-body" style="margin-bottom: 0;">
            Wishing you healthy crops and a prosperous harvest,<br>
            <strong>The Krisikunjo Agricultural Advisory Team</strong>
          </p>
          <div class="divider"></div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo Marketplace &amp; Agri Services. All rights reserved.<br>
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
        subject: `[Krisikunjo] Consultation #${ticketNumber} Resolved - Thank You!`,
        text: `Hello ${farmerName},\n\nThank you for choosing Krisikunjo Expert Consultation! Your ticket #${ticketNumber} regarding "${subject}" has been marked as Resolved by our agricultural specialist${expertName ? ` (${expertName})` : ''}.\n\n${latestAdvice ? `Specialist Advice:\n${latestAdvice}\n\n` : ''}We hope this advice assists your harvest. You can review and rate your consultation on your dashboard anytime.\n\nWarm regards,\nKrisikunjo Agri Advisory Team`,
        html,
      });

      this.logger.log(`Consultation Resolved Thank You email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send consultation resolved email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Sends soil test booking confirmation & receipt email with courier sample slip instructions
   */
  async sendSoilTestBookedEmail(
    to: string,
    farmerName: string,
    requestNumber: string,
    packageName: string,
    amount: number,
    district: string,
    upazila: string,
    transactionId?: string,
  ): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo AgriLab Diagnostic" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0E3128; margin: 0; }
          .logo p { font-size: 13px; color: #15803d; margin-top: 4px; font-weight: 600; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .badge { display: inline-block; font-size: 12px; font-weight: 700; color: #047857; background: #d1fae5; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
          .message-body { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
          .card { background: #f8fafc; border-left: 4px solid #0E3128; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0; border-left-width: 4px; }
          .code-badge { font-family: monospace; font-size: 13px; font-weight: 700; color: #0E3128; background: #e6f4ea; padding: 4px 10px; border-radius: 6px; display: inline-block; margin-bottom: 10px; }
          .info-row { margin-bottom: 8px; font-size: 13px; }
          .info-label { font-weight: 600; color: #64748b; }
          .info-val { color: #1e293b; font-weight: 500; }
          .instruction-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 18px 0; }
          .instruction-title { font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-bottom: 6px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo AgriLab Diagnostic</h1>
            <p>Certified Soil & Nutrient Testing Service</p>
          </div>
          <div class="divider"></div>
          <div style="text-align: center;">
            <span class="badge">&#10003; Soil Test Booked &amp; Paid (Stripe Verified)</span>
          </div>
          <div class="greeting">Dear ${farmerName || 'Farmer'},</div>
          <p class="message-body">
            Thank you for booking your agricultural soil test with <strong>Krisikunjo AgriLab</strong>! Your payment of <strong>${amount} BDT</strong> has been successfully processed and verified.
          </p>

          <div class="card">
            <span class="code-badge">Request ID: ${requestNumber}</span>
            <div class="info-row">
              <span class="info-label">Package:</span>
              <span class="info-val"> ${packageName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Location:</span>
              <span class="info-val"> ${upazila}, ${district}</span>
            </div>
            ${
              transactionId
                ? `<div class="info-row">
                    <span class="info-label">Stripe Transaction:</span>
                    <span class="info-val"> ${transactionId}</span>
                   </div>`
                : ''
            }
          </div>

          <div class="instruction-box">
            <div class="instruction-title">Next Steps for Soil Sample Collection</div>
            <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5;">
              1. Collect 500g of topsoil (0-15cm depth) from 5 zigzag spots in your plot.<br>
              2. Mix thoroughly, shade dry, and pack in a clean zip-lock bag.<br>
              3. Write <strong>${requestNumber}</strong> clearly on the bag and hand over to our pickup agent or send via courier.<br>
              4. You will receive your complete certified diagnostic report within <strong>48-72 hours</strong>.
            </p>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo AgriLab Diagnostics. All rights reserved.<br>
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
        subject: `[Krisikunjo] Soil Test Booked Successfully - #${requestNumber}`,
        text: `Hello ${farmerName},\n\nYour soil test request #${requestNumber} (${packageName}) has been booked and paid (${amount} BDT). Please prepare your soil sample labeled with #${requestNumber}.\n\nThank you,\nKrisikunjo AgriLab Diagnostic Team`,
        html,
      });

      this.logger.log(`Soil test booking email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send soil test booking email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Sends notification when expert publishes the laboratory soil test report
   */
  async sendSoilTestReportPublishedEmail(
    to: string,
    farmerName: string,
    requestNumber: string,
    overallHealthScore: number,
    soilTexture: string,
    crop: string,
  ): Promise<boolean> {
    const from =
      process.env.SMTP_FROM ||
      `"Krisikunjo AgriLab Diagnostic" <${process.env.SMTP_USER || 'imranmiatech@gmail.com'}>`;
    const clientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
    const requestsUrl = `${clientUrl}/soil-test/requests`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { font-size: 24px; font-weight: 700; color: #0E3128; margin: 0; }
          .logo p { font-size: 13px; color: #15803d; margin-top: 4px; font-weight: 600; }
          .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
          .badge { display: inline-block; font-size: 12px; font-weight: 700; color: #047857; background: #d1fae5; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
          .message-body { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
          .score-card { background: #f0fdf4; border: 2px dashed #0E3128; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
          .score-val { font-size: 36px; font-weight: 800; color: #0E3128; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Krisikunjo AgriLab Diagnostic</h1>
            <p>Official Soil Diagnostic Certificate</p>
          </div>
          <div class="divider"></div>
          <div style="text-align: center;">
            <span class="badge">&#10003; Diagnostic Report Published</span>
          </div>
          <div class="greeting">Dear ${farmerName || 'Farmer'},</div>
          <p class="message-body">
            Great news! Your laboratory soil analysis for request <strong>#${requestNumber}</strong> (${crop || 'Farmland'}) has been completed and verified by our soil scientist.
          </p>

          <div class="score-card">
            <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase;">Soil Health Score</div>
            <div class="score-val">${overallHealthScore}/100</div>
            <div style="font-size: 13px; color: #475569; margin-top: 6px;">Texture: <strong>${soilTexture}</strong></div>
          </div>

          <p class="message-body">
            You can now log into your Krisikunjo portal at <a href="${requestsUrl}" style="color: #0E3128; font-weight: 700;">${requestsUrl}</a> to view your full parameter breakdown, download your official PDF diagnostic certificate, and inspect your tailored fertilizer dosage plan.
          </p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Krisikunjo AgriLab Diagnostics. All rights reserved.<br>
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
        subject: `[Krisikunjo] Your Soil Diagnostic Report is Ready! - #${requestNumber}`,
        text: `Hello ${farmerName},\n\nYour soil diagnostic report for #${requestNumber} is ready with an overall score of ${overallHealthScore}/100. Visit ${requestsUrl} to view and download your full PDF certificate.\n\nWarm regards,\nKrisikunjo AgriLab Team`,
        html,
      });

      this.logger.log(`Soil test report published email sent to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send soil test report published email to ${to}:`, error);
      return false;
    }
  }
}


