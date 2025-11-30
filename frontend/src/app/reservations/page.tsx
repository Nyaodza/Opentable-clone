'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { reservationService } from '@/lib/api/reservation';
import { ErrorBoundary } from '@/components/common/error-boundary';

interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  date: string;
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmationCode: string;
  specialRequests?: string;
  createdAt: string;
  totalAmount?: number;
  depositPaid?: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
  no_show: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No Show',
};

export default function ReservationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'restaurant'>('date');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session?.user) {
      loadReservations();
    }
  }, [session, status, router]);

  const loadReservations = async () => {
    try {
      const response = await reservationService.getReservations();
      setReservations(response.data || []);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      // Use mock data for demo
      setReservations([
        {
          id: '1',
          restaurantId: 'rest1',
          restaurantName: 'The Modern',
          restaurantAddress: '9 W 53rd St, New York, NY',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          time: '7:00 PM',
          partySize: 2,
          status: 'confirmed',
          confirmationCode: 'MOD-7823',
          specialRequests: 'Anniversary dinner, quiet table please',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          totalAmount: 150,
          depositPaid: 50,
        },
        {
          id: '2',
          restaurantId: 'rest2',
          restaurantName: 'Le Bernardin',
          restaurantAddress: '155 West 51st St, New York, NY',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          time: '8:00 PM',
          partySize: 4,
          status: 'pending',
          confirmationCode: 'LEB-4521',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          restaurantId: 'rest3',
          restaurantName: 'Gramercy Tavern',
          restaurantAddress: '42 E 20th St, New York, NY',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          time: '6:30 PM',
          partySize: 3,
          status: 'completed',
          confirmationCode: 'GRA-9982',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      await reservationService.cancelReservation(reservationId);
      setReservations(prev =>
        prev.map(res =>
          res.id === reservationId ? { ...res, status: 'cancelled' } : res
        )
      );
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      alert('Failed to cancel reservation. Please try again.');
    }
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date();
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'upcoming') {
      return isUpcoming(reservation.date) && reservation.status !== 'cancelled';
    } else if (filter === 'past') {
      return !isUpcoming(reservation.date) || reservation.status === 'completed';
    }
    return true;
  });

  const sortedReservations = [...filteredReservations].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return a.restaurantName.localeCompare(b.restaurantName);
    }
  });

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
                <p className="text-gray-600 mt-1">
                  Manage your upcoming and past restaurant bookings
                </p>
              </div>
              <Link
                href="/restaurants"
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Make Reservation
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({reservations.length})
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'upcoming'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming ({reservations.filter(r => isUpcoming(r.date) && r.status !== 'cancelled').length})
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'past'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Past ({reservations.filter(r => !isUpcoming(r.date) || r.status === 'completed').length})
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="date">Sort by Date</option>
                <option value="restaurant">Sort by Restaurant</option>
              </select>
            </div>
          </div>

          {/* Reservations List */}
          {sortedReservations.length > 0 ? (
            <div className="space-y-4">
              {sortedReservations.map((reservation) => {
                const isPast = !isUpcoming(reservation.date);
                const canCancel = !isPast && ['pending', 'confirmed'].includes(reservation.status);
                const canModify = !isPast && reservation.status === 'confirmed';

                return (
                  <div
                    key={reservation.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Restaurant Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Link
                                href={`/restaurants/${reservation.restaurantId}`}
                                className="text-xl font-semibold text-gray-900 hover:text-red-600"
                              >
                                {reservation.restaurantName}
                              </Link>
                              <p className="text-sm text-gray-600">{reservation.restaurantAddress}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[reservation.status]}`}>
                              {statusLabels[reservation.status]}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Date</p>
                              <p className="font-medium text-gray-900">
                                {new Date(reservation.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Time</p>
                              <p className="font-medium text-gray-900">{reservation.time}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Party Size</p>
                              <p className="font-medium text-gray-900">{reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Confirmation</p>
                              <p className="font-medium text-gray-900">{reservation.confirmationCode}</p>
                            </div>
                          </div>

                          {reservation.specialRequests && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500">Special Requests</p>
                              <p className="text-sm text-gray-700">{reservation.specialRequests}</p>
                            </div>
                          )}

                          {reservation.totalAmount && (
                            <div className="flex items-center gap-4 text-sm">
                              {reservation.depositPaid && (
                                <span className="text-gray-600">
                                  Deposit paid: ${reservation.depositPaid}
                                </span>
                              )}
                              <span className="text-gray-600">
                                Total: ${reservation.totalAmount}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 md:ml-6">
                          <Link
                            href={`/reservations/${reservation.id}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm text-center"
                          >
                            View Details
                          </Link>
                          
                          {canModify && (
                            <Link
                              href={`/reservations/${reservation.id}/modify`}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm text-center"
                            >
                              Modify
                            </Link>
                          )}
                          
                          {canCancel && (
                            <button
                              onClick={() => handleCancelReservation(reservation.id)}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          )}
                          
                          {reservation.status === 'completed' && (
                            <Link
                              href={`/restaurants/${reservation.restaurantId}/review`}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm text-center"
                            >
                              Write Review
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Calendar Actions */}
                    {!isPast && reservation.status === 'confirmed' && (
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {(() => {
                                const daysUntil = Math.floor((new Date(reservation.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                if (daysUntil === 0) return 'Today';
                                if (daysUntil === 1) return 'Tomorrow';
                                return `In ${daysUntil} days`;
                              })()}
                            </span>
                          </p>
                          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                            Add to Calendar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">=Å</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' 
                  ? "You don't have any reservations yet" 
                  : `No ${filter} reservations`}
              </h2>
              <p className="text-gray-600 mb-6">
                Discover amazing restaurants and book your table today
              </p>
              <Link
                href="/restaurants"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Find a Restaurant
              </Link>
            </div>
          )}

          {/* Tips */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservation Tips</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-2xl mb-2">ð</div>
                <h3 className="font-medium mb-1">Arrive on Time</h3>
                <p className="text-sm text-gray-600">
                  Tables are typically held for 15 minutes past reservation time
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">=ñ</div>
                <h3 className="font-medium mb-1">Update Party Size</h3>
                <p className="text-sm text-gray-600">
                  Let the restaurant know if your party size changes
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">=«</div>
                <h3 className="font-medium mb-1">Cancel if Needed</h3>
                <p className="text-sm text-gray-600">
                  Free up tables for others by canceling unwanted reservations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}