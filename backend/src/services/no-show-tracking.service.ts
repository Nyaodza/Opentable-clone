import { NoShowIncident } from '../models/NoShowIncident';
import { ReliabilityScore } from '../models/ReliabilityScore';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { NotificationService } from './notification.service';
import { AnalyticsService } from './analytics.service';
import { PaymentService } from './payment.service';
import { Op } from 'sequelize';

export class NoShowTrackingService {
  private notificationService: NotificationService;
  private analyticsService: AnalyticsService;
  private paymentService: PaymentService;

  // Severity level configurations
  private readonly SEVERITY_LEVELS = {
    LOW: {
      threshold: 1,
      penaltyAmount: 25.00,
      restrictionDays: 0,
      reliabilityImpact: -10
    },
    MEDIUM: {
      threshold: 2,
      penaltyAmount: 50.00,
      restrictionDays: 7,
      reliabilityImpact: -25
    },
    HIGH: {
      threshold: 3,
      penaltyAmount: 100.00,
      restrictionDays: 30,
      reliabilityImpact: -50
    },
    CRITICAL: {
      threshold: 5,
      penaltyAmount: 200.00,
      restrictionDays: 90,
      reliabilityImpact: -100
    }
  };

  // Reliability score ranges
  private readonly RELIABILITY_TIERS = {
    EXCELLENT: { min: 90, max: 100, benefits: ['Priority reservations', 'Fee waivers', 'VIP treatment'] },
    GOOD: { min: 75, max: 89, benefits: ['Standard booking', 'Occasional promotions'] },
    FAIR: { min: 50, max: 74, benefits: ['Standard booking'] },
    POOR: { min: 25, max: 49, benefits: [], restrictions: ['Deposit required', 'Limited availability'] },
    UNRELIABLE: { min: 0, max: 24, benefits: [], restrictions: ['Deposit required', 'Booking restrictions', 'Manager approval'] }
  };

  constructor() {
    this.notificationService = new NotificationService();
    this.analyticsService = new AnalyticsService();
    this.paymentService = new PaymentService();
  }

