import React from 'react';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'pending';
  }>;
  reminder?: {
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  };
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    count?: number;
    until?: Date;
  };
  metadata?: {
    reservationId?: string;
    restaurantId?: string;
    partySize?: number;
    confirmationCode?: string;
  };
}

export interface CalendarProvider {
  name: string;
  id: 'google' | 'outlook' | 'apple' | 'yahoo' | 'ics';
  supported: boolean;
  requiresAuth: boolean;
}

interface GoogleCalendarConfig {
  clientId: string;
  apiKey: string;
  scope: string;
}

class CalendarService {
  private googleConfig: GoogleCalendarConfig | null = null;
  private isGoogleLoaded = false;
  private googleAuth: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.googleConfig = {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
        scope: 'https://www.googleapis.com/auth/calendar.events',
      };
    }
  }

  // Initialize Google Calendar API
  async initializeGoogle(): Promise<void> {
    if (this.isGoogleLoaded) return;

    if (!this.googleConfig?.clientId || !this.googleConfig?.apiKey) {
      throw new Error('Google Calendar API credentials not configured');
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Calendar can only be loaded in browser environment'));
        return;
      }

      // Load Google API
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', async () => {
          try {
            await window.gapi.client.init({
              apiKey: this.googleConfig!.apiKey,
              clientId: this.googleConfig!.clientId,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: this.googleConfig!.scope,
            });

            this.googleAuth = window.gapi.auth2.getAuthInstance();
            this.isGoogleLoaded = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google Calendar API'));
      document.head.appendChild(script);
    });
  }

  // Get available calendar providers
  getAvailableProviders(): CalendarProvider[] {
    const providers: CalendarProvider[] = [
      {
        name: 'Google Calendar',
        id: 'google',
        supported: !!this.googleConfig?.clientId,
        requiresAuth: true,
      },
      {
        name: 'Outlook Calendar',
        id: 'outlook',
        supported: true,
        requiresAuth: false,
      },
      {
        name: 'Apple Calendar',
        id: 'apple',
        supported: true,
        requiresAuth: false,
      },
      {
        name: 'Yahoo Calendar',
        id: 'yahoo',
        supported: true,
        requiresAuth: false,
      },
      {
        name: 'Download .ics file',
        id: 'ics',
        supported: true,
        requiresAuth: false,
      },
    ];

    return providers.filter(provider => provider.supported);
  }

  // Add event to calendar
  async addToCalendar(event: CalendarEvent, provider: CalendarProvider['id']): Promise<string> {
    switch (provider) {
      case 'google':
        return await this.addToGoogleCalendar(event);
      case 'outlook':
        return this.addToOutlookCalendar(event);
      case 'apple':
        return this.addToAppleCalendar(event);
      case 'yahoo':
        return this.addToYahooCalendar(event);
      case 'ics':
        return this.downloadICSFile(event);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  // Google Calendar integration
  private async addToGoogleCalendar(event: CalendarEvent): Promise<string> {
    await this.initializeGoogle();

    if (!this.googleAuth.isSignedIn.get()) {
      await this.googleAuth.signIn();
    }

    const calendarEvent = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location: event.location || '',
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
      })) || [],
      reminders: event.reminder ? {
        useDefault: false,
        overrides: [{
          method: event.reminder.method,
          minutes: event.reminder.minutes,
        }],
      } : { useDefault: true },
    };

    if (event.recurrence) {
      calendarEvent.recurrence = [this.buildRecurrenceRule(event.recurrence)];
    }

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: calendarEvent,
      });

      return response.result.htmlLink;
    } catch (error) {
      console.error('Failed to add event to Google Calendar:', error);
      throw new Error('Failed to add event to Google Calendar');
    }
  }

  // Outlook Calendar integration (web-based)
  private addToOutlookCalendar(event: CalendarEvent): string {
    const params = new URLSearchParams({
      subject: event.title,
      startdt: event.start.toISOString(),
      enddt: event.end.toISOString(),
      body: event.description || '',
      location: event.location || '',
    });

    const url = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
    window.open(url, '_blank');
    return url;
  }

  // Apple Calendar integration (web-based)
  private addToAppleCalendar(event: CalendarEvent): string {
    // Apple Calendar doesn't have a web API, so we'll use ICS
    return this.downloadICSFile(event);
  }

  // Yahoo Calendar integration (web-based)
  private addToYahooCalendar(event: CalendarEvent): string {
    const params = new URLSearchParams({
      title: event.title,
      st: this.formatYahooDate(event.start),
      et: this.formatYahooDate(event.end),
      desc: event.description || '',
      in_loc: event.location || '',
    });

    const url = `https://calendar.yahoo.com/?${params.toString()}`;
    window.open(url, '_blank');
    return url;
  }

  // Download ICS file
  private downloadICSFile(event: CalendarEvent): string {
    const icsContent = this.generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return url;
  }

  // Generate ICS content
  private generateICS(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escape = (str: string): string => {
      return str.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
    };

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OpenTable Clone//Calendar Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id || Date.now()}@opentable-clone.com`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `SUMMARY:${escape(event.title)}`,
    ];

    if (event.description) {
      ics.push(`DESCRIPTION:${escape(event.description)}`);
    }

    if (event.location) {
      ics.push(`LOCATION:${escape(event.location)}`);
    }

    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(attendee => {
        ics.push(`ATTENDEE;CN=${attendee.name || ''}:mailto:${attendee.email}`);
      });
    }

    if (event.reminder) {
      ics.push('BEGIN:VALARM');
      ics.push(`TRIGGER:-PT${event.reminder.minutes}M`);
      ics.push(`ACTION:${event.reminder.method.toUpperCase()}`);
      ics.push('END:VALARM');
    }

    if (event.recurrence) {
      ics.push(`RRULE:${this.buildRecurrenceRule(event.recurrence)}`);
    }

    ics.push('END:VEVENT');
    ics.push('END:VCALENDAR');

    return ics.join('\r\n');
  }

  // Build recurrence rule
  private buildRecurrenceRule(recurrence: NonNullable<CalendarEvent['recurrence']>): string {
    let rule = `FREQ=${recurrence.frequency.toUpperCase()}`;

    if (recurrence.interval && recurrence.interval > 1) {
      rule += `;INTERVAL=${recurrence.interval}`;
    }

    if (recurrence.count) {
      rule += `;COUNT=${recurrence.count}`;
    } else if (recurrence.until) {
      rule += `;UNTIL=${recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }

    return rule;
  }

  // Format date for Yahoo Calendar
  private formatYahooDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}00`;
  }

  // Create reservation calendar event
  createReservationEvent(reservation: {
    restaurantName: string;
    date: string;
    time: string;
    partySize: number;
    confirmationCode: string;
    restaurantAddress?: string;
    restaurantPhone?: string;
    notes?: string;
  }): CalendarEvent {
    const startDate = new Date(`${reservation.date}T${reservation.time}`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours

    return {
      title: `Dinner at ${reservation.restaurantName}`,
      description: [
        `Reservation for ${reservation.partySize} people`,
        `Confirmation Code: ${reservation.confirmationCode}`,
        reservation.notes ? `Notes: ${reservation.notes}` : '',
        reservation.restaurantPhone ? `Phone: ${reservation.restaurantPhone}` : '',
      ].filter(Boolean).join('\n'),
      start: startDate,
      end: endDate,
      location: reservation.restaurantAddress || reservation.restaurantName,
      reminder: {
        method: 'popup',
        minutes: 60, // 1 hour before
      },
      metadata: {
        confirmationCode: reservation.confirmationCode,
        partySize: reservation.partySize,
      },
    };
  }

  // Create delivery tracking event
  createDeliveryEvent(order: {
    restaurantName: string;
    orderNumber: string;
    estimatedDeliveryTime: string;
    deliveryAddress: string;
    items: string[];
  }): CalendarEvent {
    const deliveryTime = new Date(order.estimatedDeliveryTime);
    const orderTime = new Date(deliveryTime.getTime() - 45 * 60 * 1000); // 45 minutes before

    return {
      title: `Food Delivery from ${order.restaurantName}`,
      description: [
        `Order #${order.orderNumber}`,
        `Items: ${order.items.join(', ')}`,
        `Delivery Address: ${order.deliveryAddress}`,
      ].join('\n'),
      start: orderTime,
      end: deliveryTime,
      location: order.deliveryAddress,
      reminder: {
        method: 'popup',
        minutes: 15, // 15 minutes before delivery
      },
    };
  }

  // Sync with external calendar
  async syncCalendarEvents(
    provider: CalendarProvider['id'],
    dateRange: { start: Date; end: Date }
  ): Promise<CalendarEvent[]> {
    switch (provider) {
      case 'google':
        return await this.syncGoogleCalendar(dateRange);
      default:
        throw new Error(`Calendar sync not supported for ${provider}`);
    }
  }

  private async syncGoogleCalendar(dateRange: { start: Date; end: Date }): Promise<CalendarEvent[]> {
    await this.initializeGoogle();

    if (!this.googleAuth.isSignedIn.get()) {
      throw new Error('User not signed in to Google Calendar');
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: dateRange.start.toISOString(),
        timeMax: dateRange.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.result.items.map((item: any) => ({
        id: item.id,
        title: item.summary,
        description: item.description,
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
        location: item.location,
        attendees: item.attendees?.map((attendee: any) => ({
          email: attendee.email,
          name: attendee.displayName,
          status: attendee.responseStatus,
        })),
      }));
    } catch (error) {
      console.error('Failed to sync Google Calendar:', error);
      throw new Error('Failed to sync Google Calendar');
    }
  }

  // Check for calendar conflicts
  async checkConflicts(
    event: CalendarEvent,
    provider: CalendarProvider['id']
  ): Promise<CalendarEvent[]> {
    const dateRange = {
      start: new Date(event.start.getTime() - 60 * 60 * 1000), // 1 hour before
      end: new Date(event.end.getTime() + 60 * 60 * 1000), // 1 hour after
    };

    try {
      const existingEvents = await this.syncCalendarEvents(provider, dateRange);
      
      return existingEvents.filter(existingEvent => {
        return (
          (event.start >= existingEvent.start && event.start < existingEvent.end) ||
          (event.end > existingEvent.start && event.end <= existingEvent.end) ||
          (event.start <= existingEvent.start && event.end >= existingEvent.end)
        );
      });
    } catch (error) {
      console.warn('Could not check calendar conflicts:', error);
      return [];
    }
  }

  // Generate calendar URLs for quick actions
  generateCalendarUrls(event: CalendarEvent): Record<string, string> {
    return {
      google: this.generateGoogleUrl(event),
      outlook: this.addToOutlookCalendar(event),
      yahoo: this.addToYahooCalendar(event),
    };
  }

  private generateGoogleUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${this.formatGoogleDate(event.start)}/${this.formatGoogleDate(event.end)}`,
      details: event.description || '',
      location: event.location || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  private formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}

// Singleton instance
export const calendarService = new CalendarService();

// React hooks
export function useCalendarProviders() {
  const [providers] = React.useState(() => calendarService.getAvailableProviders());
  
  return providers;
}

export function useAddToCalendar() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addToCalendar = React.useCallback(async (
    event: CalendarEvent,
    provider: CalendarProvider['id']
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await calendarService.addToCalendar(event, provider);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addToCalendar, loading, error };
}

export function useCalendarSync(provider: CalendarProvider['id']) {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sync = React.useCallback(async (dateRange: { start: Date; end: Date }) => {
    setLoading(true);
    setError(null);
    
    try {
      const syncedEvents = await calendarService.syncCalendarEvents(provider, dateRange);
      setEvents(syncedEvents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  return { events, sync, loading, error };
}

export default calendarService;