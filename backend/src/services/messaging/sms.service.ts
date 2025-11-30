// SMS & Text Messaging Service with Twilio Integration
import twilio from 'twilio';
import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger';
import { Queue } from 'bull';
import Bull from 'bull';
import Redis from 'ioredis';

export interface SMSMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
  scheduledTime?: Date;
  metadata?: Record<string, any>;
}

export interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
  category: 'reservation' | 'marketing' | 'waitlist' | 'reminder' | 'alert';
}

export interface ConversationMessage {
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  status: string;
}

export class SMSService extends EventEmitter {
  private twilioClient: twilio.Twilio;
  private twilioPhoneNumbers: string[];
  private messageQueue: Queue;
  private conversationStore: Map<string, ConversationMessage[]>;
  private templates: Map<string, SMSTemplate>;
  private logger: any;
  private redis: Redis;
  private webhookUrl: string;

  constructor() {
    super();
    this.logger = createLogger('SMS-Service');
    
    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    this.twilioPhoneNumbers = (process.env.TWILIO_PHONE_NUMBERS || '').split(',');
    this.webhookUrl = process.env.TWILIO_WEBHOOK_URL || '';
    
    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    
    // Initialize message queue for reliable delivery
    this.messageQueue = new Bull('sms-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      }
    });
    
    this.conversationStore = new Map();
    this.templates = new Map();
    
