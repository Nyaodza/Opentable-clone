'use client';

import React, { useState, useEffect } from 'react';
import { unifiedApiClient } from '@/lib/api/unified-client';
import { formatDate, formatTime } from '@/utils/format';

export default function RestaurantReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  useEffect(() => {
    loadReservations();
  }, [filter]);

  const loadReservations = async () => {
    try {
      const data = await unifiedApiClient.get(`/restaurant-owner/reservations?filter=${filter}`);
      setReservations(data.reservations);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (id: string, status: string) => {
    try {
      await unifiedApiClient.put(`/restaurant-owner/reservations/${id}`, { status });
      loadReservations();
    } catch (error) {
      console.error('Failed to update reservation:', error);
    }
  };

  const handleViewDetails = (reservation: any) => {
    setSelectedReservation(reservation);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <p className="text-gray-600">Manage your restaurant reservations</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-md ${filter === 'today' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-md ${filter === 'upcoming' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Pending
        </button>
      </div>

      {/* Reservations Table */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reservation ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{reservation.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{reservation.guestName}</div>
                      <div className="text-sm text-gray-500">{reservation.guestPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(reservation.dateTime)}</div>
                      <div>{formatTime(reservation.dateTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.partySize} guests
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.tableNumber || 'TBD'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        reservation.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(reservation)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View
                      </button>
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          onClick={() => updateReservationStatus(reservation.id, 'completed')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-lg font-semibold mb-4">Reservation Details</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Guest:</span> {selectedReservation.guestName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {selectedReservation.guestEmail}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {selectedReservation.guestPhone}
              </div>
              <div>
                <span className="font-medium">Date & Time:</span> {formatDate(selectedReservation.dateTime)} at {formatTime(selectedReservation.dateTime)}
              </div>
              <div>
                <span className="font-medium">Party Size:</span> {selectedReservation.partySize} guests
              </div>
              {selectedReservation.specialRequests && (
                <div>
                  <span className="font-medium">Special Requests:</span>
                  <p className="mt-1 text-gray-600">{selectedReservation.specialRequests}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedReservation(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}