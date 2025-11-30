import nodemailer, { Transporter } from 'nodemailer';
import { User } from '../models/User';
import path from 'path';
import fs from 'fs/promises';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}

export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;

  constructor() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // Development - use MailDev
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'localhost',
        port: parseInt(process.env.EMAIL_PORT || '1025'),
        secure: false,
        ignoreTLS: true
      });
    }

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@opentable-clone.com';
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `OpenTable Clone <${this.fromEmail}>`,
        ...options
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      // In production, you might want to queue failed emails for retry
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user: User): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${user.emailVerificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OpenTable Clone!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
              <center>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      html,
      text: `Hi ${user.firstName}, Please verify your email by visiting: ${verificationUrl}`
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user: User): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 10px 0; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OpenTable Clone!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Your email has been verified successfully! You're all set to start discovering and booking amazing dining experiences.</p>
              
              <h3>What you can do now:</h3>
              <ul class="features">
                <li>🍽️ Browse thousands of restaurants</li>
                <li>📅 Make instant reservations</li>
                <li>⭐ Read and write reviews</li>
                <li>🎁 Earn loyalty points with every booking</li>
                <li>💰 Access exclusive deals and offers</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/restaurants" class="button">Explore Restaurants</a>
              </center>
              
              <p>Need help? Visit our <a href="${process.env.FRONTEND_URL}/help">Help Center</a> or reply to this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to OpenTable Clone!',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
              </div>
              
              <p>If you didn't request a password reset, please ignore this email. Your password won't be changed.</p>
              
              <p>For security reasons, we recommend:</p>
              <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication</li>
                <li>Not sharing your password with anyone</li>
              </ul>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html
    });
  }

  /**
   * Send password changed confirmation
   */
  async sendPasswordChangedEmail(user: User): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .alert { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Your password has been successfully changed.</p>
              
              <div class="alert">
                <strong>🔒 Security Alert:</strong> If you didn't make this change, please contact our support team immediately.
              </div>
              
              <p>Changed on: ${new Date().toLocaleString()}</p>
              
              <p>For your security:</p>
              <ul>
                <li>Sign out of all devices</li>
                <li>Review your recent account activity</li>
                <li>Enable two-factor authentication if you haven't already</li>
              </ul>
              
              <p>If you have any concerns, please <a href="${process.env.FRONTEND_URL}/contact">contact support</a>.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Your password has been changed',
      html
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmationEmail(user: User, booking: any): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .booking-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Your reservation has been confirmed. We look forward to seeing you!</p>
              
              <div class="booking-details">
                <h3>Reservation Details</h3>
                <div class="detail-row">
                  <strong>Restaurant:</strong>
                  <span>${booking.restaurant.name}</span>
                </div>
                <div class="detail-row">
                  <strong>Date:</strong>
                  <span>${new Date(booking.date).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <strong>Time:</strong>
                  <span>${booking.time}</span>
                </div>
                <div class="detail-row">
                  <strong>Party Size:</strong>
                  <span>${booking.partySize} ${booking.partySize === 1 ? 'person' : 'people'}</span>
                </div>
                <div class="detail-row">
                  <strong>Confirmation Code:</strong>
                  <span style="font-size: 18px; color: #dc2626;">${booking.confirmationCode}</span>
                </div>
              </div>
              
              <h3>Restaurant Location</h3>
              <p>${booking.restaurant.address}</p>
              <p>📞 ${booking.restaurant.phone}</p>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/reservations/${booking.id}" class="button">View Reservation</a>
              </center>
              
              <p><strong>Need to make changes?</strong> You can modify or cancel your reservation up to 2 hours before your dining time.</p>
              
              <p>You'll earn <strong>${booking.loyaltyPoints} loyalty points</strong> after dining!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `Reservation Confirmed - ${booking.restaurant.name}`,
      html
    });
  }
}