'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface Booking {
  id: string;
  userId: string;
  restaurantId: string;
  tableId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  restaurantName: string;
  tableName: string;
  date: string;
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  specialRequests?: string;
  totalAmount?: number;
  depositPaid?: boolean;
  createdAt: string;
}

interface BookingManagementProps {
  restaurantId?: string;
  isAdmin?: boolean;
}

export default function BookingManagement({ restaurantId, isAdmin = false }: BookingManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    seated: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    'no-show': 'bg-orange-100 text-orange-800'
  };

  const statusIcons = {
    pending: ExclamationCircleIcon,
    confirmed: CheckCircleIcon,
    seated: UserGroupIcon,
    completed: CheckCircleIcon,
    cancelled: XCircleIcon,
    'no-show': XCircleIcon
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, statusFilter, restaurantId]);

  const fetchBookings = async () => {
    try {
      let url = '/api/bookings';
      const params = new URLSearchParams();

      if (restaurantId) {
        params.append('restaurantId', restaurantId);
      }
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await axios.get(`${url}?${params.toString()}`);
      setBookings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await axios.patch(`/api/bookings/${bookingId}/status`, { status: newStatus });

      setBookings(prev => prev.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus as Booking['status'] } : booking
      ));

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus as Booking['status'] });
      }
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await axios.delete(`/api/bookings/${bookingId}`);
      setBookings(prev => prev.map(booking =>
        booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
      ));
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        booking.userName.toLowerCase().includes(search) ||
        booking.userEmail.toLowerCase().includes(search) ||
        booking.userPhone.includes(search)
      );
    }
    return true;
  });

  const getTimeSlots = () => {
    const slots = new Set(bookings.map(b => b.time));
    return Array.from(slots).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="seated">Seated</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'pending').length}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Total Guests</p>
            <p className="text-2xl font-bold text-blue-600">
              {bookings.reduce((sum, b) => sum + b.partySize, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline View</h3>

        <div className="overflow-x-auto">
          <div className="min-w-full">
            {getTimeSlots().map(timeSlot => {
              const slotBookings = filteredBookings.filter(b => b.time === timeSlot);
              if (slotBookings.length === 0) return null;

              return (
                <div key={timeSlot} className="mb-6">
                  <div className="flex items-center mb-3">
                    <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="font-semibold text-gray-900">{timeSlot}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({slotBookings.length} bookings)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slotBookings.map(booking => {
                      const StatusIcon = statusIcons[booking.status];

                      return (
                        <div
                          key={booking.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetails(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{booking.userName}</h4>
                              <p className="text-sm text-gray-600">Table: {booking.tableName}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                              {booking.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <UserGroupIcon className="h-4 w-4 mr-1" />
                              {booking.partySize} guests
                            </div>
                            <div className="flex items-center">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {booking.userPhone}
                            </div>
                            {booking.specialRequests && (
                              <p className="text-xs italic mt-2">"{booking.specialRequests}"</p>
                            )}
                          </div>

                          {booking.status === 'pending' && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(booking.id, 'confirmed');
                                }}
                                className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelBooking(booking.id);
                                }}
                                className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(booking.id, 'seated');
                              }}
                              className="w-full mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Mark as Seated
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredBookings.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No bookings found for the selected criteria
          </p>
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Booking Details</h3>

            <div className="space-y-4">
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedBooking.status]}`}>
                  {selectedBooking.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Guest Name</label>
                  <p className="text-gray-900">{selectedBooking.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Party Size</label>
                  <p className="text-gray-900">{selectedBooking.partySize} guests</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-gray-900">{selectedBooking.date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <p className="text-gray-900">{selectedBooking.time}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedBooking.userEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedBooking.userPhone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Table</label>
                  <p className="text-gray-900">{selectedBooking.tableName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Restaurant</label>
                  <p className="text-gray-900">{selectedBooking.restaurantName}</p>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special Requests</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {selectedBooking.depositPaid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deposit</label>
                  <p className="text-green-600 font-semibold">
                    ${selectedBooking.totalAmount ? (selectedBooking.totalAmount * 0.2).toFixed(2) : '0.00'} paid
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedBooking.id, status)}
                      disabled={selectedBooking.status === status}
                      className={`px-3 py-2 rounded text-sm ${
                        selectedBooking.status === status
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedBooking(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
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