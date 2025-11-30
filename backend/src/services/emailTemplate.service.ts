import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { AppError } from '../utils/AppError';

interface EmailTemplateData {
  [key: string]: any;
}

export class EmailTemplateService {
  private static instance: EmailTemplateService;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private templatesPath: string;

  private constructor() {
    this.templatesPath = path.join(__dirname, '../templates/emails');
    this.registerHelpers();
    this.loadTemplates();
  }

  static getInstance(): EmailTemplateService {
    if (!EmailTemplateService.instance) {
      EmailTemplateService.instance = new EmailTemplateService();
    }
    return EmailTemplateService.instance;
  }

  private registerHelpers(): void {
    // Equality helper
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Not equal helper
    handlebars.registerHelper('neq', (a: any, b: any) => a !== b);

    // Greater than helper
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);

    // Less than helper
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    // Format date helper
    handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Format time helper
    handlebars.registerHelper('formatTime', (time: string) => {
      // Convert 24-hour time to 12-hour with AM/PM
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    });

    // Format currency helper
    handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    });

    // Pluralize helper
    handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });
  }

  private loadTemplates(): void {
    try {
      const templateFiles = fs.readdirSync(this.templatesPath);

      templateFiles.forEach(file => {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const templatePath = path.join(this.templatesPath, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          const compiledTemplate = handlebars.compile(templateContent);
          this.templates.set(templateName, compiledTemplate);
        }
      });
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  }

  renderTemplate(templateName: string, data: EmailTemplateData): string {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new AppError(`Email template '${templateName}' not found`, 404);
    }

    // Add default data
    const defaultData = {
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      currentYear: new Date().getFullYear(),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@opentable-clone.com',
      companyName: 'OpenTable Clone'
    };

    const mergedData = { ...defaultData, ...data };
    return template(mergedData);
  }

  // Specific template rendering methods
  renderWelcomeEmail(data: {
    userName: string;
    userEmail: string;
  }): string {
    return this.renderTemplate('welcome', {
      ...data,
      searchUrl: `${process.env.FRONTEND_URL}/search`,
      profileUrl: `${process.env.FRONTEND_URL}/profile`,
      favoritesUrl: `${process.env.FRONTEND_URL}/favorites`,
      dealsUrl: `${process.env.FRONTEND_URL}/deals`,
      helpUrl: `${process.env.FRONTEND_URL}/help`,
      facebookUrl: 'https://facebook.com/opentableclone',
      twitterUrl: 'https://twitter.com/opentableclone',
      instagramUrl: 'https://instagram.com/opentableclone',
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`
    });
  }

  renderBookingConfirmation(data: {
    confirmationNumber: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    bookingDate: string;
    bookingTime: string;
    partySize: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    specialRequests?: string;
    depositAmount?: number;
  }): string {
    return this.renderTemplate('booking-confirmation', {
      ...data,
      viewBookingUrl: `${process.env.FRONTEND_URL}/bookings/${data.confirmationNumber}`,
      modifyBookingUrl: `${process.env.FRONTEND_URL}/bookings/${data.confirmationNumber}/modify`,
      cancelBookingUrl: `${process.env.FRONTEND_URL}/bookings/${data.confirmationNumber}/cancel`
    });
  }

  renderBookingReminder(data: {
    confirmationNumber: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    bookingDate: string;
    bookingTime: string;
    partySize: number;
    timeUntilReservation: string;
    mapImageUrl?: string;
  }): string {
    const encodedAddress = encodeURIComponent(data.restaurantAddress);

    return this.renderTemplate('booking-reminder', {
      ...data,
      directionsUrl: `https://maps.google.com/?q=${encodedAddress}`,
      modifyBookingUrl: `${process.env.FRONTEND_URL}/bookings/${data.confirmationNumber}/modify`,
      cancelBookingUrl: `${process.env.FRONTEND_URL}/bookings/${data.confirmationNumber}/cancel`,
      menuUrl: `${process.env.FRONTEND_URL}/restaurant/menu`
    });
  }

  renderPasswordReset(data: {
    userName: string;
    resetLink: string;
    expiryHours: number;
  }): string {
    return this.renderTemplate('password-reset', {
      ...data,
      securityUrl: `${process.env.FRONTEND_URL}/security`
    });
  }

  renderReviewRequest(data: {
    userName: string;
    restaurantName: string;
    bookingDate: string;
    reviewLink: string;
  }): string {
    return this.renderTemplate('review-request', {
      ...data,
      restaurantUrl: `${process.env.FRONTEND_URL}/restaurant`
    });
  }

  renderPromotional(data: {
    userName: string;
    offerTitle: string;
    offerDescription: string;
    offerCode?: string;
    offerExpiry: string;
    ctaLink: string;
    ctaText: string;
  }): string {
    return this.renderTemplate('promotional', data);
  }

  // Get available templates
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // Reload templates (useful for development)
  reloadTemplates(): void {
    this.templates.clear();
    this.loadTemplates();
  }
}