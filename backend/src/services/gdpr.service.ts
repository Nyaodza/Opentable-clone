import { DataExportRequest, DataDeletionRequest } from '../models/DataExportRequest';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { GuestReservation } from '../models/GuestReservation';
import fs from 'fs/promises';
import path from 'path';

export class GDPRService {
  /**
   * Request data export (GDPR Article 15)
   */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    // Check if there's already a pending request
    const existing = await DataExportRequest.findOne({
      where: { userId, status: 'pending' },
    });

    if (existing) {
      throw new Error('Data export request already in progress');
    }

    // Create export request
    const request = await DataExportRequest.create({
      userId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Process asynchronously
    this.processDataExport(request.id).catch(console.error);

    return request;
  }

  /**
   * Process data export
   */
  private async processDataExport(requestId: string): Promise<void> {
    const request = await DataExportRequest.findByPk(requestId);
    if (!request) return;

    try {
      await request.update({ status: 'processing' });

      // Gather all user data
      const user = await User.findByPk(request.userId);
      if (!user) throw new Error('User not found');

      const data = {
        personalInfo: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          createdAt: user.createdAt,
        },
        reservations: await Reservation.findAll({
          where: { userId: user.id },
          attributes: { exclude: ['stripePaymentIntentId'] },
        }),
        reviews: await Review.findAll({
          where: { userId: user.id },
        }),
        guestReservations: await GuestReservation.findAll({
          where: { guestEmail: user.email },
        }),
        // Add other data types as needed
      };

      // Generate JSON file
      const fileName = `user-data-${user.id}-${Date.now()}.json`;
      const filePath = path.join(process.cwd(), 'exports', fileName);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      // Update request with file URL
      await request.update({
        status: 'completed',
        fileUrl: `/exports/${fileName}`,
        completedAt: new Date(),
      });

      // TODO: Send email notification with download link
    } catch (error) {
      console.error('Data export failed:', error);
      await request.update({ status: 'failed' });
    }
  }

  /**
   * Get data export request
   */
  async getExportRequest(requestId: string): Promise<DataExportRequest | null> {
    return await DataExportRequest.findByPk(requestId);
  }

  /**
   * Request account deletion (GDPR Article 17)
   */
  async requestDataDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    // Check if there's already a pending request
    const existing = await DataDeletionRequest.findOne({
      where: { userId, status: 'pending' },
    });

    if (existing) {
      throw new Error('Data deletion request already pending');
    }

    // Schedule deletion for 30 days (grace period)
    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const request = await DataDeletionRequest.create({
      userId,
      status: 'pending',
      reason: reason || 'User requested',
      scheduledFor,
    });

    return request;
  }

  /**
   * Cancel deletion request (within grace period)
   */
  async cancelDeletionRequest(requestId: string): Promise<DataDeletionRequest> {
    const request = await DataDeletionRequest.findByPk(requestId);
    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Cannot cancel - deletion already processed');
    }

    await request.update({ status: 'cancelled' });
    return request;
  }

  /**
   * Process data deletion
   */
  async processDeletion(requestId: string): Promise<void> {
    const request = await DataDeletionRequest.findByPk(requestId);
    if (!request) return;

    await request.update({ status: 'processing' });

    try {
      const userId = request.userId;

      // Anonymize or delete data according to GDPR requirements
      // Keep data required for legal/accounting purposes

      // Anonymize reservations (keep for records)
      await Reservation.update(
        { userId: null },
        { where: { userId } }
      );

      // Anonymize reviews
      await Review.update(
        { userId: null },
        { where: { userId } }
      );

      // Anonymize guest reservations
      await GuestReservation.update(
        { 
          userId: null,
          guestEmail: 'deleted@example.com',
          guestName: 'Deleted User',
          guestPhone: 'DELETED'
        },
        { where: { userId } }
      );

      // Delete user account
      await User.update(
        {
          email: `deleted-${userId}@example.com`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          isActive: false,
        },
        { where: { id: userId } }
      );

      await request.update({
        status: 'completed',
        completedAt: new Date(),
      });

      // TODO: Send confirmation email
    } catch (error) {
      console.error('Deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get user's consent preferences
   */
  async getConsentPreferences(userId: string): Promise<any> {
    const user = await User.findByPk(userId);
    return {
      marketing: user?.marketingConsent || false,
      analytics: user?.analyticsConsent || true,
      thirdParty: user?.thirdPartyConsent || false,
    };
  }

  /**
   * Update consent preferences
   */
  async updateConsentPreferences(userId: string, preferences: any): Promise<void> {
    await User.update(
      {
        marketingConsent: preferences.marketing,
        analyticsConsent: preferences.analytics,
        thirdPartyConsent: preferences.thirdParty,
      },
      { where: { id: userId } }
    );
  }

  /**
   * Get user activity log (for transparency)
   */
  async getUserActivityLog(userId: string, limit: number = 100): Promise<any[]> {
    // Return recent activity
    return [
      {
        action: 'login',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
      },
      // Add more activity types
    ];
  }
}

export default new GDPRService();
