import { apiClient } from './client';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  reservationId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  paymentMethodId: string;
  reservationId?: string;
  refundAmount?: number;
  failureReason?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  paymentTransactionId: string;
  amount?: number; // Partial refund if specified
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'subscription_canceled' | 'other';
  metadata?: Record<string, string>;
}

export interface Refund {
  id: string;
  paymentTransactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface SetupIntent {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  paymentMethodId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  plan: SubscriptionPlan;
  paymentMethodId?: string;
  latestInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistory {
  transactions: PaymentTransaction[];
  subscriptions: Subscription[];
  total: number;
  page: number;
  totalPages: number;
}

export const paymentService = {
  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await apiClient.get('/payments/methods');
  },

  async addPaymentMethod(setupIntentId: string): Promise<PaymentMethod> {
    return await apiClient.post('/payments/methods', { setupIntentId });
  },

  async removePaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return await apiClient.delete(`/payments/methods/${paymentMethodId}`);
  },

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return await apiClient.post(`/payments/methods/${paymentMethodId}/default`);
  },

  async updatePaymentMethod(paymentMethodId: string, data: {
    billingAddress?: PaymentMethod['billingAddress'];
    expiryMonth?: number;
    expiryYear?: number;
  }): Promise<PaymentMethod> {
    return await apiClient.patch(`/payments/methods/${paymentMethodId}`, data);
  },

  // Setup Intents (for adding payment methods)
  async createSetupIntent(): Promise<SetupIntent> {
    return await apiClient.post('/payments/setup-intent');
  },

  async confirmSetupIntent(setupIntentId: string): Promise<SetupIntent> {
    return await apiClient.post(`/payments/setup-intent/${setupIntentId}/confirm`);
  },

  // Payment Intents (for one-time payments)
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    return await apiClient.post('/payments/intent', data);
  },

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentIntent> {
    return await apiClient.post(`/payments/intent/${paymentIntentId}/confirm`, {
      paymentMethodId
    });
  },

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    return await apiClient.post(`/payments/intent/${paymentIntentId}/cancel`);
  },

  // Transactions
  async getTransaction(transactionId: string): Promise<PaymentTransaction> {
    return await apiClient.get(`/payments/transactions/${transactionId}`);
  },

  async getUserTransactions(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: PaymentTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/payments/transactions', params);
  },

  // Refunds
  async requestRefund(data: RefundRequest): Promise<Refund> {
    return await apiClient.post('/payments/refunds', data);
  },

  async getRefund(refundId: string): Promise<Refund> {
    return await apiClient.get(`/payments/refunds/${refundId}`);
  },

  async getUserRefunds(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    refunds: Refund[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/payments/refunds', params);
  },

  // Subscriptions
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await apiClient.get('/payments/subscription-plans');
  },

  async createSubscription(planId: string, paymentMethodId?: string): Promise<Subscription> {
    return await apiClient.post('/payments/subscriptions', {
      planId,
      paymentMethodId
    });
  },

  async getUserSubscription(): Promise<Subscription | null> {
    return await apiClient.get('/payments/subscriptions/current');
  },

  async updateSubscription(subscriptionId: string, data: {
    planId?: string;
    paymentMethodId?: string;
  }): Promise<Subscription> {
    return await apiClient.patch(`/payments/subscriptions/${subscriptionId}`, data);
  },

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Subscription> {
    return await apiClient.post(`/payments/subscriptions/${subscriptionId}/cancel`, {
      cancelAtPeriodEnd
    });
  },

  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    return await apiClient.post(`/payments/subscriptions/${subscriptionId}/reactivate`);
  },

  // Billing
  async getBillingHistory(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<BillingHistory> {
    return await apiClient.get('/payments/billing/history', params);
  },

  async downloadInvoice(invoiceId: string): Promise<{ downloadUrl: string }> {
    return await apiClient.get(`/payments/billing/invoices/${invoiceId}/download`);
  },

  async getUpcomingInvoice(): Promise<{
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    items: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  } | null> {
    return await apiClient.get('/payments/billing/upcoming-invoice');
  },

  // Webhooks (for admin)
  async verifyWebhook(payload: string, signature: string): Promise<{ verified: boolean; event?: any }> {
    return await apiClient.post('/payments/webhooks/verify', {
      payload,
      signature
    });
  },

  // Payment Analytics (for restaurants/admin)
  async getPaymentAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    restaurantId?: string;
  }): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionAmount: number;
    refundRate: number;
    popularPaymentMethods: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
  }> {
    return await apiClient.get('/payments/analytics', params);
  },

  // Gift Cards
  async createGiftCard(data: {
    amount: number;
    recipientEmail?: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    deliveryDate?: string;
  }): Promise<{
    id: string;
    code: string;
    amount: number;
    balance: number;
    expiryDate: string;
  }> {
    return await apiClient.post('/payments/gift-cards', data);
  },

  async getGiftCard(code: string): Promise<{
    id: string;
    code: string;
    amount: number;
    balance: number;
    expiryDate: string;
    isActive: boolean;
  }> {
    return await apiClient.get(`/payments/gift-cards/${code}`);
  },

  async applyGiftCard(code: string, amount: number): Promise<{
    success: boolean;
    remainingBalance: number;
    appliedAmount: number;
  }> {
    return await apiClient.post('/payments/gift-cards/apply', {
      code,
      amount
    });
  },

  // Loyalty Points
  async getLoyaltyBalance(): Promise<{
    points: number;
    tier: string;
    nextTierPoints: number;
    cashValue: number;
  }> {
    return await apiClient.get('/payments/loyalty/balance');
  },

  async redeemLoyaltyPoints(points: number): Promise<{
    success: boolean;
    cashValue: number;
    remainingPoints: number;
  }> {
    return await apiClient.post('/payments/loyalty/redeem', { points });
  },

  // Saved Payment Preferences
  async getPaymentPreferences(): Promise<{
    defaultPaymentMethodId?: string;
    autoSavePaymentMethods: boolean;
    enableLoyaltyRedemption: boolean;
    preferredCurrency: string;
  }> {
    return await apiClient.get('/payments/preferences');
  },

  async updatePaymentPreferences(preferences: {
    defaultPaymentMethodId?: string;
    autoSavePaymentMethods?: boolean;
    enableLoyaltyRedemption?: boolean;
    preferredCurrency?: string;
  }): Promise<{ success: boolean }> {
    return await apiClient.patch('/payments/preferences', preferences);
  },

  // Tax Calculations
  async calculateTax(data: {
    amount: number;
    restaurantId: string;
    state: string;
    city?: string;
  }): Promise<{
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    total: number;
    breakdown: Array<{
      type: string;
      rate: number;
      amount: number;
    }>;
  }> {
    return await apiClient.post('/payments/tax/calculate', data);
  },

  // Dispute Management
  async getDisputes(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    disputes: Array<{
      id: string;
      paymentTransactionId: string;
      amount: number;
      currency: string;
      reason: string;
      status: string;
      createdAt: string;
      evidence?: any;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/payments/disputes', params);
  },

  async submitDisputeEvidence(disputeId: string, evidence: {
    receipt?: string;
    customerCommunication?: string;
    refundPolicy?: string;
    cancellationPolicy?: string;
    additionalDocumentation?: string[];
  }): Promise<{ success: boolean }> {
    return await apiClient.post(`/payments/disputes/${disputeId}/evidence`, evidence);
  },
};