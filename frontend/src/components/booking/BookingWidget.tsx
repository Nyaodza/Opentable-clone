'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface BookingWidgetProps {
  restaurantId: string;
  restaurantName: string;
  className?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  tables: number;
}

export default function BookingWidget({ restaurantId, restaurantName, className = '' }: BookingWidgetProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  // Generate time options
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }).filter(t => {
    const hour = parseInt(t.split(':')[0]);
    return hour >= 11 && hour <= 22; // Restaurant hours 11am - 10pm
  });

  useEffect(() => {
    if (date && partySize) {
      checkAvailability();
    }
  }, [date, partySize]);

  const checkAvailability = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/bookings/availability', {
        params: {
          restaurantId,
          date,
          partySize
        }
      });

      const slots = response.data.data.timeSlots || [];
      setAvailableSlots(slots);

      // Auto-select first available slot
      const firstAvailable = slots.find((s: TimeSlot) => s.available);
      if (firstAvailable) {
        setSelectedTime(firstAvailable.time);
        setTime(firstAvailable.time);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFindTable = () => {
    if (!selectedTime && availableSlots.length > 0) {
      setShowTimeSlots(true);
      return;
    }

    // Navigate to booking page with parameters
    const params = new URLSearchParams({
      restaurantId,
      restaurantName,
      date,
      time: selectedTime || time,
      partySize: partySize.toString()
    });

    router.push(`/booking/new?${params}`);
  };

  const handleTimeSelect = (timeSlot: string) => {
    setSelectedTime(timeSlot);
    setTime(timeSlot);
    setShowTimeSlots(false);
  };

  const getAvailableCount = () => {
    return availableSlots.filter(s => s.available).length;
  };

  const getNearbyTimes = () => {
    const targetHour = parseInt(time.split(':')[0]);
    const targetMinute = parseInt(time.split(':')[1]);
    const targetTimeInMinutes = targetHour * 60 + targetMinute;

    return availableSlots
      .filter(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        const slotMinute = parseInt(slot.time.split(':')[1]);
        const slotTimeInMinutes = slotHour * 60 + slotMinute;
        const diff = Math.abs(slotTimeInMinutes - targetTimeInMinutes);
        return slot.available && diff <= 90; // Within 1.5 hours
      })
      .slice(0, 5);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Make a Reservation</h3>

      <div className="space-y-4">
        {/* Party Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Party Size
          </label>
          <div className="relative">
            <UserGroupIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <select
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value))}
              className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
              <option value="11">Larger party</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <div className="relative">
              <ClockIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none"
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Available Times Display */}
        {!loading && availableSlots.length > 0 && (
          <div>
            {getAvailableCount() > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  {getAvailableCount()} tables available
                </p>
                <div className="flex flex-wrap gap-2">
                  {getNearbyTimes().map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => handleTimeSelect(slot.time)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTime === slot.time
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  No tables available for this date and time. Try selecting a different time or date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span className="ml-2 text-sm text-gray-600">Checking availability...</span>
          </div>
        )}

        {/* Find Table Button */}
        <button
          onClick={handleFindTable}
          disabled={loading || (availableSlots.length > 0 && getAvailableCount() === 0)}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Checking...' : 'Find a Table'}
        </button>

        {/* Booked Info */}
        <div className="text-center text-sm text-gray-600">
          <p>🔥 Booked 12 times today</p>
        </div>
      </div>

      {/* Restaurant Policies */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Dining Details</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>Instant confirmation</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>Free cancellation up to 2 hours before</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>Earn loyalty points with this booking</span>
          </li>
        </ul>
      </div>

      {/* Special Events */}
      {partySize >= 6 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Large Party:</strong> For parties of 6 or more, please call the restaurant directly at (555) 123-4567 for special arrangements.
          </p>
        </div>
      )}
    </div>
  );
}