    this.initializeTemplates();
    this.setupMessageProcessor();
    this.setupWebhooks();
  }

  private initializeTemplates(): void {
    // Reservation templates
    this.templates.set('reservation_confirmation', {
      id: 'reservation_confirmation',
      name: 'Reservation Confirmation',
      body: 'Hi {{guestName}}! Your reservation at {{restaurantName}} for {{partySize}} on {{date}} at {{time}} is confirmed. Reply CANCEL to cancel or MODIFY to change.',
      variables: ['guestName', 'restaurantName', 'partySize', 'date', 'time'],
      category: 'reservation'
    });

    this.templates.set('reservation_reminder', {
      id: 'reservation_reminder',
      name: 'Reservation Reminder',
      body: 'Reminder: You have a reservation at {{restaurantName}} today at {{time}}. Reply YES to confirm or CANCEL to cancel.',
      variables: ['restaurantName', 'time'],
      category: 'reminder'
    });

    this.templates.set('waitlist_ready', {
      id: 'waitlist_ready',
      name: 'Waitlist Ready',
      body: 'Hi {{guestName}}! Your table at {{restaurantName}} is ready! Please arrive within {{minutes}} minutes to keep your spot. Reply COMING or CANCEL.',
      variables: ['guestName', 'restaurantName', 'minutes'],
      category: 'waitlist'
    });

    this.templates.set('waitlist_update', {
      id: 'waitlist_update',
      name: 'Waitlist Update',
      body: 'Hi {{guestName}}! You are #{{position}} on the waitlist at {{restaurantName}}. Estimated wait: {{waitTime}} minutes. Reply CANCEL to leave the list.',
      variables: ['guestName', 'position', 'restaurantName', 'waitTime'],
      category: 'waitlist'
    });

    this.templates.set('marketing_offer', {
      id: 'marketing_offer',
      name: 'Marketing Offer',
      body: '{{restaurantName}} Special: {{offer}}! Book now and mention code {{code}} for {{discount}}% off. Valid until {{expiry}}. Reply STOP to unsubscribe.',
      variables: ['restaurantName', 'offer', 'code', 'discount', 'expiry'],
      category: 'marketing'
    });

    this.templates.set('review_request', {
      id: 'review_request',
      name: 'Review Request',
      body: 'Hi {{guestName}}! How was your experience at {{restaurantName}}? Rate us: {{reviewLink}} Your feedback helps us improve!',
      variables: ['guestName', 'restaurantName', 'reviewLink'],
      category: 'marketing'
    });
  }

  private setupMessageProcessor(): void {
    // Process queued messages
    this.messageQueue.process(async (job) => {
      const { message, retries = 0 } = job.data;
      
      try {
        await this.sendDirectMessage(message);
        this.logger.info(`SMS sent successfully to ${message.to}`);
        return { success: true, messageId: job.id };
      } catch (error: any) {
        this.logger.error(`Failed to send SMS: ${error.message}`);
        
        if (retries < 3) {
          // Retry with exponential backoff
          await this.messageQueue.add(
            { message, retries: retries + 1 },
            { delay: Math.pow(2, retries) * 1000 }
          );
        } else {
          // Max retries reached, mark as failed
          this.emit('messageFailed', { message, error: error.message });
        }
        
        throw error;
      }
    });
  }

  private async setupWebhooks(): Promise<void> {
    try {
      // Configure Twilio webhook for incoming messages
      if (this.webhookUrl) {
        for (const phoneNumber of this.twilioPhoneNumbers) {
          const phoneNumberSid = await this.getPhoneNumberSid(phoneNumber);
          if (phoneNumberSid) {
            await this.twilioClient.incomingPhoneNumbers(phoneNumberSid)
              .update({
                smsUrl: `${this.webhookUrl}/sms/webhook`,
                smsMethod: 'POST',
                statusCallback: `${this.webhookUrl}/sms/status`,
                statusCallbackMethod: 'POST'
              });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to setup Twilio webhooks:', error);
    }
  }

  private async getPhoneNumberSid(phoneNumber: string): Promise<string | null> {
    try {
      const numbers = await this.twilioClient.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      return numbers[0]?.sid || null;
    } catch (error) {
      return null;
    }
  }

  // Send SMS using template
  async sendTemplatedSMS(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    scheduledTime?: Date
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Replace variables in template
    let body = template.body;
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    const message: SMSMessage = {
      to,
      body,
      scheduledTime,
      metadata: { templateId, variables }
    };

    if (scheduledTime && scheduledTime > new Date()) {
      // Schedule for later
      const delay = scheduledTime.getTime() - Date.now();
      await this.messageQueue.add({ message }, { delay });
    } else {
      // Send immediately
      await this.messageQueue.add({ message });
    }
  }

  // Send direct SMS
  async sendSMS(to: string, body: string, mediaUrl?: string[]): Promise<void> {
    const message: SMSMessage = { to, body, mediaUrl };
    await this.messageQueue.add({ message });
  }

  private async sendDirectMessage(message: SMSMessage): Promise<any> {
    // Select a phone number from pool (round-robin or based on usage)
    const fromNumber = this.selectPhoneNumber();
    
    const twilioMessage: any = {
      body: message.body,
      from: fromNumber,
      to: message.to
    };

    if (message.mediaUrl && message.mediaUrl.length > 0) {
      twilioMessage.mediaUrl = message.mediaUrl;
    }

    const result = await this.twilioClient.messages.create(twilioMessage);
    
    // Store in conversation history
    await this.storeConversation({
      from: fromNumber,
      to: message.to,
      body: message.body,
      direction: 'outbound',
      timestamp: new Date(),
      status: result.status
    });

    return result;
  }

  private selectPhoneNumber(): string {
    // Simple round-robin selection
    // In production, could be more sophisticated based on load, geography, etc.
    const index = Math.floor(Math.random() * this.twilioPhoneNumbers.length);
    return this.twilioPhoneNumbers[index];
  }

  // Handle incoming SMS
  async handleIncomingSMS(from: string, to: string, body: string): Promise<void> {
    this.logger.info(`Incoming SMS from ${from}: ${body}`);
    
    // Store in conversation history
    await this.storeConversation({
      from,
      to,
      body,
      direction: 'inbound',
      timestamp: new Date(),
      status: 'received'
    });

    // Parse and handle commands
    const command = body.trim().toUpperCase();
    
    switch (command) {
      case 'YES':
      case 'CONFIRM':
        await this.handleConfirmation(from);
        break;
      
      case 'CANCEL':
        await this.handleCancellation(from);
        break;
      
      case 'MODIFY':
      case 'CHANGE':
        await this.handleModification(from);
        break;
      
      case 'COMING':
        await this.handleWaitlistConfirmation(from);
        break;
      
      case 'STOP':
      case 'UNSUBSCRIBE':
        await this.handleUnsubscribe(from);
        break;
      
      case 'HELP':
        await this.sendHelpMessage(from);
        break;
      
      default:
        // Forward to restaurant or handle with AI
        await this.handleGeneralMessage(from, body);
    }

    this.emit('incomingMessage', { from, to, body });
  }

  private async handleConfirmation(phoneNumber: string): Promise<void> {
    // Look up pending reservation
    const reservation = await this.findPendingReservation(phoneNumber);
    if (reservation) {
      // Update reservation status
      this.emit('reservationConfirmed', { phoneNumber, reservation });
      await this.sendSMS(
        phoneNumber,
        'Great! Your reservation is confirmed. See you soon!'
      );
    }
  }

  private async handleCancellation(phoneNumber: string): Promise<void> {
    const reservation = await this.findActiveReservation(phoneNumber);
    if (reservation) {
      this.emit('reservationCancelled', { phoneNumber, reservation });
      await this.sendSMS(
        phoneNumber,
        'Your reservation has been cancelled. We hope to see you another time!'
      );
    }
  }

  private async handleModification(phoneNumber: string): Promise<void> {
    await this.sendSMS(
      phoneNumber,
      'To modify your reservation, please visit our website or call the restaurant directly.'
    );
  }

  private async handleWaitlistConfirmation(phoneNumber: string): Promise<void> {
    this.emit('waitlistConfirmed', { phoneNumber });
    await this.sendSMS(
      phoneNumber,
      'Thank you! Your table will be held for the next 15 minutes. See you soon!'
    );
  }

  private async handleUnsubscribe(phoneNumber: string): Promise<void> {
    this.emit('unsubscribed', { phoneNumber });
    await this.sendSMS(
      phoneNumber,
      'You have been unsubscribed from marketing messages. You will still receive reservation confirmations.'
    );
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    await this.sendSMS(
      phoneNumber,
      'Commands: YES/CONFIRM to confirm, CANCEL to cancel, MODIFY to change reservation, STOP to unsubscribe from marketing'
    );
  }

  private async handleGeneralMessage(phoneNumber: string, message: string): Promise<void> {
    // Could integrate with AI for intelligent responses
    this.emit('generalMessage', { phoneNumber, message });
    await this.sendSMS(
      phoneNumber,
      'Thank you for your message. A team member will respond shortly.'
    );
  }

  // Store conversation for two-way messaging
  private async storeConversation(message: ConversationMessage): Promise<void> {
    const key = `${message.from}:${message.to}`;
    
    // Store in Redis for persistence
    await this.redis.rpush(
      `conversation:${key}`,
      JSON.stringify(message)
    );
    
    // Keep last 100 messages per conversation
    await this.redis.ltrim(`conversation:${key}`, -100, -1);
    
    // Also store in memory for quick access
    if (!this.conversationStore.has(key)) {
      this.conversationStore.set(key, []);
    }
    this.conversationStore.get(key)?.push(message);
  }

  // Get conversation history
  async getConversationHistory(
    phoneNumber1: string,
    phoneNumber2: string
  ): Promise<ConversationMessage[]> {
    const key = `${phoneNumber1}:${phoneNumber2}`;
    const reverseKey = `${phoneNumber2}:${phoneNumber1}`;
    
    const messages1 = await this.redis.lrange(`conversation:${key}`, 0, -1);
    const messages2 = await this.redis.lrange(`conversation:${reverseKey}`, 0, -1);
    
    const allMessages = [
      ...messages1.map(m => JSON.parse(m)),
      ...messages2.map(m => JSON.parse(m))
    ];
    
    // Sort by timestamp
    return allMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  // Bulk SMS for marketing campaigns
  async sendBulkSMS(
    recipients: string[],
    templateId: string,
    variables: Record<string, string>,
    options: {
      throttle?: number; // Messages per second
      scheduledTime?: Date;
      segmentSize?: number;
    } = {}
  ): Promise<void> {
    const { throttle = 10, scheduledTime, segmentSize = 100 } = options;
    
    // Split into segments for better handling
    const segments = [];
    for (let i = 0; i < recipients.length; i += segmentSize) {
      segments.push(recipients.slice(i, i + segmentSize));
    }
    
    // Process each segment with throttling
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDelay = scheduledTime 
        ? scheduledTime.getTime() - Date.now() + (i * segmentSize * 1000 / throttle)
        : i * segmentSize * 1000 / throttle;
      
      for (let j = 0; j < segment.length; j++) {
        const recipient = segment[j];
        const messageDelay = segmentDelay + (j * 1000 / throttle);
        
        await this.messageQueue.add(
          {
            message: {
              to: recipient,
              templateId,
              variables
            }
          },
          { delay: messageDelay }
        );
      }
    }
    
    this.logger.info(`Queued ${recipients.length} bulk messages`);
  }

  // Analytics
  async getMessagingAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const stats = await this.twilioClient.messages.list({
      dateSentAfter: startDate,
      dateSentBefore: endDate
    });

    const analytics = {
      totalSent: 0,
      totalReceived: 0,
      delivered: 0,
      failed: 0,
      byTemplate: {} as Record<string, number>,
      byHour: {} as Record<number, number>,
      costs: 0
    };

    for (const message of stats) {
      if (message.direction === 'outbound-api') {
        analytics.totalSent++;
        if (message.status === 'delivered') analytics.delivered++;
        if (message.status === 'failed') analytics.failed++;
        analytics.costs += parseFloat(message.price || '0');
        
        const hour = message.dateSent?.getHours();
        if (hour !== undefined) {
          analytics.byHour[hour] = (analytics.byHour[hour] || 0) + 1;
        }
      } else {
        analytics.totalReceived++;
      }
    }

    return analytics;
  }

  // Helper methods (would connect to database in production)
  private async findPendingReservation(phoneNumber: string): Promise<any> {
    // This would query the database
    return null;
  }

  private async findActiveReservation(phoneNumber: string): Promise<any> {
    // This would query the database
    return null;
  }
}

export const smsService = new SMSService();