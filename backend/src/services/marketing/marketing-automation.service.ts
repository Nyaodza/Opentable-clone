// Marketing Automation Service
import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger';
import { Queue } from 'bull';
import Bull from 'bull';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { smsService } from '../messaging/sms.service';

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  targetAudience: AudienceSegment;
  content: CampaignContent;
  schedule: CampaignSchedule;
  goals: CampaignGoals;
  performance: CampaignPerformance;
  automation: AutomationRules;
}

export interface AudienceSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria[];
  estimatedSize: number;
  tags: string[];
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  andOr: 'and' | 'or';
}

export interface CampaignContent {
  subject?: string;
  preheader?: string;
  body: string;
  templateId?: string;
  personalization: PersonalizationToken[];
  abTestVariants?: ABTestVariant[];
  callToAction: CallToAction;
}

export interface PersonalizationToken {
  token: string;
  field: string;
  defaultValue: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  percentage: number;
  content: Partial<CampaignContent>;
}

export interface CallToAction {
  text: string;
  url: string;
  trackingEnabled: boolean;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring' | 'triggered';
  sendTime?: Date;
  recurrence?: RecurrenceRule;
  triggers?: TriggerRule[];
  timezone: string;
  optimalSendTime: boolean;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
}

export interface TriggerRule {
  event: string;
  conditions: any;
  delay?: number;
  timeUnit?: 'minutes' | 'hours' | 'days';
}

export interface CampaignGoals {
  primaryGoal: 'engagement' | 'conversion' | 'retention' | 'revenue';
  targetMetrics: {
    openRate?: number;
    clickRate?: number;
    conversionRate?: number;
    revenue?: number;
  };
  trackingPixel: boolean;
  conversionTracking: boolean;
}

export interface CampaignPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  unsubscribed: number;
  bounced: number;
  revenue: number;
  roi: number;
}

export interface AutomationRules {
  welcomeSeries: boolean;
  abandonedCart: boolean;
  reEngagement: boolean;
  birthdayGreeting: boolean;
  loyaltyMilestone: boolean;
  reviewRequest: boolean;
  winBack: boolean;
  customWorkflows: Workflow[];
}

export interface Workflow {
  id: string;
  name: string;
  trigger: TriggerRule;
  steps: WorkflowStep[];
  isActive: boolean;
}

export interface WorkflowStep {
  id: string;
  type: 'email' | 'sms' | 'wait' | 'condition' | 'action';
  config: any;
  nextSteps: {
    default?: string;
    conditions?: Array<{
      criteria: any;
      nextStepId: string;
    }>;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  html: string;
  text: string;
  variables: string[];
  thumbnail?: string;
}

export class MarketingAutomationService extends EventEmitter {
  private logger: any;
  private redis: Redis;
  private emailQueue: Queue;
  private smsQueue: Queue;
  private campaigns: Map<string, Campaign>;
  private segments: Map<string, AudienceSegment>;
  private templates: Map<string, EmailTemplate>;
  private workflows: Map<string, Workflow>;
  private emailTransporter: any;

  constructor() {
    super();
    this.logger = createLogger('Marketing-Automation');
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    this.emailQueue = new Bull('email-campaigns', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      }
    });

