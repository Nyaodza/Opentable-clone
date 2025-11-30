// backend/src/services/NoShowTrackingService.ts
import { 
  NoShowIncident, 
  NoShowProfile,
  NoShowSeverity,
  PenaltyType,
  RehabilitationStatus 
} from '../models/NoShowTracking';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Op } from 'sequelize';

export class NoShowTrackingService {

  /**
   * Record a no-show incident
   */
  async recordNoShowIncident(data: {
    reservationId: string;
    userId: string;
    restaurantId: string;
    reportedBy: string;
    reportedAt?: Date;
    externalFactors?: any;
    notes?: string;
  }): Promise<NoShowIncident> {
    
    const reservation = await Reservation.findByPk(data.reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Calculate severity based on reservation details and factors
    const severity = await this.calculateNoShowSeverity(reservation, data.externalFactors);

    // Calculate revenue loss
    const revenueLoss = await this.calculateRevenueLoss(reservation);

    // Create incident record
    const incident = await NoShowIncident.create({
      ...data,
      reportedAt: data.reportedAt || new Date(),
      severity,
      revenueLoss,
      impactMetrics: {
        tableOccupancyLoss: reservation.partySize,
        timeSlotLoss: 2, // Average 2 hours
        potentialTurnoverLoss: Math.floor(revenueLoss * 0.3), // Estimated additional revenue
        staffImpact: reservation.partySize >= 6 ? 'high' : 'medium'
      }
    });

    // Update reservation status
    reservation.status = 'no-show';
    reservation.noShowAt = new Date();
    await reservation.save();

    // Update or create user's no-show profile
    await this.updateNoShowProfile(data.userId, incident);

    // Apply penalties if warranted
    await this.applyPenalties(data.userId, incident);

    return incident;
  }

  /**
   * Update user's no-show profile
   */
  async updateNoShowProfile(userId: string, incident: NoShowIncident): Promise<NoShowProfile> {
    let profile = await NoShowProfile.findOne({ where: { userId } });

    if (!profile) {
      profile = await NoShowProfile.create({
        userId,
        totalNoShows: 0,
        totalRevenueLoss: 0,
        averageSeverityScore: 0,
        reliabilityScore: 100,
        warningCount: 0,
        penaltyHistory: [],
        rehabilitationStatus: RehabilitationStatus.NONE,
        riskLevel: 'low'
      });
    }

    // Update statistics
    profile.totalNoShows += 1;
    profile.totalRevenueLoss += incident.revenueLoss;
    profile.lastNoShowDate = incident.reportedAt;

    // Recalculate average severity
    const allIncidents = await NoShowIncident.findAll({
      where: { userId },
      attributes: ['severity']
    });
    
    const severityScores = allIncidents.map(i => this.getSeverityScore(i.severity));
    profile.averageSeverityScore = severityScores.reduce((sum, score) => sum + score, 0) / severityScores.length;

    // Update reliability score
    profile.reliabilityScore = await this.calculateReliabilityScore(userId);

    // Update risk level
    profile.riskLevel = this.calculateRiskLevel(profile);

    // Update frequency metrics
    const firstIncident = allIncidents[0];
    if (firstIncident) {
      const daysSinceFirst = (new Date().getTime() - firstIncident.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      profile.noShowFrequency = profile.totalNoShows / Math.max(1, daysSinceFirst / 30); // Per month
    }

    await profile.save();
    return profile;
  }

  /**
   * Apply penalties for no-show
   */
  async applyPenalties(userId: string, incident: NoShowIncident): Promise<void> {
    const profile = await NoShowProfile.findOne({ where: { userId } });
    if (!profile) return;

    const penalties = await this.determinePenalties(profile, incident);

    for (const penalty of penalties) {
      // Record penalty in profile history
      profile.penaltyHistory.push({
        type: penalty.type,
        appliedAt: new Date(),
        severity: incident.severity,
        amount: penalty.amount,
        duration: penalty.duration,
        reason: penalty.reason,
        incidentId: incident.id
      });

      // Apply penalty effects
      await this.executePenalty(userId, penalty);
    }

    // Update warning count
    if (penalties.some(p => p.type === PenaltyType.WARNING)) {
      profile.warningCount += 1;
    }

    await profile.save();
  }

  /**
   * Check if user should be restricted from booking
   */
  async checkBookingRestrictions(userId: string): Promise<{
    canBook: boolean;
    restrictions: Array<{
      type: string;
      reason: string;
      expiresAt?: Date;
      severity: string;
    }>;
    warningMessage?: string;
  }> {
    const profile = await NoShowProfile.findOne({ where: { userId } });
    
    if (!profile) {
      return { canBook: true, restrictions: [] };
    }

    const restrictions: any[] = [];
    let canBook = true;

    // Check active penalties
    for (const penalty of profile.penaltyHistory) {
      if (penalty.type === PenaltyType.BOOKING_RESTRICTION) {
        const expiryDate = new Date(penalty.appliedAt);
        expiryDate.setDate(expiryDate.getDate() + penalty.duration);
        
        if (new Date() < expiryDate) {
          canBook = false;
          restrictions.push({
            type: 'booking_restriction',
            reason: penalty.reason,
            expiresAt: expiryDate,
            severity: penalty.severity
          });
        }
      }
    }

    // Check reliability score
    if (profile.reliabilityScore < 30) {
      canBook = false;
      restrictions.push({
        type: 'low_reliability',
        reason: `Reliability score too low (${profile.reliabilityScore}%). Complete rehabilitation program to restore booking privileges.`,
        severity: 'high'
      });
    }

    // Generate warning message for borderline cases
    let warningMessage;
    if (profile.reliabilityScore < 60 && canBook) {
      warningMessage = `Your reliability score is ${profile.reliabilityScore}%. Further no-shows may result in booking restrictions.`;
    }

    return { canBook, restrictions, warningMessage };
  }

  /**
   * Start rehabilitation program for user
   */
  async startRehabilitationProgram(
    userId: string,
    programType: 'standard' | 'intensive' | 'custom',
    customRequirements?: any
  ): Promise<{
    program: any;
    requirements: Array<{
      requirement: string;
      description: string;
      completed: boolean;
      dueDate?: Date;
    }>;
    estimatedDuration: number; // days
  }> {
    const profile = await NoShowProfile.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('No-show profile not found');
    }

    const program = this.generateRehabilitationProgram(programType, profile, customRequirements);

    // Update profile
    profile.rehabilitationStatus = RehabilitationStatus.IN_PROGRESS;
    profile.rehabilitationProgram = program;
    profile.rehabilitationStartDate = new Date();
    await profile.save();

    return program;
  }

  /**
   * Update rehabilitation progress
   */
  async updateRehabilitationProgress(
    userId: string,
    completedRequirement: string,
    evidence?: any
  ): Promise<{
    progress: number;
    completed: boolean;
    nextRequirement?: string;
  }> {
    const profile = await NoShowProfile.findOne({ where: { userId } });
    if (!profile || !profile.rehabilitationProgram) {
      throw new Error('No active rehabilitation program found');
    }

    const program = profile.rehabilitationProgram;
    
    // Mark requirement as completed
    const requirement = program.requirements.find((r: any) => r.requirement === completedRequirement);
    if (requirement) {
      requirement.completed = true;
      requirement.completedAt = new Date();
      requirement.evidence = evidence;
    }

    // Calculate progress
    const completedCount = program.requirements.filter((r: any) => r.completed).length;
    const progress = (completedCount / program.requirements.length) * 100;

    // Check if program is completed
    const completed = progress >= 100;
    
    if (completed) {
      profile.rehabilitationStatus = RehabilitationStatus.COMPLETED;
      profile.rehabilitationCompletedDate = new Date();
      
      // Improve reliability score
      profile.reliabilityScore = Math.min(100, profile.reliabilityScore + 20);
      
      // Reset risk level if appropriate
      if (profile.reliabilityScore > 70) {
        profile.riskLevel = 'low';
      }
    }

    await profile.save();

    // Find next incomplete requirement
    const nextRequirement = program.requirements.find((r: any) => !r.completed);

    return {
      progress,
      completed,
      nextRequirement: nextRequirement?.requirement
    };
  }

  /**
   * Get no-show analytics for restaurant
   */
  async getNoShowAnalytics(
    restaurantId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<{
    totalNoShows: number;
    noShowRate: number;
    totalRevenueLoss: number;
    averageRevenueLossPerIncident: number;
    noShowsBySeverity: Record<NoShowSeverity, number>;
    noShowsByTimeSlot: Array<{
      timeSlot: string;
      count: number;
      revenueLoss: number;
    }>;
    topNoShowUsers: Array<{
      userId: string;
      userName: string;
      incidentCount: number;
      totalRevenueLoss: number;
      reliabilityScore: number;
    }>;
    externalFactors: Record<string, number>;
    preventionOpportunities: Array<{
      factor: string;
      impact: string;
      recommendation: string;
    }>;
  }> {
    const incidents = await NoShowIncident.findAll({
      where: {
        restaurantId,
        reportedAt: {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        }
      },
      include: [
        { model: User, as: 'user' },
        { model: Reservation, as: 'reservation' }
      ]
    });

    const totalReservations = await Reservation.count({
      where: {
        restaurantId,
        reservationDate: {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        }
      }
    });

    const totalNoShows = incidents.length;
    const noShowRate = totalReservations > 0 ? (totalNoShows / totalReservations) * 100 : 0;
    const totalRevenueLoss = incidents.reduce((sum, i) => sum + i.revenueLoss, 0);
    const averageRevenueLossPerIncident = totalNoShows > 0 ? totalRevenueLoss / totalNoShows : 0;

    // Group by severity
    const noShowsBySeverity: Record<NoShowSeverity, number> = {
      [NoShowSeverity.LOW]: 0,
      [NoShowSeverity.MEDIUM]: 0,
      [NoShowSeverity.HIGH]: 0,
      [NoShowSeverity.CRITICAL]: 0
    };

    incidents.forEach(incident => {
      noShowsBySeverity[incident.severity]++;
    });

    // Get top no-show users
    const userIncidents = incidents.reduce((acc, incident) => {
      const userId = incident.userId;
      if (!acc[userId]) {
        acc[userId] = {
          incidents: [],
          user: incident.user
        };
      }
      acc[userId].incidents.push(incident);
      return acc;
    }, {} as any);

    const topNoShowUsers = await Promise.all(
      Object.entries(userIncidents)
        .sort(([,a], [,b]) => b.incidents.length - a.incidents.length)
        .slice(0, 10)
        .map(async ([userId, data]: any) => {
          const profile = await NoShowProfile.findOne({ where: { userId } });
          return {
            userId,
            userName: `${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim(),
            incidentCount: data.incidents.length,
            totalRevenueLoss: data.incidents.reduce((sum: number, i: any) => sum + i.revenueLoss, 0),
            reliabilityScore: profile?.reliabilityScore || 100
          };
        })
    );

    return {
      totalNoShows,
      noShowRate: Math.round(noShowRate * 100) / 100,
      totalRevenueLoss,
      averageRevenueLossPerIncident: Math.round(averageRevenueLossPerIncident * 100) / 100,
      noShowsBySeverity,
      noShowsByTimeSlot: [], // Would implement time slot grouping
      topNoShowUsers,
      externalFactors: {}, // Would extract from incident external factors
      preventionOpportunities: [
        {
          factor: 'Confirmation reminders',
          impact: 'Could reduce no-shows by 15-25%',
          recommendation: 'Send SMS/email reminders 24h and 2h before reservation'
        },
        {
          factor: 'Prepayment requirements',
          impact: 'Could reduce no-shows by 60-80%',
          recommendation: 'Require prepayment for high-risk users or peak times'
        }
      ]
    };
  }

  /**
   * Get user's no-show history and status
   */
  async getUserNoShowStatus(userId: string): Promise<{
    profile: NoShowProfile | null;
    recentIncidents: NoShowIncident[];
    currentRestrictions: any[];
    rehabilitationStatus: {
      active: boolean;
      progress?: number;
      nextRequirement?: string;
    };
    recommendations: string[];
  }> {
    const profile = await NoShowProfile.findOne({ where: { userId } });
    
    const recentIncidents = await NoShowIncident.findAll({
      where: { userId },
      order: [['reportedAt', 'DESC']],
      limit: 5,
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Reservation, as: 'reservation' }
      ]
    });

    const restrictions = await this.checkBookingRestrictions(userId);

    const rehabilitationActive = profile?.rehabilitationStatus === RehabilitationStatus.IN_PROGRESS;
    let rehabilitationProgress = 0;
    let nextRequirement;

    if (rehabilitationActive && profile?.rehabilitationProgram) {
      const completed = profile.rehabilitationProgram.requirements.filter((r: any) => r.completed).length;
      rehabilitationProgress = (completed / profile.rehabilitationProgram.requirements.length) * 100;
      nextRequirement = profile.rehabilitationProgram.requirements.find((r: any) => !r.completed)?.requirement;
    }

    const recommendations = this.generateUserRecommendations(profile, recentIncidents);

    return {
      profile,
      recentIncidents,
      currentRestrictions: restrictions.restrictions,
      rehabilitationStatus: {
        active: rehabilitationActive,
        progress: rehabilitationProgress,
        nextRequirement
      },
      recommendations
    };
  }

  // Private helper methods
  private async calculateNoShowSeverity(
    reservation: Reservation,
    externalFactors?: any
  ): Promise<NoShowSeverity> {
    let severityScore = 0;

    // Base severity on party size
    if (reservation.partySize >= 8) severityScore += 3;
    else if (reservation.partySize >= 4) severityScore += 2;
    else severityScore += 1;

    // Consider time of reservation
    const hour = new Date(reservation.reservationDate).getHours();
    if (hour >= 19 && hour <= 21) severityScore += 2; // Peak dinner hours
    else if (hour >= 12 && hour <= 14) severityScore += 1; // Lunch hours

    // Consider reservation value
    if (reservation.totalAmount) {
      if (reservation.totalAmount >= 200) severityScore += 3;
      else if (reservation.totalAmount >= 100) severityScore += 2;
      else severityScore += 1;
    }

    // Adjust for external factors
    if (externalFactors?.weather === 'severe') severityScore -= 1;
    if (externalFactors?.emergencyReported) severityScore -= 2;

    // Map score to severity
    if (severityScore <= 2) return NoShowSeverity.LOW;
    if (severityScore <= 4) return NoShowSeverity.MEDIUM;
    if (severityScore <= 6) return NoShowSeverity.HIGH;
    return NoShowSeverity.CRITICAL;
  }

  private async calculateRevenueLoss(reservation: Reservation): Promise<number> {
    // Base loss is the reservation amount
    let loss = reservation.totalAmount || 0;

    // Add estimated opportunity cost
    const averageRevenuePerPerson = 50; // Would get from restaurant data
    const opportunityCost = reservation.partySize * averageRevenuePerPerson * 0.3;
    
    return loss + opportunityCost;
  }

  private getSeverityScore(severity: NoShowSeverity): number {
    switch (severity) {
      case NoShowSeverity.LOW: return 1;
      case NoShowSeverity.MEDIUM: return 2;
      case NoShowSeverity.HIGH: return 3;
      case NoShowSeverity.CRITICAL: return 4;
      default: return 1;
    }
  }

  private async calculateReliabilityScore(userId: string): Promise<number> {
    // Get recent reservation history (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const totalReservations = await Reservation.count({
      where: {
        userId,
        reservationDate: { [Op.gte]: sixMonthsAgo }
      }
    });

    const noShows = await NoShowIncident.count({
      where: {
        userId,
        reportedAt: { [Op.gte]: sixMonthsAgo }
      }
    });

    if (totalReservations === 0) return 100;

    const reliabilityRate = ((totalReservations - noShows) / totalReservations) * 100;
    return Math.max(0, Math.min(100, reliabilityRate));
  }

  private calculateRiskLevel(profile: NoShowProfile): string {
    if (profile.reliabilityScore < 40 || profile.noShowFrequency > 2) return 'high';
    if (profile.reliabilityScore < 70 || profile.noShowFrequency > 1) return 'medium';
    return 'low';
  }

  private async determinePenalties(profile: NoShowProfile, incident: NoShowIncident): Promise<any[]> {
    const penalties = [];

    // Progressive penalty system
    if (profile.totalNoShows === 1) {
      penalties.push({
        type: PenaltyType.WARNING,
        reason: 'First no-show warning',
        severity: incident.severity
      });
    } else if (profile.totalNoShows === 2) {
      penalties.push({
        type: PenaltyType.FEE,
        amount: 25,
        reason: 'Second no-show fee',
        severity: incident.severity
      });
    } else if (profile.totalNoShows >= 3) {
      penalties.push({
        type: PenaltyType.BOOKING_RESTRICTION,
        duration: Math.min(30, profile.totalNoShows * 7), // Max 30 days
        reason: `Multiple no-shows (${profile.totalNoShows} total)`,
        severity: incident.severity
      });
    }

    // Additional penalties for high severity
    if (incident.severity === NoShowSeverity.CRITICAL) {
      penalties.push({
        type: PenaltyType.FEE,
        amount: incident.revenueLoss * 0.5, // 50% of revenue loss
        reason: 'Critical severity no-show fee',
        severity: incident.severity
      });
    }

    return penalties;
  }

  private async executePenalty(userId: string, penalty: any): Promise<void> {
    // Implementation would depend on penalty type
    // For now, just logging the penalty application
    console.log(`Applied penalty to user ${userId}:`, penalty);
  }

  private generateRehabilitationProgram(
    programType: string,
    profile: NoShowProfile,
    customRequirements?: any
  ): any {
    const baseRequirements = [
      {
        requirement: 'reservation_confirmation_training',
        description: 'Complete training on proper reservation confirmation etiquette',
        completed: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      {
        requirement: 'reliability_commitment',
        description: 'Sign commitment letter to improve attendance reliability',
        completed: false,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    ];

    if (programType === 'intensive' || profile.totalNoShows >= 5) {
      baseRequirements.push({
        requirement: 'supervised_reservations',
        description: 'Complete 3 supervised reservations with 24h confirmation requirement',
        completed: false,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }

    return {
      type: programType,
      requirements: baseRequirements,
      estimatedDuration: programType === 'intensive' ? 30 : 14,
      createdAt: new Date()
    };
  }

  private generateUserRecommendations(
    profile: NoShowProfile | null,
    recentIncidents: NoShowIncident[]
  ): string[] {
    const recommendations = [];

    if (profile?.reliabilityScore && profile.reliabilityScore < 80) {
      recommendations.push('Consider setting calendar reminders for your reservations');
      recommendations.push('Enable SMS notifications for reservation confirmations');
    }

    if (profile?.noShowFrequency && profile.noShowFrequency > 1) {
      recommendations.push('Review your booking patterns - consider booking closer to your desired date');
    }

    if (recentIncidents.length > 0) {
      recommendations.push('Contact restaurant directly if you need to cancel - last-minute communication is appreciated');
    }

    return recommendations;
  }
}

export default NoShowTrackingService;
