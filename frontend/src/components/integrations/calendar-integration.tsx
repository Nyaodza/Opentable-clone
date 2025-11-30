'use client';

import React, { useState } from 'react';
import { useCalendarProviders, useAddToCalendar, calendarService, type CalendarEvent, type CalendarProvider } from '@/lib/integrations/calendar';

interface AddToCalendarProps {
  event: CalendarEvent;
  className?: string;
}

export function AddToCalendar({ event, className = '' }: AddToCalendarProps) {
  const providers = useCalendarProviders();
  const { addToCalendar, loading, error } = useAddToCalendar();
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider['id'] | null>(null);
  const [showProviders, setShowProviders] = useState(false);

  const handleAddToCalendar = async (providerId: CalendarProvider['id']) => {
    try {
      await addToCalendar(event, providerId);
      setShowProviders(false);
    } catch (error) {
      console.error('Failed to add to calendar:', error);
    }
  };

  const getProviderIcon = (providerId: CalendarProvider['id']) => {
    const icons = {
      google: '📅',
      outlook: '📆',
      apple: '🍎',
      yahoo: '📋',
      ics: '📄',
    };
    return icons[providerId] || '📅';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowProviders(!showProviders)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span className="text-lg">📅</span>
        Add to Calendar
      </button>

      {showProviders && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-48">
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-900 mb-2 px-2">Choose Calendar</h3>
            <div className="space-y-1">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleAddToCalendar(provider.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  <span className="text-lg">{getProviderIcon(provider.id)}</span>
                  <span>{provider.name}</span>
                  {provider.requiresAuth && (
                    <span className="text-xs text-gray-500">Auth required</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          <p className="text-sm">Adding to calendar...</p>
        </div>
      )}
    </div>
  );
}

interface ReservationCalendarProps {
  reservation: {
    restaurantName: string;
    date: string;
    time: string;
    partySize: number;
    confirmationCode: string;
    restaurantAddress?: string;
    restaurantPhone?: string;
    specialRequests?: string;
  };
  className?: string;
}

export function ReservationCalendar({ reservation, className = '' }: ReservationCalendarProps) {
  const event = calendarService.createReservationEvent(reservation);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Save Reservation</h3>
        <AddToCalendar event={event} />
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-lg">🍽️</span>
          <div>
            <p className="font-medium text-gray-900">{reservation.restaurantName}</p>
            {reservation.restaurantAddress && (
              <p className="text-sm text-gray-600">{reservation.restaurantAddress}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg">📅</span>
          <p className="text-gray-700">
            {new Date(reservation.date).toLocaleDateString()} at {reservation.time}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg">👥</span>
          <p className="text-gray-700">Party of {reservation.partySize}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg">🎫</span>
          <p className="text-gray-700">Confirmation: {reservation.confirmationCode}</p>
        </div>

        {reservation.restaurantPhone && (
          <div className="flex items-center gap-3">
            <span className="text-lg">📞</span>
            <a
              href={`tel:${reservation.restaurantPhone}`}
              className="text-blue-600 hover:text-blue-700"
            >
              {reservation.restaurantPhone}
            </a>
          </div>
        )}

        {reservation.specialRequests && (
          <div className="flex items-start gap-3">
            <span className="text-lg">📝</span>
            <p className="text-gray-700">{reservation.specialRequests}</p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 Adding this to your calendar will set up a reminder 1 hour before your reservation.
        </p>
      </div>
    </div>
  );
}

interface CalendarEventFormProps {
  onEventCreate: (event: CalendarEvent) => void;
  initialEvent?: Partial<CalendarEvent>;
  className?: string;
}

export function CalendarEventForm({ onEventCreate, initialEvent, className = '' }: CalendarEventFormProps) {
  const [formData, setFormData] = useState({
    title: initialEvent?.title || '',
    description: initialEvent?.description || '',
    location: initialEvent?.location || '',
    start: initialEvent?.start ? new Date(initialEvent.start).toISOString().slice(0, 16) : '',
    end: initialEvent?.end ? new Date(initialEvent.end).toISOString().slice(0, 16) : '',
    reminderMinutes: 60,
    isRecurring: false,
    recurrenceFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    recurrenceCount: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const event: CalendarEvent = {
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      start: new Date(formData.start),
      end: new Date(formData.end),
      reminder: {
        method: 'popup',
        minutes: formData.reminderMinutes,
      },
    };

    if (formData.isRecurring) {
      event.recurrence = {
        frequency: formData.recurrenceFrequency,
        count: formData.recurrenceCount,
      };
    }

    onEventCreate(event);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Create Calendar Event</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reminder (minutes before)
          </label>
          <select
            value={formData.reminderMinutes}
            onChange={(e) => setFormData(prev => ({ ...prev, reminderMinutes: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>No reminder</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={1440}>1 day</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Recurring event</span>
          </label>
        </div>

        {formData.isRecurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.recurrenceFrequency}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  recurrenceFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of occurrences
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.recurrenceCount}
                onChange={(e) => setFormData(prev => ({ ...prev, recurrenceCount: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Event
        </button>
      </form>
    </div>
  );
}

interface QuickCalendarActionsProps {
  reservation?: {
    restaurantName: string;
    date: string;
    time: string;
    partySize: number;
    confirmationCode: string;
  };
  delivery?: {
    restaurantName: string;
    orderNumber: string;
    estimatedDeliveryTime: string;
    deliveryAddress: string;
    items: string[];
  };
  className?: string;
}

export function QuickCalendarActions({ reservation, delivery, className = '' }: QuickCalendarActionsProps) {
  const providers = useCalendarProviders();
  const [showActions, setShowActions] = useState(false);

  const generateCalendarUrls = () => {
    let event: CalendarEvent;

    if (reservation) {
      event = calendarService.createReservationEvent(reservation);
    } else if (delivery) {
      event = calendarService.createDeliveryEvent(delivery);
    } else {
      return {};
    }

    return calendarService.generateCalendarUrls(event);
  };

  const urls = generateCalendarUrls();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowActions(!showActions)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <span>📅</span>
        Save to Calendar
      </button>

      {showActions && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-40">
          <div className="p-2">
            {Object.entries(urls).map(([provider, url]) => (
              <a
                key={provider}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {provider === 'google' && '📅 Google Calendar'}
                {provider === 'outlook' && '📆 Outlook'}
                {provider === 'yahoo' && '📋 Yahoo Calendar'}
              </a>
            ))}
            <button
              onClick={() => {
                let event: CalendarEvent;
                if (reservation) {
                  event = calendarService.createReservationEvent(reservation);
                } else if (delivery) {
                  event = calendarService.createDeliveryEvent(delivery);
                } else {
                  return;
                }
                calendarService.addToCalendar(event, 'ics');
                setShowActions(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              📄 Download .ics file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}