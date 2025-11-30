'use client';

import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
  options?: StripeElementsOptions;
}

export function StripeProvider({ children, clientSecret, options }: StripeProviderProps) {
  const elementsOptions: StripeElementsOptions = {
    ...(clientSecret && { clientSecret }),
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#dc2626', // red-600
        colorBackground: '#ffffff',
        colorText: '#1f2937', // gray-800
        colorDanger: '#ef4444', // red-500
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Tab': {
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
        },
        '.Tab:hover': {
          backgroundColor: '#f9fafb',
        },
        '.Tab--selected': {
          borderColor: '#dc2626',
          backgroundColor: '#fef2f2',
        },
        '.Input': {
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          padding: '12px',
        },
        '.Input:focus': {
          borderColor: '#dc2626',
          boxShadow: '0 0 0 1px #dc2626',
        },
        '.Label': {
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        },
      },
    },
    ...options,
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
}