    this.smsQueue = new Bull('sms-campaigns', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      }
    });

    this.campaigns = new Map();
    this.segments = new Map();
    this.templates = new Map();
    this.workflows = new Map();

    this.initializeEmailTransporter();
    this.initializeTemplates();
    this.initializeWorkflows();
    this.setupQueueProcessors();
  }

  private initializeEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  private initializeTemplates(): void {
    // Welcome email template
    this.templates.set('welcome', {
      id: 'welcome',
      name: 'Welcome Email',
      category: 'onboarding',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to {{restaurantName}}!</h1>
            </div>
            <div class="content">
              <p>Hi {{firstName}},</p>
              <p>Thank you for joining our community! We're excited to have you.</p>
              <p>As a welcome gift, enjoy {{discount}}% off your first reservation.</p>
              <a href="{{ctaUrl}}" class="button">Make Your First Reservation</a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: 'Welcome to {{restaurantName}}! Enjoy {{discount}}% off your first reservation.',
      variables: ['restaurantName', 'firstName', 'discount', 'ctaUrl']
    });

    // Abandoned reservation template
    this.templates.set('abandoned-reservation', {
      id: 'abandoned-reservation',
      name: 'Abandoned Reservation',
      category: 'recovery',
      html: `
        <div class="container">
          <h2>Complete Your Reservation</h2>
          <p>Hi {{firstName}},</p>
          <p>We noticed you were looking at {{restaurantName}} for {{date}} at {{time}}.</p>
          <p>This slot is still available! Complete your reservation now.</p>
          <a href="{{resumeUrl}}" class="button">Complete Reservation</a>
        </div>
      `,
      text: 'Complete your reservation at {{restaurantName}}',
      variables: ['firstName', 'restaurantName', 'date', 'time', 'resumeUrl']
    });

    // Review request template
    this.templates.set('review-request', {
      id: 'review-request',
      name: 'Review Request',
      category: 'feedback',
      html: `
        <div class="container">
          <h2>How was your experience?</h2>
          <p>Hi {{firstName}},</p>
          <p>Thank you for dining at {{restaurantName}} on {{date}}.</p>
          <p>We'd love to hear about your experience!</p>
          <a href="{{reviewUrl}}" class="button">Leave a Review</a>
        </div>
      `,
      text: 'Please review your recent visit to {{restaurantName}}',
      variables: ['firstName', 'restaurantName', 'date', 'reviewUrl']
    });

    // Special offer template
    this.templates.set('special-offer', {
      id: 'special-offer',
      name: 'Special Offer',
      category: 'promotion',
      html: `
        <div class="container">
          <h2>{{offerTitle}}</h2>
          <p>Hi {{firstName}},</p>
          <p>{{offerDescription}}</p>
          <p>Use code: <strong>{{promoCode}}</strong></p>
          <p>Valid until: {{expiryDate}}</p>
          <a href="{{bookingUrl}}" class="button">Book Now</a>
        </div>
      `,
      text: '{{offerTitle}} - Use code {{promoCode}}',
      variables: ['firstName', 'offerTitle', 'offerDescription', 'promoCode', 'expiryDate', 'bookingUrl']
    });
  }

  private initializeWorkflows(): void {
    // Welcome series workflow
    const welcomeWorkflow: Workflow = {
      id: 'welcome-series',
      name: 'Welcome Series',
      trigger: {
        event: 'user_registered',
        conditions: {},
        delay: 0
      },
      steps: [
        {
          id: 'welcome-email',
          type: 'email',
          config: {
            templateId: 'welcome',
            subject: 'Welcome to OpenTable!'
          },
          nextSteps: { default: 'wait-3-days' }
        },
        {
          id: 'wait-3-days',
          type: 'wait',
          config: { duration: 3, unit: 'days' },
          nextSteps: { default: 'tips-email' }
        },
        {
          id: 'tips-email',
          type: 'email',
          config: {
            templateId: 'tips',
            subject: '5 Tips for Finding Great Restaurants'
          },
          nextSteps: { default: 'wait-7-days' }
        },
        {
          id: 'wait-7-days',
          type: 'wait',
          config: { duration: 7, unit: 'days' },
          nextSteps: { default: 'check-booking' }
        },
        {
          id: 'check-booking',
          type: 'condition',
          config: {
            condition: 'has_made_booking'
          },
          nextSteps: {
            conditions: [
              {
                criteria: { hasBooking: true },
                nextStepId: 'thank-you-email'
              },
              {
                criteria: { hasBooking: false },
                nextStepId: 'incentive-email'
              }
            ]
          }
        },
        {
          id: 'thank-you-email',
          type: 'email',
          config: {
            templateId: 'thank-you',
            subject: 'Thank you for your first booking!'
          },
          nextSteps: {}
        },
        {
          id: 'incentive-email',
          type: 'email',
          config: {
            templateId: 'special-offer',
            subject: '20% off your first reservation!'
          },
          nextSteps: {}
        }
      ],
      isActive: true
    };

    this.workflows.set('welcome-series', welcomeWorkflow);

    // Abandoned cart workflow
    const abandonedCartWorkflow: Workflow = {
      id: 'abandoned-cart',
      name: 'Abandoned Cart Recovery',
      trigger: {
        event: 'reservation_abandoned',
        conditions: {},
        delay: 60,
        timeUnit: 'minutes'
      },
      steps: [
        {
          id: 'reminder-email',
          type: 'email',
          config: {
            templateId: 'abandoned-reservation',
            subject: 'Complete your reservation at {{restaurantName}}'
          },
          nextSteps: { default: 'wait-24-hours' }
        },
        {
          id: 'wait-24-hours',
          type: 'wait',
          config: { duration: 24, unit: 'hours' },
          nextSteps: { default: 'check-completed' }
        },
        {
          id: 'check-completed',
          type: 'condition',
          config: {
            condition: 'reservation_completed'
          },
          nextSteps: {
            conditions: [
              {
                criteria: { completed: true },
                nextStepId: null
              },
              {
                criteria: { completed: false },
                nextStepId: 'final-reminder'
              }
            ]
          }
        },
        {
          id: 'final-reminder',
          type: 'sms',
          config: {
            message: 'Last chance! Your table at {{restaurantName}} is waiting. Complete booking: {{link}}'
          },
          nextSteps: {}
        }
      ],
      isActive: true
    };

    this.workflows.set('abandoned-cart', abandonedCartWorkflow);

    // Post-dining review request
    const reviewRequestWorkflow: Workflow = {
      id: 'review-request',
      name: 'Review Request',
      trigger: {
        event: 'dining_completed',
        conditions: {},
        delay: 24,
        timeUnit: 'hours'
      },
      steps: [
        {
          id: 'review-email',
          type: 'email',
          config: {
            templateId: 'review-request',
            subject: 'How was your experience at {{restaurantName}}?'
          },
          nextSteps: { default: 'wait-3-days' }
        },
        {
          id: 'wait-3-days',
          type: 'wait',
          config: { duration: 3, unit: 'days' },
          nextSteps: { default: 'check-review' }
        },
        {
          id: 'check-review',
          type: 'condition',
          config: {
            condition: 'has_left_review'
          },
          nextSteps: {
            conditions: [
              {
                criteria: { hasReview: true },
                nextStepId: 'thank-you-reward'
              },
              {
                criteria: { hasReview: false },
                nextStepId: 'review-reminder-sms'
              }
            ]
          }
        },
        {
          id: 'thank-you-reward',
          type: 'email',
          config: {
            templateId: 'reward',
            subject: 'Thank you! Here\'s your reward'
          },
          nextSteps: {}
        },
        {
          id: 'review-reminder-sms',
          type: 'sms',
          config: {
            message: 'We\'d love your feedback on {{restaurantName}}! Leave a review: {{reviewLink}}'
          },
          nextSteps: {}
        }
      ],
      isActive: true
    };

    this.workflows.set('review-request', reviewRequestWorkflow);
  }

  private setupQueueProcessors(): void {
    // Email queue processor
    this.emailQueue.process(async (job) => {
      const { campaign, recipient } = job.data;
      
      try {
        await this.sendEmail(campaign, recipient);
        await this.updateCampaignMetrics(campaign.id, 'sent');
        return { success: true };
      } catch (error) {
        this.logger.error('Failed to send email:', error);
        await this.updateCampaignMetrics(campaign.id, 'failed');
        throw error;
      }
    });

    // SMS queue processor
    this.smsQueue.process(async (job) => {
      const { campaign, recipient } = job.data;
      
      try {
        await smsService.sendTemplatedSMS(
          recipient.phone,
          campaign.content.templateId,
          recipient.variables
        );
        await this.updateCampaignMetrics(campaign.id, 'sent');
        return { success: true };
      } catch (error) {
        this.logger.error('Failed to send SMS:', error);
        await this.updateCampaignMetrics(campaign.id, 'failed');
        throw error;
      }
    });
  }

  // Create and manage campaigns
  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    const campaign: Campaign = {
      id: this.generateId(),
      name: campaignData.name || 'Untitled Campaign',
      type: campaignData.type || 'email',
      status: 'draft',
      targetAudience: campaignData.targetAudience || this.getDefaultAudience(),
      content: campaignData.content || this.getDefaultContent(),
      schedule: campaignData.schedule || this.getDefaultSchedule(),
      goals: campaignData.goals || this.getDefaultGoals(),
      performance: this.getDefaultPerformance(),
      automation: campaignData.automation || this.getDefaultAutomation()
    };

    this.campaigns.set(campaign.id, campaign);
    await this.saveCampaign(campaign);

    this.emit('campaignCreated', campaign);
    return campaign;
  }

  private generateId(): string {
    return `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultAudience(): AudienceSegment {
    return {
      id: 'all-users',
      name: 'All Users',
      criteria: [],
      estimatedSize: 0,
      tags: []
    };
  }

  private getDefaultContent(): CampaignContent {
    return {
      body: '',
      personalization: [],
      callToAction: {
        text: 'Book Now',
        url: '',
        trackingEnabled: true
      }
    };
  }

  private getDefaultSchedule(): CampaignSchedule {
    return {
      type: 'immediate',
      timezone: 'UTC',
      optimalSendTime: false
    };
  }

  private getDefaultGoals(): CampaignGoals {
    return {
      primaryGoal: 'engagement',
      targetMetrics: {
        openRate: 25,
        clickRate: 3
      },
      trackingPixel: true,
      conversionTracking: true
    };
  }

  private getDefaultPerformance(): CampaignPerformance {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      unsubscribed: 0,
      bounced: 0,
      revenue: 0,
      roi: 0
    };
  }

  private getDefaultAutomation(): AutomationRules {
    return {
      welcomeSeries: false,
      abandonedCart: false,
      reEngagement: false,
      birthdayGreeting: false,
      loyaltyMilestone: false,
      reviewRequest: false,
      winBack: false,
      customWorkflows: []
    };
  }

  private async saveCampaign(campaign: Campaign): Promise<void> {
    await this.redis.set(
      `campaign:${campaign.id}`,
      JSON.stringify(campaign),
      'EX',
      86400 * 30 // 30 days
    );
  }

  // Launch campaign
  async launchCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new Error('Campaign must be in draft or paused status to launch');
    }

    campaign.status = 'active';
    
    // Get target audience
    const recipients = await this.getAudienceRecipients(campaign.targetAudience);
    
    // Schedule campaign based on type
    if (campaign.schedule.type === 'immediate') {
      await this.sendCampaignNow(campaign, recipients);
    } else if (campaign.schedule.type === 'scheduled') {
      await this.scheduleCampaign(campaign, recipients);
    } else if (campaign.schedule.type === 'recurring') {
      await this.setupRecurringCampaign(campaign, recipients);
    } else if (campaign.schedule.type === 'triggered') {
      await this.setupTriggeredCampaign(campaign);
    }

    await this.saveCampaign(campaign);
    this.emit('campaignLaunched', campaign);
  }

  private async getAudienceRecipients(audience: AudienceSegment): Promise<any[]> {
    // Query database based on segment criteria
    // This is a simplified version - real implementation would build SQL query from criteria
    const query = this.buildSegmentQuery(audience.criteria);
    
    // Mock recipients for demonstration
    return [
      {
        id: 'user1',
        email: 'user1@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        variables: {
          firstName: 'John',
          restaurantName: 'Test Restaurant',
          discount: '20'
        }
      }
    ];
  }

  private buildSegmentQuery(criteria: SegmentCriteria[]): string {
    // Build SQL query from criteria
    let query = 'SELECT * FROM users WHERE 1=1';
    
    for (const criterion of criteria) {
      const condition = this.buildCondition(criterion);
      query += ` ${criterion.andOr || 'AND'} ${condition}`;
    }
    
    return query;
  }

  private buildCondition(criterion: SegmentCriteria): string {
    switch (criterion.operator) {
      case 'equals':
        return `${criterion.field} = '${criterion.value}'`;
      case 'contains':
        return `${criterion.field} LIKE '%${criterion.value}%'`;
      case 'greater_than':
        return `${criterion.field} > ${criterion.value}`;
      case 'less_than':
        return `${criterion.field} < ${criterion.value}`;
      case 'between':
        return `${criterion.field} BETWEEN ${criterion.value[0]} AND ${criterion.value[1]}`;
      case 'in':
        return `${criterion.field} IN (${criterion.value.join(',')})`;
      case 'not_in':
        return `${criterion.field} NOT IN (${criterion.value.join(',')})`;
      default:
        return '1=1';
    }
  }

  private async sendCampaignNow(campaign: Campaign, recipients: any[]): Promise<void> {
    for (const recipient of recipients) {
      if (campaign.type === 'email') {
        await this.emailQueue.add({ campaign, recipient });
      } else if (campaign.type === 'sms') {
        await this.smsQueue.add({ campaign, recipient });
      } else if (campaign.type === 'multi-channel') {
        await this.emailQueue.add({ campaign, recipient });
        await this.smsQueue.add({ campaign, recipient });
      }
    }
  }

  private async scheduleCampaign(campaign: Campaign, recipients: any[]): Promise<void> {
    const delay = campaign.schedule.sendTime!.getTime() - Date.now();
    
    for (const recipient of recipients) {
      if (campaign.type === 'email') {
        await this.emailQueue.add({ campaign, recipient }, { delay });
      } else if (campaign.type === 'sms') {
        await this.smsQueue.add({ campaign, recipient }, { delay });
      }
    }
  }

  private async setupRecurringCampaign(campaign: Campaign, recipients: any[]): Promise<void> {
    // Set up cron job for recurring campaigns
    const cronPattern = this.buildCronPattern(campaign.schedule.recurrence!);
    
    // Store recurring campaign configuration
    await this.redis.set(
      `recurring:${campaign.id}`,
      JSON.stringify({
        campaign,
        recipients,
        cronPattern
      })
    );
  }

  private buildCronPattern(recurrence: RecurrenceRule): string {
    // Build cron pattern from recurrence rule
    if (recurrence.frequency === 'daily') {
      return `0 9 */${recurrence.interval} * *`;
    } else if (recurrence.frequency === 'weekly') {
      return `0 9 * * ${recurrence.daysOfWeek?.join(',')}`;
    } else if (recurrence.frequency === 'monthly') {
      return `0 9 ${recurrence.dayOfMonth} * *`;
    }
    return '0 9 * * *';
  }

  private async setupTriggeredCampaign(campaign: Campaign): Promise<void> {
    // Register event listeners for triggers
    for (const trigger of campaign.schedule.triggers || []) {
      this.on(trigger.event, async (data) => {
        if (this.evaluateTriggerConditions(trigger.conditions, data)) {
          const delay = (trigger.delay || 0) * this.getTimeUnitMultiplier(trigger.timeUnit);
          
          if (campaign.type === 'email') {
            await this.emailQueue.add(
              { campaign, recipient: data.user },
              { delay }
            );
          } else if (campaign.type === 'sms') {
            await this.smsQueue.add(
              { campaign, recipient: data.user },
              { delay }
            );
          }
        }
      });
    }
  }

  private evaluateTriggerConditions(conditions: any, data: any): boolean {
    // Evaluate trigger conditions
    // Simplified for demonstration
    return true;
  }

  private getTimeUnitMultiplier(unit?: string): number {
    switch (unit) {
      case 'minutes': return 60 * 1000;
      case 'hours': return 60 * 60 * 1000;
      case 'days': return 24 * 60 * 60 * 1000;
      default: return 1;
    }
  }

  // Send individual email
  private async sendEmail(campaign: Campaign, recipient: any): Promise<void> {
    const template = this.templates.get(campaign.content.templateId || '');
    if (!template) {
      throw new Error('Template not found');
    }

    // Compile template with Handlebars
    const htmlTemplate = handlebars.compile(template.html);
    const textTemplate = handlebars.compile(template.text);

    const html = htmlTemplate(recipient.variables);
    const text = textTemplate(recipient.variables);

    // Add tracking pixel
    const trackingPixel = campaign.goals.trackingPixel ?
      `<img src="${process.env.API_URL}/track/open/${campaign.id}/${recipient.id}" width="1" height="1" />` : '';

    // Send email
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient.email,
      subject: campaign.content.subject,
      html: html + trackingPixel,
      text: text
    });

    // Track email sent
    await this.trackEmailEvent(campaign.id, recipient.id, 'sent');
  }

  // Track email events
  async trackEmailEvent(
    campaignId: string,
    recipientId: string,
    event: 'sent' | 'opened' | 'clicked' | 'unsubscribed'
  ): Promise<void> {
    const key = `campaign:${campaignId}:${event}`;
    await this.redis.sadd(key, recipientId);
    
    // Update campaign metrics
    await this.updateCampaignMetrics(campaignId, event);
  }

  private async updateCampaignMetrics(campaignId: string, event: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    switch (event) {
      case 'sent':
        campaign.performance.sent++;
        break;
      case 'opened':
        campaign.performance.opened++;
        break;
      case 'clicked':
        campaign.performance.clicked++;
        break;
      case 'unsubscribed':
        campaign.performance.unsubscribed++;
        break;
    }

    await this.saveCampaign(campaign);
  }

  // A/B testing
  async createABTest(
    campaignId: string,
    variants: ABTestVariant[]
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.content.abTestVariants = variants;
    await this.saveCampaign(campaign);
  }

  // Automation workflows
  async executeWorkflow(workflowId: string, data: any): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.isActive) return;

    // Start workflow execution
    const executionId = `exec_${Date.now()}`;
    await this.executeWorkflowStep(workflow, workflow.steps[0], data, executionId);
  }

  private async executeWorkflowStep(
    workflow: Workflow,
    step: WorkflowStep,
    data: any,
    executionId: string
  ): Promise<void> {
    this.logger.info(`Executing workflow step: ${step.id}`);

    switch (step.type) {
      case 'email':
        await this.executeEmailStep(step, data);
        break;
      case 'sms':
        await this.executeSmsStep(step, data);
        break;
      case 'wait':
        await this.executeWaitStep(step, workflow, data, executionId);
        return; // Don't continue to next step immediately
      case 'condition':
        await this.executeConditionStep(step, workflow, data, executionId);
        return; // Condition will determine next step
      case 'action':
        await this.executeActionStep(step, data);
        break;
    }

    // Continue to next step
    if (step.nextSteps.default) {
      const nextStep = workflow.steps.find(s => s.id === step.nextSteps.default);
      if (nextStep) {
        await this.executeWorkflowStep(workflow, nextStep, data, executionId);
      }
    }
  }

  private async executeEmailStep(step: WorkflowStep, data: any): Promise<void> {
    const template = this.templates.get(step.config.templateId);
    if (!template) return;

    await this.emailQueue.add({
      campaign: {
        content: {
          templateId: step.config.templateId,
          subject: step.config.subject
        }
      },
      recipient: data.user
    });
  }

  private async executeSmsStep(step: WorkflowStep, data: any): Promise<void> {
    await smsService.sendSMS(
      data.user.phone,
      step.config.message
    );
  }

  private async executeWaitStep(
    step: WorkflowStep,
    workflow: Workflow,
    data: any,
    executionId: string
  ): Promise<void> {
    const delay = step.config.duration * this.getTimeUnitMultiplier(step.config.unit);
    
    setTimeout(async () => {
      if (step.nextSteps.default) {
        const nextStep = workflow.steps.find(s => s.id === step.nextSteps.default);
        if (nextStep) {
          await this.executeWorkflowStep(workflow, nextStep, data, executionId);
        }
      }
    }, delay);
  }

  private async executeConditionStep(
    step: WorkflowStep,
    workflow: Workflow,
    data: any,
    executionId: string
  ): Promise<void> {
    const conditionResult = await this.evaluateCondition(step.config.condition, data);
    
    if (step.nextSteps.conditions) {
      for (const condition of step.nextSteps.conditions) {
        if (this.matchesCriteria(conditionResult, condition.criteria)) {
          const nextStep = workflow.steps.find(s => s.id === condition.nextStepId);
          if (nextStep) {
            await this.executeWorkflowStep(workflow, nextStep, data, executionId);
          }
          break;
        }
      }
    }
  }

  private async evaluateCondition(condition: string, data: any): Promise<any> {
    // Evaluate condition based on data
    // This would connect to database to check conditions
    switch (condition) {
      case 'has_made_booking':
        return { hasBooking: data.user.bookingCount > 0 };
      case 'reservation_completed':
        return { completed: data.reservationCompleted };
      case 'has_left_review':
        return { hasReview: data.user.hasReview };
      default:
        return {};
    }
  }

  private matchesCriteria(result: any, criteria: any): boolean {
    for (const key in criteria) {
      if (result[key] !== criteria[key]) {
        return false;
      }
    }
    return true;
  }

  private async executeActionStep(step: WorkflowStep, data: any): Promise<void> {
    // Execute custom action
    switch (step.config.action) {
      case 'add_tag':
        await this.addUserTag(data.user.id, step.config.tag);
        break;
      case 'update_score':
        await this.updateUserScore(data.user.id, step.config.score);
        break;
      case 'create_task':
        await this.createTask(step.config.task);
        break;
    }
  }

  private async addUserTag(userId: string, tag: string): Promise<void> {
    await this.redis.sadd(`user:${userId}:tags`, tag);
  }

  private async updateUserScore(userId: string, score: number): Promise<void> {
    await this.redis.hincrby(`user:${userId}`, 'score', score);
  }

  private async createTask(task: any): Promise<void> {
    // Create task in task management system
    this.emit('taskCreated', task);
  }

  // Analytics
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const performance = campaign.performance;
    
    return {
      ...performance,
      openRate: performance.sent > 0 ? (performance.opened / performance.sent) * 100 : 0,
      clickRate: performance.opened > 0 ? (performance.clicked / performance.opened) * 100 : 0,
      conversionRate: performance.clicked > 0 ? (performance.converted / performance.clicked) * 100 : 0,
      bounceRate: performance.sent > 0 ? (performance.bounced / performance.sent) * 100 : 0,
      unsubscribeRate: performance.sent > 0 ? (performance.unsubscribed / performance.sent) * 100 : 0,
      roi: performance.revenue > 0 ? ((performance.revenue - this.calculateCampaignCost(campaign)) / this.calculateCampaignCost(campaign)) * 100 : 0
    };
  }

  private calculateCampaignCost(campaign: Campaign): number {
    // Calculate campaign cost based on sends and channel
    const emailCost = 0.001; // $0.001 per email
    const smsCost = 0.01; // $0.01 per SMS
    
    if (campaign.type === 'email') {
      return campaign.performance.sent * emailCost;
    } else if (campaign.type === 'sms') {
      return campaign.performance.sent * smsCost;
    } else {
      return campaign.performance.sent * (emailCost + smsCost);
    }
  }
}

export const marketingAutomation = new MarketingAutomationService();