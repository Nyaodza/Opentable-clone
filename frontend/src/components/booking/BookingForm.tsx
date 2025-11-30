'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface BookingFormProps {
  restaurantId: string;
  restaurantName: string;
  availableSlots?: string[];
  onSuccess?: (booking: any) => void;
}

interface FormData {
  date: string;
  time: string;
  partySize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
  occasionType: string;
  paymentRequired: boolean;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVC?: string;
  acceptTerms: boolean;
}

export default function BookingForm({ restaurantId, restaurantName, availableSlots = [], onSuccess }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>(availableSlots);

  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: 2,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
    occasionType: 'none',
    paymentRequired: false,
    acceptTerms: false
  });

  const occasions = [
    { value: 'none', label: 'Select an occasion (optional)' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'anniversary', label: 'Anniversary' },
    { value: 'date', label: 'Date Night' },
    { value: 'business', label: 'Business Meal' },
    { value: 'celebration', label: 'Celebration' }
  ];

  const checkAvailability = async () => {
    setCheckingAvailability(true);
    setError('');

    try {
      const response = await axios.get('/api/bookings/availability', {
        params: {
          restaurantId,
          date: formData.date,
          partySize: formData.partySize
        }
      });

      setAvailableTimes(response.data.data.availableSlots);

      if (response.data.data.availableSlots.length === 0) {
        setError('No tables available for this date and party size');
      } else {
        setStep(2);
      }
    } catch (err) {
      setError('Failed to check availability. Please try again.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const bookingData = {
        restaurantId,
        date: formData.date,
        time: formData.time,
        partySize: formData.partySize,
        guestName: `${formData.firstName} ${formData.lastName}`,
        guestEmail: formData.email,
        guestPhone: formData.phone,
        specialRequests: formData.specialRequests,
        occasionType: formData.occasionType !== 'none' ? formData.occasionType : undefined
      };

      const response = await axios.post('/api/bookings', bookingData);

      if (onSuccess) {
        onSuccess(response.data.data);
      } else {
        router.push(`/reservations/${response.data.data.id}/confirmation`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return formData.date !== '' && formData.partySize > 0;
      case 2:
        return formData.time !== '';
      case 3:
        return (
          formData.firstName !== '' &&
          formData.lastName !== '' &&
          formData.email !== '' &&
          formData.phone !== '' &&
          formData.acceptTerms
        );
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      if (step === 1) {
        checkAvailability();
      } else {
        setStep(step + 1);
      }
    }
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm ${step >= 1 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            Date & Party
          </span>
          <span className={`text-sm ${step >= 2 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            Time
          </span>
          <span className={`text-sm ${step >= 3 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            Details
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Restaurant Name */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Reserve a table at {restaurantName}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Date & Party Size */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarDaysIcon className="inline h-5 w-5 mr-1" />
              Select Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserGroupIcon className="inline h-5 w-5 mr-1" />
              Party Size
            </label>
            <select
              value={formData.partySize}
              onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(size => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Occasion? (Optional)
            </label>
            <select
              value={formData.occasionType}
              onChange={(e) => setFormData({ ...formData, occasionType: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {occasions.map(occasion => (
                <option key={occasion.value} value={occasion.value}>
                  {occasion.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={nextStep}
            disabled={!validateStep(1) || checkingAvailability}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {checkingAvailability ? 'Checking Availability...' : 'Check Availability'}
          </button>
        </div>
      )}

      {/* Step 2: Time Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              <ClockIcon className="inline h-5 w-5 mr-1" />
              Available Times for {new Date(formData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </label>

            {availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {availableTimes.map(time => (
                  <button
                    key={time}
                    onClick={() => setFormData({ ...formData, time })}
                    className={`px-4 py-3 border rounded-lg transition-colors ${
                      formData.time === time
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                No available times for this date. Please select a different date.
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={prevStep}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!validateStep(2)}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Guest Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EnvelopeIcon className="inline h-5 w-5 mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <PhoneIcon className="inline h-5 w-5 mr-1" />
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests (Optional)
            </label>
            <textarea
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Allergies, dietary restrictions, special occasions..."
            />
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {new Date(formData.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{formData.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Party Size:</span>
                <span className="font-medium">
                  {formData.partySize} {formData.partySize === 1 ? 'Guest' : 'Guests'}
                </span>
              </div>
              {formData.occasionType !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Occasion:</span>
                  <span className="font-medium capitalize">{formData.occasionType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 mr-2 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the restaurant's <a href="/terms" className="text-red-600 hover:underline">cancellation policy</a> and <a href="/terms" className="text-red-600 hover:underline">terms of service</a>.
              I understand that my table will be held for 15 minutes past the reservation time.
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={prevStep}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!validateStep(3) || loading}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creating Reservation...' : 'Complete Reservation'}
            </button>
          </div>
        </div>
      )}

      {/* Information Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-start text-sm text-gray-600">
          <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400" />
          <p>
            Your reservation will be confirmed immediately. You'll receive a confirmation email with all the details.
            For any modifications or cancellations, please contact the restaurant directly or manage your booking online.
          </p>
        </div>
      </div>
    </div>
  );
}