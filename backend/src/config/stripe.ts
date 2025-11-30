import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-08-16',
});

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: {
    reservationId: string;
    restaurantId: string;
    userId: string;
  };
}

export const createPaymentIntent = async (params: CreatePaymentIntentParams) => {
  const { amount, currency = 'usd', customerId, metadata } = params;

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
};

export const createCustomer = async (email: string, name: string) => {
  return await stripe.customers.create({
    email,
    name,
  });
};

export const refundPayment = async (paymentIntentId: string, amount?: number) => {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
};

export const createCheckoutSession = async (params: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  metadata?: any;
}) => {
  return await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: params.lineItems,
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });
};

// Webhook handler for Stripe events
export const handleStripeWebhook = async (
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }
};