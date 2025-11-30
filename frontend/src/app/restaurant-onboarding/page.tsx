'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  PhotoIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  required: boolean;
}

export default function RestaurantOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');

  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (restaurantId) {
      loadOnboarding();
    }
  }, [restaurantId]);

  const loadOnboarding = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/restaurant-onboarding/${restaurantId}/checklist`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setSteps(data.data.steps);
        const firstIncomplete = data.data.steps.findIndex((s: OnboardingStep) => !s.complete);
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);

        const completed = data.data.steps.filter((s: OnboardingStep) => s.complete).length;
        setProgress((completed / data.data.steps.length) * 100);
      }
    } catch (error) {
      console.error('Failed to load onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeStep = async (stepId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/restaurant-onboarding/${restaurantId}/step/${stepId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        await loadOnboarding();
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Setup</h1>
          <p className="text-gray-600 mb-6">
            Complete these steps to list your restaurant on OpenTable
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  step.complete
                    ? 'border-green-500 bg-green-50'
                    : currentStep === index
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  {step.complete ? (
                    <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-700">{step.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentStepData?.title}</h2>
              <p className="text-gray-600">{currentStepData?.description}</p>
            </div>
            {currentStepData?.complete && (
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            )}
          </div>

          {/* Step-specific content */}
          {renderStepContent(currentStepData, completeStep, restaurantId!)}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800 mb-3">
                Our team is here to assist you with the onboarding process. Contact support anytime.
              </p>
              <button className="text-sm text-blue-600 hover:underline">
                Contact Support →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderStepContent(step: OnboardingStep | undefined, completeStep: Function, restaurantId: string) {
  if (!step) return null;

  switch (step.id) {
    case 'basicInfo':
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="The French Laundry"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine Type</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option>French</option>
                <option>Italian</option>
                <option>Japanese</option>
                <option>American</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option>$ (Under $15)</option>
                <option>$$ ($15-30)</option>
                <option>$$$ ($30-60)</option>
                <option>$$$$ ($60+)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              placeholder="6640 Washington Street"
            />
            <div className="grid grid-cols-3 gap-4">
              <input type="text" placeholder="City" className="px-4 py-2 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="State" className="px-4 py-2 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="ZIP" className="px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <button
            onClick={() => completeStep(step.id)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            Save & Continue
          </button>
        </div>
      );

    case 'hours':
      return (
        <div className="space-y-4">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-32">
                <label className="font-medium text-gray-700">{day}</label>
              </div>
              <input type="time" defaultValue="11:00" className="px-4 py-2 border border-gray-300 rounded-lg" />
              <span>to</span>
              <input type="time" defaultValue="22:00" className="px-4 py-2 border border-gray-300 rounded-lg" />
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm text-gray-600">Closed</span>
              </label>
            </div>
          ))}
          <button
            onClick={() => completeStep(step.id)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 mt-6"
          >
            Save & Continue
          </button>
        </div>
      );

    case 'tables':
      return (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4">Add Tables</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <input type="number" placeholder="Table Number" className="px-4 py-2 border rounded-lg" />
              <input type="number" placeholder="Capacity" className="px-4 py-2 border rounded-lg" />
              <button className="bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[2, 4, 6, 8].map((capacity) => (
              <div key={capacity} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-600 cursor-pointer">
                <p className="text-2xl font-bold text-gray-700">{capacity}</p>
                <p className="text-sm text-gray-500">person table</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => completeStep(step.id)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            Save & Continue
          </button>
        </div>
      );

    case 'photos':
      return (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-600 cursor-pointer">
            <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop photos here or click to browse</p>
            <p className="text-sm text-gray-500">Upload at least 3 high-quality photos</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
          </div>
          <button
            onClick={() => completeStep(step.id)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            Save & Continue
          </button>
        </div>
      );

    case 'payment':
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
            <CreditCardIcon className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Stripe</h3>
            <p className="opacity-90 mb-4">Set up payments to receive deposits and process transactions</p>
            <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100">
              Connect Stripe Account
            </button>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="font-semibold mb-3">What you'll need:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ Business name and tax ID</li>
              <li>✓ Bank account details</li>
              <li>✓ Business address</li>
            </ul>
          </div>
          <button
            onClick={() => completeStep(step.id)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            Complete Setup
          </button>
        </div>
      );

    default:
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Click "Save & Continue" to complete this step</p>
          <button
            onClick={() => completeStep(step.id)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700"
          >
            Save & Continue
          </button>
        </div>
      );
  }
}
