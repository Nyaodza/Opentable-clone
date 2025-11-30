'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentDetails {
  amount: number;
  currency: string;
  description: string;
  reservationId?: string;
  metadata?: Record<string, string>;
}

interface PaymentFormProps {
  paymentDetails: PaymentDetails;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

function CheckoutForm({ paymentDetails, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card information is required');
      setIsLoading(false);
      return;
    }

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          description: paymentDetails.description,
          metadata: {
            reservationId: paymentDetails.reservationId || '',
            ...paymentDetails.metadata,
          },
        }),
      });

      const { client_secret, error: serverError } = await response.json();

      if (serverError) {
        setError(serverError);
        setIsLoading(false);
        return;
      }

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Customer', // TODO: Get from form or user data
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        onError(stripeError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border rounded-md">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ${(paymentDetails.amount / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Service Fee:</span>
              <span className="font-medium">$2.50</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold">
                  ${((paymentDetails.amount + 250) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || isLoading}
          >
            {isLoading ? 'Processing...' : `Pay $${((paymentDetails.amount + 250) / 100).toFixed(2)}`}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your payment information is secure and encrypted. We use Stripe to process payments.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}

// Payment success component
export function PaymentSuccess({ 
  paymentIntent, 
  onContinue 
}: { 
  paymentIntent: any; 
  onContinue: () => void;
}) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your payment of ${(paymentIntent.amount / 100).toFixed(2)} has been processed successfully.
          </p>
          <div className="bg-gray-50 p-4 rounded-md mb-4 text-left">
            <div className="text-sm space-y-1">
              <div><strong>Payment ID:</strong> {paymentIntent.id}</div>
              <div><strong>Amount:</strong> ${(paymentIntent.amount / 100).toFixed(2)}</div>
              <div><strong>Status:</strong> {paymentIntent.status}</div>
            </div>
          </div>
          <Button onClick={onContinue} className="w-full">
            Continue to Confirmation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Refund component for restaurant owners
export function RefundForm({ 
  paymentIntentId, 
  maxAmount, 
  onSuccess, 
  onError 
}: {
  paymentIntentId: string;
  maxAmount: number;
  onSuccess: (refund: any) => void;
  onError: (error: string) => void;
}) {
  const [amount, setAmount] = useState(maxAmount);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          amount,
          reason,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess(result.refund);
      } else {
        onError(result.error || 'Refund failed');
      }
    } catch (error) {
      onError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Process Refund</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRefund} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Refund Amount</label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <input
                type="number"
                min="0"
                max={maxAmount / 100}
                step="0.01"
                value={amount / 100}
                onChange={(e) => setAmount(Math.round(parseFloat(e.target.value) * 100))}
                className="flex-1 p-2 border rounded"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum refundable: ${(maxAmount / 100).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded h-20"
              placeholder="Reason for refund..."
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Processing Refund...' : 'Process Refund'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
