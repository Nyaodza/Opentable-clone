import * as cron from 'node-cron';
import { LoyaltyService } from './loyalty.service';
import { ReservationService } from './reservation.service';
import { logInfo, logError } from '../utils/logger';

export class CronService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all cron jobs
   */
  static start(): void {
    // Daily jobs at 2 AM
    this.scheduleJob('loyalty-points-expiry', '0 2 * * *', async () => {
      logInfo('Running loyalty points expiry job');
      try {
        await LoyaltyService.expirePoints();
      } catch (error) {
        logError('Failed to expire loyalty points', error);
      }
    });

    // Daily jobs at 8 AM
    this.scheduleJob('birthday-bonuses', '0 8 * * *', async () => {
      logInfo('Running birthday bonus job');
      try {
        await LoyaltyService.awardBirthdayBonuses();
      } catch (error) {
        logError('Failed to award birthday bonuses', error);
      }
    });

    // Every 30 minutes - check for reservations to send reminders
    this.scheduleJob('reservation-reminders', '*/30 * * * *', async () => {
      logInfo('Running reservation reminder job');
      try {
        await ReservationService.sendUpcomingReminders();
      } catch (error) {
        logError('Failed to send reservation reminders', error);
      }
    });

    // Every hour - check for completed reservations to request reviews
    this.scheduleJob('review-requests', '0 * * * *', async () => {
      logInfo('Running review request job');
      try {
        await ReservationService.sendReviewRequests();
      } catch (error) {
        logError('Failed to send review requests', error);
      }
    });

    // Every 15 minutes - clean up expired sessions
    this.scheduleJob('session-cleanup', '*/15 * * * *', async () => {
      logInfo('Running session cleanup job');
      try {
        // This would clean up expired Redis sessions
        // Implementation depends on session management strategy
      } catch (error) {
        logError('Failed to clean up sessions', error);
      }
    });

    // Every day at midnight - generate analytics reports
    this.scheduleJob('analytics-generation', '0 0 * * *', async () => {
      logInfo('Running analytics generation job');
      try {
        // This would generate and cache daily analytics
        // Implementation would be in analytics service
      } catch (error) {
        logError('Failed to generate analytics', error);
      }
    });

    logInfo('Cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  static stop(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logInfo(`Stopped cron job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Schedule a cron job
   */
  private static scheduleJob(
    name: string,
    schedule: string,
    task: () => Promise<void>
  ): void {
    if (this.jobs.has(name)) {
      logError(`Cron job ${name} already exists`);
      return;
    }

    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    });

    this.jobs.set(name, job);
    logInfo(`Scheduled cron job: ${name} with schedule: ${schedule}`);
  }

  /**
   * Run a specific job manually
   */
  static async runJob(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Cron job ${name} not found`);
    }

    logInfo(`Manually running cron job: ${name}`);
    // Note: node-cron doesn't provide a way to manually trigger a job
    // So we'll need to extract the task function and run it
    // This is a limitation of the current implementation
  }

  /**
   * Get job status
   */
  static getJobStatus(name: string): {
    exists: boolean;
    running: boolean;
  } {
    const job = this.jobs.get(name);
    return {
      exists: !!job,
      running: job ? job.getStatus() === 'running' : false
    };
  }

  /**
   * Get all jobs
   */
  static getAllJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}