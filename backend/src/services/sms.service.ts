import twilio from 'twilio';

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSMSDto {
  to: string;
  message: string;
  scheduledTime?: Date;
}

export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string = '';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Twilio client
   */
  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      console.log('✅ SMS Service initialized with Twilio');
    } else {
      console.warn('⚠️  SMS Service not configured. Set TWILIO_* environment variables');
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(data: SendSMSDto): Promise<any> {
    if (!this.client) {
      console.log(`📱 SMS would be sent to ${data.to}: ${data.message}`);
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const message = await this.client.messages.create({
        body: data.message,
        from: this.fromNumber,
        to: data.to,
        ...(data.scheduledTime && {
          sendAt: data.scheduledTime,
          scheduleType: 'fixed',
        }),
      });

      console.log(`✅ SMS sent successfully: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error.message);
      throw new Error(`SMS send failed: ${error.message}`);
    }
  }

  /**
   * Send reservation confirmation SMS
   */
  async sendReservationConfirmation(
    phone: string,
    guestName: string,
    restaurantName: string,
    date: string,
    time: string,
    partySize: number,
    confirmationCode: string,
    managementUrl: string
  ): Promise<any> {
    const message = `Hi ${guestName}! Your reservation at ${restaurantName} is confirmed for ${partySize} on ${date} at ${time}. Confirmation: ${confirmationCode}. Manage: ${managementUrl}`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send reservation reminder SMS
   */
  async sendReservationReminder(
    phone: string,
    guestName: string,
    restaurantName: string,
    date: string,
    time: string,
    restaurantAddress: string
  ): Promise<any> {
    const message = `Hi ${guestName}! Reminder: Your reservation at ${restaurantName} is today at ${time}. Address: ${restaurantAddress}. See you soon!`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send reservation cancellation SMS
   */
  async sendReservationCancellation(
    phone: string,
    guestName: string,
    restaurantName: string,
    date: string,
    time: string
  ): Promise<any> {
    const message = `Hi ${guestName}, your reservation at ${restaurantName} on ${date} at ${time} has been cancelled. We hope to see you again soon!`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send waitlist notification SMS
   */
  async sendWaitlistReady(
    phone: string,
    guestName: string,
    restaurantName: string,
    estimatedWaitMinutes: number
  ): Promise<any> {
    const message = `${guestName}, your table at ${restaurantName} will be ready in approximately ${estimatedWaitMinutes} minutes. Please head over now!`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(phone: string, code: string): Promise<any> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send reservation modification SMS
   */
  async sendReservationModification(
    phone: string,
    guestName: string,
    restaurantName: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string
  ): Promise<any> {
    const message = `Hi ${guestName}, your reservation at ${restaurantName} has been changed from ${oldDate} ${oldTime} to ${newDate} ${newTime}.`;

    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(recipients: Array<{ phone: string; message: string }>): Promise<any[]> {
    const results = await Promise.allSettled(
      recipients.map(recipient => this.sendSMS({ to: recipient.phone, message: recipient.message }))
    );

    return results.map((result, index) => ({
      phone: recipients[index].phone,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic validation for E.164 format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // If it doesn't start with country code, add it
    if (!cleaned.startsWith(countryCode.replace('+', ''))) {
      return `${countryCode}${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Get SMS delivery status
   */
  async getSMSStatus(messageId: string): Promise<any> {
    if (!this.client) {
      throw new Error('SMS service not configured');
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
      };
    } catch (error: any) {
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  /**
   * Check if SMS service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

export default new SMSService();