  async recordNoShow(reservationId: string, details: {
    confirmationAttempts?: number;
    waitTimeMinutes?: number;
    notes?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recordedBy: string;
  }): Promise<NoShowIncident> {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: User, as: 'user' },
          { model: Restaurant, as: 'restaurant' }
        ]
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Calculate automatic severity if not provided
      let severity = details.severity;
      if (!severity) {
        severity = await this.calculateSeverity(reservation.userId, details);
      }

      // Calculate revenue impact
      const revenueImpact = this.calculateRevenueImpact(reservation);

      // Record the no-show incident
      const incident = await NoShowIncident.create({
        reservationId,
        userId: reservation.userId,
        restaurantId: reservation.restaurantId,
        severity,
        confirmationAttempts: details.confirmationAttempts || 0,
        waitTimeMinutes: details.waitTimeMinutes || 0,
        revenueImpact,
        notes: details.notes,
        recordedBy: details.recordedBy,
        penaltyApplied: false,
        status: 'RECORDED'
      });

      // Update reservation status
      await reservation.update({
        status: 'NO_SHOW',
        noShowRecordedAt: new Date().toISOString()
      });

      // Update user reliability score
      await this.updateReliabilityScore(reservation.userId, severity);

      // Apply penalties
      await this.applyPenalties(incident);

      // Send notifications
      await this.sendNoShowNotifications(incident, reservation);

      await this.analyticsService.trackEvent('no_show_recorded', {
        reservationId,
        userId: reservation.userId,
        restaurantId: reservation.restaurantId,
        severity,
        revenueImpact,
        confirmationAttempts: details.confirmationAttempts || 0
      });

      return incident;
    } catch (error) {
      console.error('Error recording no-show:', error);
      throw new Error('Failed to record no-show incident');
    }
  }

  async disputeNoShow(incidentId: string, userId: string, disputeReason: string, evidence?: string[]): Promise<void> {
    try {
      const incident = await NoShowIncident.findOne({
        where: { id: incidentId, userId }
      });

      if (!incident) {
        throw new Error('No-show incident not found or access denied');
      }

      if (incident.status !== 'RECORDED') {
        throw new Error('Cannot dispute incident that has already been processed');
      }

      await incident.update({
        status: 'DISPUTED',
        disputeReason,
        disputeEvidence: evidence || [],
        disputedAt: new Date().toISOString()
      });

      // Notify restaurant staff of dispute
      await this.notificationService.sendNotification('restaurant_staff', {
        type: 'NO_SHOW_DISPUTED',
        title: 'No-Show Incident Disputed',
        message: `Customer has disputed a no-show incident: ${disputeReason}`,
        data: {
          incidentId,
          userId,
          disputeReason,
          hasEvidence: evidence && evidence.length > 0
        }
      });

      await this.analyticsService.trackEvent('no_show_disputed', {
        incidentId,
        userId,
        disputeReason,
        evidenceProvided: evidence && evidence.length > 0
      });
    } catch (error) {
      console.error('Error disputing no-show:', error);
      throw new Error('Failed to dispute no-show incident');
    }
  }

  async resolveDispute(incidentId: string, approved: boolean, staffUserId: string, resolution?: string): Promise<void> {
    try {
      const incident = await NoShowIncident.findByPk(incidentId);
      if (!incident) {
        throw new Error('No-show incident not found');
      }

      if (incident.status !== 'DISPUTED') {
        throw new Error('Incident is not in disputed status');
      }

      const newStatus = approved ? 'DISPUTE_APPROVED' : 'DISPUTE_REJECTED';
      
      await incident.update({
        status: newStatus,
        resolvedBy: staffUserId,
        resolution,
        resolvedAt: new Date().toISOString()
      });

      if (approved) {
        // Reverse penalties if dispute approved
        await this.reversePenalties(incident);
        
        // Restore reliability score
        await this.restoreReliabilityScore(incident.userId, incident.severity);
      }

      // Notify customer of resolution
      await this.notificationService.sendNotification(incident.userId, {
        type: approved ? 'DISPUTE_APPROVED' : 'DISPUTE_REJECTED',
        title: approved ? 'Dispute Approved' : 'Dispute Rejected',
        message: approved 
          ? 'Your no-show dispute has been approved and penalties have been reversed.'
          : `Your no-show dispute has been rejected. ${resolution || ''}`,
        data: { incidentId, approved, resolution }
      });

      await this.analyticsService.trackEvent('no_show_dispute_resolved', {
        incidentId,
        approved,
        staffUserId,
        originalSeverity: incident.severity
      });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw new Error('Failed to resolve dispute');
    }
  }

  async getUserReliabilityScore(userId: string): Promise<ReliabilityScore | null> {
    try {
      let score = await ReliabilityScore.findOne({ where: { userId } });
      
      if (!score) {
        // Create initial reliability score
        score = await ReliabilityScore.create({
          userId,
          currentScore: 100, // Start with perfect score
          historicalHigh: 100,
          historicalLow: 100,
          totalReservations: 0,
          completedReservations: 0,
          noShowCount: 0,
          lastIncidentDate: null,
          tier: 'EXCELLENT',
          restrictionEndDate: null,
          rehabilitationStatus: 'NOT_REQUIRED'
        });
      }

      return score;
    } catch (error) {
      console.error('Error fetching reliability score:', error);
      return null;
    }
  }

  async updateReliabilityScore(userId: string, severity: string): Promise<void> {
    try {
      const score = await this.getUserReliabilityScore(userId);
      if (!score) return;

      const impact = this.SEVERITY_LEVELS[severity as keyof typeof this.SEVERITY_LEVELS].reliabilityImpact;
      const newScore = Math.max(0, score.currentScore + impact);

      // Determine new tier
      const newTier = this.calculateReliabilityTier(newScore);

      await score.update({
        currentScore: newScore,
        historicalLow: Math.min(score.historicalLow, newScore),
        noShowCount: score.noShowCount + 1,
        lastIncidentDate: new Date().toISOString(),
        tier: newTier
      });

      // Check if rehabilitation is needed
      if (newScore < 50 && score.rehabilitationStatus === 'NOT_REQUIRED') {
        await this.initiateRehabilitationProgram(userId);
      }

      await this.analyticsService.trackEvent('reliability_score_updated', {
        userId,
        previousScore: score.currentScore,
        newScore,
        impact,
        severity,
        newTier
      });
    } catch (error) {
      console.error('Error updating reliability score:', error);
    }
  }

  async restoreReliabilityScore(userId: string, severity: string): Promise<void> {
    try {
      const score = await this.getUserReliabilityScore(userId);
      if (!score) return;

      // Reverse the negative impact
      const impact = -this.SEVERITY_LEVELS[severity as keyof typeof this.SEVERITY_LEVELS].reliabilityImpact;
      const newScore = Math.min(100, score.currentScore + impact);
      const newTier = this.calculateReliabilityTier(newScore);

      await score.update({
        currentScore: newScore,
        noShowCount: Math.max(0, score.noShowCount - 1),
        tier: newTier
      });
    } catch (error) {
      console.error('Error restoring reliability score:', error);
    }
  }

  private calculateReliabilityTier(score: number): string {
    for (const [tier, range] of Object.entries(this.RELIABILITY_TIERS)) {
      if (score >= range.min && score <= range.max) {
        return tier;
      }
    }
    return 'UNRELIABLE';
  }

  private async calculateSeverity(userId: string, details: any): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    // Count recent no-shows (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentNoShows = await NoShowIncident.count({
      where: {
        userId,
        createdAt: { [Op.gte]: sixMonthsAgo }
      }
    });

    // Base severity on no-show history
    if (recentNoShows >= 5) return 'CRITICAL';
    if (recentNoShows >= 3) return 'HIGH';
    if (recentNoShows >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRevenueImpact(reservation: Reservation): number {
    // Mock calculation - would use historical data
    const basePerPerson = 45.00;
    const partyMultiplier = reservation.partySize > 6 ? 1.1 : 1.0;
    const timeSlotMultiplier = this.getTimeSlotMultiplier(reservation.time);
    
    return Math.round((basePerPerson * reservation.partySize * partyMultiplier * timeSlotMultiplier) * 100) / 100;
  }

  private getTimeSlotMultiplier(time: string): number {
    const hour = parseInt(time.split(':')[0]);
    
    // Prime time (7-9 PM) has higher impact
    if (hour >= 19 && hour <= 21) return 1.3;
    // Lunch time (12-2 PM) moderate impact
    if (hour >= 12 && hour <= 14) return 1.1;
    // Other times normal impact
    return 1.0;
  }

  private async applyPenalties(incident: NoShowIncident): Promise<void> {
    try {
      const severityConfig = this.SEVERITY_LEVELS[incident.severity as keyof typeof this.SEVERITY_LEVELS];
      
      // Apply financial penalty
      if (severityConfig.penaltyAmount > 0) {
        await this.paymentService.processPayment({
          userId: incident.userId,
          amount: severityConfig.penaltyAmount,
          description: `No-show penalty - ${incident.severity} severity`,
          reservationId: incident.reservationId,
          metadata: { noShowPenalty: true, incidentId: incident.id }
        });

        await incident.update({ 
          penaltyApplied: true,
          penaltyAmount: severityConfig.penaltyAmount
        });
      }

      // Apply booking restrictions
      if (severityConfig.restrictionDays > 0) {
        const restrictionEndDate = new Date();
        restrictionEndDate.setDate(restrictionEndDate.getDate() + severityConfig.restrictionDays);

        const score = await this.getUserReliabilityScore(incident.userId);
        if (score) {
          await score.update({ restrictionEndDate: restrictionEndDate.toISOString() });
        }
      }
    } catch (error) {
      console.error('Error applying penalties:', error);
    }
  }

  private async reversePenalties(incident: NoShowIncident): Promise<void> {
    try {
      if (incident.penaltyApplied && incident.penaltyAmount) {
        // Process refund
        await this.paymentService.processRefund({
          amount: incident.penaltyAmount,
          reason: 'No-show dispute approved - penalty reversal',
          userId: incident.userId,
          metadata: { incidentId: incident.id }
        });
      }

      // Remove restrictions
      const score = await this.getUserReliabilityScore(incident.userId);
      if (score && score.restrictionEndDate) {
        await score.update({ restrictionEndDate: null });
      }
    } catch (error) {
      console.error('Error reversing penalties:', error);
    }
  }

  private async sendNoShowNotifications(incident: NoShowIncident, reservation: Reservation): Promise<void> {
    // Notify customer
    await this.notificationService.sendNotification(incident.userId, {
      type: 'NO_SHOW_RECORDED',
      title: 'No-Show Recorded',
      message: `A no-show has been recorded for your reservation at ${reservation.restaurant.name}. You can dispute this within 48 hours.`,
      data: {
        incidentId: incident.id,
        reservationId: incident.reservationId,
        severity: incident.severity,
        canDispute: true
      }
    });

    // Notify restaurant staff
    await this.notificationService.sendNotification('restaurant_staff', {
      type: 'NO_SHOW_PROCESSED',
      title: 'No-Show Incident Processed',
      message: `No-show incident has been processed for customer ${reservation.user.firstName} ${reservation.user.lastName}`,
      data: {
        incidentId: incident.id,
        userId: incident.userId,
        severity: incident.severity,
        revenueImpact: incident.revenueImpact
      }
    });
  }

  async initiateRehabilitationProgram(userId: string): Promise<void> {
    try {
      const score = await this.getUserReliabilityScore(userId);
      if (!score) return;

      await score.update({
        rehabilitationStatus: 'IN_PROGRESS',
        rehabilitationStartDate: new Date().toISOString()
      });

      // Send rehabilitation program information
      await this.notificationService.sendNotification(userId, {
        type: 'REHABILITATION_PROGRAM_STARTED',
        title: 'Reliability Improvement Program',
        message: 'You\'ve been enrolled in our reliability improvement program. Complete the requirements to restore your booking privileges.',
        data: {
          requirements: [
            'Complete 3 consecutive reservations without no-shows',
            'Confirm reservations 24 hours in advance',
            'Update cancellations at least 2 hours before reservation time'
          ]
        }
      });

      await this.analyticsService.trackEvent('rehabilitation_program_initiated', {
        userId,
        currentScore: score.currentScore,
        noShowCount: score.noShowCount
      });
    } catch (error) {
      console.error('Error initiating rehabilitation program:', error);
    }
  }

  async updateRehabilitationProgress(userId: string, completedReservationId: string): Promise<void> {
    try {
      const score = await this.getUserReliabilityScore(userId);
      if (!score || score.rehabilitationStatus !== 'IN_PROGRESS') return;

      // Check consecutive successful reservations
      const recentReservations = await Reservation.findAll({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { [Op.gte]: score.rehabilitationStartDate }
        },
        order: [['date', 'DESC']],
        limit: 3
      });

      if (recentReservations.length >= 3) {
        // Rehabilitation completed
        await score.update({
          rehabilitationStatus: 'COMPLETED',
          currentScore: Math.min(100, score.currentScore + 25), // Bonus points
          restrictionEndDate: null // Remove restrictions
        });

        await this.notificationService.sendNotification(userId, {
          type: 'REHABILITATION_COMPLETED',
          title: 'Congratulations!',
          message: 'You have successfully completed the reliability improvement program. Your booking privileges have been fully restored.',
          data: {
            bonusPoints: 25,
            newScore: score.currentScore + 25
          }
        });
      }
    } catch (error) {
      console.error('Error updating rehabilitation progress:', error);
    }
  }

  async getUserNoShowHistory(userId: string): Promise<NoShowIncident[]> {
    try {
      return await NoShowIncident.findAll({
        where: { userId },
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error fetching user no-show history:', error);
      return [];
    }
  }

  async getRestaurantNoShows(restaurantId: string, dateRange?: { start: string; end: string }): Promise<NoShowIncident[]> {
    try {
      const whereClause: any = { restaurantId };
      if (dateRange) {
        whereClause.createdAt = {
          [Op.between]: [dateRange.start, dateRange.end]
        };
      }

      return await NoShowIncident.findAll({
        where: whereClause,
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error fetching restaurant no-shows:', error);
      return [];
    }
  }

  async getNoShowAnalytics(restaurantId?: string): Promise<any> {
    try {
      const analytics = {
        totalNoShows: await this.getTotalNoShows(restaurantId),
        noShowRate: await this.getNoShowRate(restaurantId),
        totalRevenueLoss: await this.getTotalRevenueLoss(restaurantId),
        averageRevenueLoss: await this.getAverageRevenueLoss(restaurantId),
        severityDistribution: await this.getSeverityDistribution(restaurantId),
        timeSlotAnalysis: await this.getTimeSlotAnalysis(restaurantId),
        repeatOffenderRate: await this.getRepeatOffenderRate(restaurantId),
        disputeRate: await this.getDisputeRate(restaurantId),
        rehabilitationSuccess: await this.getRehabilitationSuccessRate(restaurantId)
      };

      return analytics;
    } catch (error) {
      console.error('Error generating no-show analytics:', error);
      throw new Error('Failed to generate no-show analytics');
    }
  }

  private async getTotalNoShows(restaurantId?: string): Promise<number> {
    const whereClause = restaurantId ? { restaurantId } : {};
    return await NoShowIncident.count({ where: whereClause });
  }

  private async getNoShowRate(restaurantId?: string): Promise<number> {
    // Mock implementation - percentage
    return 8.4;
  }

  private async getTotalRevenueLoss(restaurantId?: string): Promise<number> {
    // Mock implementation
    return 45675.25;
  }

  private async getAverageRevenueLoss(restaurantId?: string): Promise<number> {
    // Mock implementation
    return 36.65;
  }

  private async getSeverityDistribution(restaurantId?: string): Promise<any> {
    // Mock implementation
    return {
      LOW: 45.2,
      MEDIUM: 32.8,
      HIGH: 18.5,
      CRITICAL: 3.5
    };
  }

  private async getTimeSlotAnalysis(restaurantId?: string): Promise<any[]> {
    // Mock implementation
    return [
      { timeSlot: '11:00-13:00', noShowCount: 89, rate: 5.2 },
      { timeSlot: '13:00-17:00', noShowCount: 56, rate: 7.8 },
      { timeSlot: '17:00-19:00', noShowCount: 134, rate: 9.1 },
      { timeSlot: '19:00-22:00', noShowCount: 267, rate: 11.3 }
    ];
  }

  private async getRepeatOffenderRate(restaurantId?: string): Promise<number> {
    // Mock implementation - percentage
    return 15.7;
  }

  private async getDisputeRate(restaurantId?: string): Promise<number> {
    // Mock implementation - percentage
    return 12.3;
  }

  private async getRehabilitationSuccessRate(restaurantId?: string): Promise<number> {
    // Mock implementation - percentage
    return 78.5;
  }
}
