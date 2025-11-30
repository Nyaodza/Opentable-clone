'use client';

import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement,
} from '@stripe/react-stripe-js';
import { LoadingSpinner } from '@/components/common/loading';

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  amount: number;
  currency?: string;
  customerEmail?: string;
  requiresBillingAddress?: boolean;
  className?: string;
}

export function PaymentForm({
  onSuccess,
  onError,
  amount,
  currency = 'usd',
  customerEmail,
  requiresBillingAddress = true,
  className = '',
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/complete`,
          receipt_email: customerEmail,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred while processing your payment.');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      onError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-xl font-bold text-gray-900">
            {formatAmount(amount, currency)}
          </span>
        </div>
      </div>

      {/* Payment Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <PaymentElement
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: true,
              },
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
            }}
          />
        </div>
      </div>

      {/* Billing Address */}
      {requiresBillingAddress && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Billing Address
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <AddressElement
              options={{
                mode: 'billing',
                allowedCountries: ['US', 'CA', 'GB', 'AU'],
                blockPoBox: true,
                fields: {
                  phone: 'always',
                },
                validation: {
                  phone: {
                    required: 'never',
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !stripe || !elements || isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
        }`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" color="white" className="mr-2" />
            Processing Payment...
          </div>
        ) : (
          `Pay ${formatAmount(amount, currency)}`
        )}
      </button>

      {/* Security Notice */}
      <div className="flex items-center justify-center text-xs text-gray-500">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-9a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2zm10-12V6a4 4 0 00-8 0v3h8z" />
        </svg>
        <span>Your payment information is secure and encrypted</span>
      </div>
    </form>
  );
}

// Payment Method Selection Component
interface PaymentMethodSelectorProps {
  paymentMethods: Array<{
    id: string;
    type: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
  }>;
  selectedMethodId: string;
  onMethodSelect: (methodId: string) => void;
  onAddNew: () => void;
  className?: string;
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedMethodId,
  onMethodSelect,
  onAddNew,
  className = '',
}: PaymentMethodSelectorProps) {
  const getCardIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Select Payment Method
      </label>
      
      <div className="space-y-2">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedMethodId === method.id
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedMethodId === method.id}
              onChange={(e) => onMethodSelect(e.target.value)}
              className="text-red-600 focus:ring-red-500"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCardIcon(method.brand || '')}</span>
                <span className="font-medium text-gray-900">
                  {method.brand?.toUpperCase()} •••• {method.last4}
                </span>
                {method.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    Default
                  </span>
                )}
              </div>
              {method.expiryMonth && method.expiryYear && (
                <p className="text-sm text-gray-500">
                  Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                </p>
              )}
            </div>
          </label>
        ))}
        
        <button
          type="button"
          onClick={onAddNew}
          className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Payment Method
        </button>
      </div>
    </div>
  );
}