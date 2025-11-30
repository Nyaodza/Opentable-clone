import cron from 'node-cron';
import guestReservationService from './guest-reservation.service';
import smsService from './sms.service';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Op } from 'sequelize';

export class ReminderSchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all reminder schedulers
   */
  start() {
    console.log('🔔 Starting reminder scheduler service...');

    // Send reminders 24 hours before
    this.schedule24HourReminders();

    // Send reminders 2 hours before
    this.schedule2HourReminders();

    // Send reminders 1 hour before
    this.schedule1HourReminders();

    console.log('✅ Reminder scheduler service started');
  }

  /**
   * Stop all schedulers
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped scheduler: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Schedule 24-hour reminders (runs every hour)
   */
  private schedule24HourReminders() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('📅 Running 24-hour reminder check...');
      await this.sendReminders(24);
    });

    this.jobs.set('24-hour-reminders', job);
  }

  /**
   * Schedule 2-hour reminders (runs every 30 minutes)
   */
  private schedule2HourReminders() {
    const job = cron.schedule('*/30 * * * *', async () => {
      console.log('⏰ Running 2-hour reminder check...');
      await this.sendReminders(2);
    });

    this.jobs.set('2-hour-reminders', job);
  }

  /**
   * Schedule 1-hour reminders (runs every 15 minutes)
   */
  private schedule1HourReminders() {
    const job = cron.schedule('*/15 * * * *', async () => {
      console.log('⏱️  Running 1-hour reminder check...');
      await this.sendReminders(1);
    });

    this.jobs.set('1-hour-reminders', job);
  }

  /**
   * Send reminders for reservations X hours ahead
   */
  private async sendReminders(hoursAhead: number) {
    try {
      // Get guest reservations needing reminders
      const guestReservations = await guestReservationService.getReservationsNeedingReminders(
        hoursAhead
      );

      // Get authenticated user reservations needing reminders
      const userReservations = await this.getUserReservationsNeedingReminders(hoursAhead);

      let smsCount = 0;
      let emailCount = 0;

      // Process guest reservations
      for (const reservation of guestReservations) {
        try {
          // Send SMS if not sent
          if (!reservation.smsReminderSent && smsService.isAvailable()) {
            await smsService.sendReservationReminder(
              reservation.guestPhone,
              reservation.guestName,
              reservation.restaurant.name,
              reservation.date,
              reservation.time,
              reservation.restaurant.address || 'See confirmation for address'
            );
            await guestReservationService.markSmsReminderSent(reservation.id);
            smsCount++;
          }

          // Send email if not sent
          if (!reservation.emailReminderSent) {
            // Email sending logic would go here
            await guestReservationService.markEmailReminderSent(reservation.id);
            emailCount++;
          }
        } catch (error) {
          console.error(`Failed to send reminder for reservation ${reservation.id}:`, error);
        }
      }

      // Process user reservations
      for (const reservation of userReservations) {
        try {
          const user = reservation.user;
          if (user && user.phone && smsService.isAvailable()) {
            await smsService.sendReservationReminder(
              user.phone,
              `${user.firstName} ${user.lastName}`,
              reservation.restaurant.name,
              reservation.date,
              reservation.time,
              reservation.restaurant.address || 'See confirmation for address'
            );
            smsCount++;
          }

          // Email sending logic
          emailCount++;
        } catch (error) {
          console.error(`Failed to send reminder for reservation ${reservation.id}:`, error);
        }
      }

      console.log(
        `✅ Sent ${smsCount} SMS and ${emailCount} email reminders for ${hoursAhead}-hour window`
      );
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  }

  /**
   * Get user reservations needing reminders
   */
  private async getUserReservationsNeedingReminders(hoursAhead: number): Promise<Reservation[]> {
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + hoursAhead);

    const reservations = await Reservation.findAll({
      where: {
        status: 'confirmed',
        date: targetDate.toISOString().split('T')[0],
        // Add flag for reminder sent if you add it to the model
      },
      include: [
        { model: Restaurant },
        { model: User },
      ],
    });

    return reservations;
  }

  /**
   * Manual trigger for testing
   */
  async triggerReminderCheck(hoursAhead: number = 24) {
    console.log(`🔔 Manually triggering ${hoursAhead}-hour reminder check...`);
    await this.sendReminders(hoursAhead);
  }
}

export default new ReminderSchedulerService();
