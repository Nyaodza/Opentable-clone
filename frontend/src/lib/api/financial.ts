import { apiClient } from './client';
import {
  DriverPayoutCalculation,
  RestaurantCommission,
  FinancialTransaction,
  PayoutSchedule,
  EarningsReport,
  PeakPricing,
  SubscriptionPlan
} from '@/types/financial';

export const financialService = {
  // Driver Payments
  async calculateDriverPayout(orderId: string): Promise<DriverPayoutCalculation> {
    return await apiClient.post('/financial/driver/calculate-payout', {
      orderId
    });
  },

  async getDriverEarnings(driverId: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'paid';
  }): Promise<{
    earnings: DriverPayoutCalculation[];
    summary: {
      totalEarnings: number;
      pendingPayout: number;
      completedPayouts: number;
      averagePerDelivery: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);
    
    return await apiClient.get(`/financial/driver/${driverId}/earnings?${queryParams}`);
  },

  async processDriverPayout(driverId: string, amount: number): Promise<FinancialTransaction> {
    return await apiClient.post('/financial/driver/payout', {
      driverId,
      amount
    });
  },

  async updatePayoutSchedule(driverId: string, schedule: Partial<PayoutSchedule>): Promise<PayoutSchedule> {
    return await apiClient.patch(`/financial/driver/${driverId}/payout-schedule`, schedule);
  },

  // Restaurant Commissions
  async calculateRestaurantCommission(orderId: string): Promise<RestaurantCommission> {
    return await apiClient.post('/financial/restaurant/calculate-commission', {
      orderId
    });
  },

  async getRestaurantEarnings(restaurantId: string, params?: {
    startDate?: string;
    endDate?: string;
    type?: 'delivery' | 'reservation';
  }): Promise<{
    commissions: RestaurantCommission[];
    summary: {
      grossRevenue: number;
      commissionsPaid: number;
      netEarnings: number;
      averageOrderValue: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);
    
    return await apiClient.get(`/financial/restaurant/${restaurantId}/earnings?${queryParams}`);
  },

  async processRestaurantPayout(restaurantId: string, amount: number): Promise<FinancialTransaction> {
    return await apiClient.post('/financial/restaurant/payout', {
      restaurantId,
      amount
    });
  },

  // Subscription Management
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await apiClient.get('/financial/subscriptions/plans');
  },

  async createSubscription(restaurantId: string, planId: string): Promise<{
    subscriptionId: string;
    status: string;
    nextBillingDate: string;
  }> {
    return await apiClient.post('/financial/subscriptions/create', {
      restaurantId,
      planId
    });
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await apiClient.post(`/financial/subscriptions/${subscriptionId}/cancel`);
  },

  async upgradeSubscription(subscriptionId: string, newPlanId: string): Promise<void> {
    await apiClient.post(`/financial/subscriptions/${subscriptionId}/upgrade`, {
      planId: newPlanId
    });
  },

  // Peak Pricing
  async getPeakPricing(): Promise<PeakPricing[]> {
    return await apiClient.get('/financial/peak-pricing');
  },

  async createPeakPricing(peakPricing: Omit<PeakPricing, 'id'>): Promise<PeakPricing> {
    return await apiClient.post('/financial/peak-pricing', peakPricing);
  },

  async updatePeakPricing(id: string, updates: Partial<PeakPricing>): Promise<PeakPricing> {
    return await apiClient.patch(`/financial/peak-pricing/${id}`, updates);
  },

  async deletePeakPricing(id: string): Promise<void> {
    await apiClient.delete(`/financial/peak-pricing/${id}`);
  },

  // Transaction Management
  async getTransactions(params?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: FinancialTransaction[];
    total: number;
    summary: {
      totalAmount: number;
      pendingAmount: number;
      completedAmount: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return await apiClient.get(`/financial/transactions?${queryParams}`);
  },

  async getTransaction(transactionId: string): Promise<FinancialTransaction> {
    return await apiClient.get(`/financial/transactions/${transactionId}`);
  },

  async retryFailedTransaction(transactionId: string): Promise<FinancialTransaction> {
    return await apiClient.post(`/financial/transactions/${transactionId}/retry`);
  },

  // Reporting & Analytics
  async getEarningsReport(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;
    restaurantId?: string;
    driverId?: string;
  }): Promise<EarningsReport> {
    return await apiClient.post('/financial/reports/earnings', params);
  },

  async getRevenueAnalytics(params: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    revenue: Array<{
      date: string;
      reservations: number;
      delivery: number;
      subscriptions: number;
      total: number;
    }>;
    growth: {
      reservations: number; // percentage growth
      delivery: number;
      subscriptions: number;
      total: number;
    };
  }> {
    return await apiClient.post('/financial/analytics/revenue', params);
  },

  async getDriverPayoutAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalPayouts: number;
    averageEarningsPerDriver: number;
    averageEarningsPerDelivery: number;
    topEarners: Array<{
      driverId: string;
      name: string;
      earnings: number;
      deliveries: number;
    }>;
    payoutTrends: Array<{
      date: string;
      amount: number;
      deliveries: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    return await apiClient.get(`/financial/analytics/driver-payouts?${queryParams}`);
  },

  // Payment Methods
  async addPaymentMethod(params: {
    type: 'bank_account' | 'debit_card' | 'paypal';
    accountDetails: Record<string, string>;
    isDefault?: boolean;
  }): Promise<{ paymentMethodId: string }> {
    return await apiClient.post('/financial/payment-methods', params);
  },

  async getPaymentMethods(): Promise<Array<{
    id: string;
    type: string;
    lastFour: string;
    isDefault: boolean;
    isVerified: boolean;
  }>> {
    return await apiClient.get('/financial/payment-methods');
  },

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await apiClient.delete(`/financial/payment-methods/${paymentMethodId}`);
  },

  // Tax and Compliance
  async generateTaxDocument(params: {
    year: number;
    type: '1099' | 'summary';
    recipientId: string;
    recipientType: 'driver' | 'restaurant';
  }): Promise<{ documentUrl: string }> {
    return await apiClient.post('/financial/tax/generate-document', params);
  },

  async getTaxSummary(params: {
    year: number;
    recipientId: string;
    recipientType: 'driver' | 'restaurant';
  }): Promise<{
    totalEarnings: number;
    totalFees: number;
    taxableIncome: number;
    documentsGenerated: string[];
  }> {
    return await apiClient.post('/financial/tax/summary', params);
  },

  // Platform Fees and Settings
  async updateCommissionRates(restaurantId: string, rates: {
    reservationCommission?: number;
    deliveryCommission?: number;
  }): Promise<void> {
    await apiClient.patch(`/financial/restaurants/${restaurantId}/commission-rates`, rates);
  },

  async getPlatformSettings(): Promise<{
    defaultCommissionRates: {
      reservation: number;
      delivery: number;
    };
    paymentProcessingFees: {
      percentage: number;
      fixedFee: number;
    };
    driverPayStructure: {
      basePay: number;
      distanceRate: number;
      timeRate: number;
    };
  }> {
    return await apiClient.get('/financial/platform/settings');
  }
};

export default financialService;