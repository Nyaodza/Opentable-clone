'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { deliveryService } from '@/lib/api/delivery';
import { DeliveryOrder, Driver } from '@/types/delivery';

export default function DriverDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    loadDriverData();
    getCurrentLocation();
  }, []);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      // In a real app, get driver ID from auth
      const driverId = 'driver_001';
      const [driverData, ordersData] = await Promise.all([
        deliveryService.getDriver(driverId),
        deliveryService.getDriverOrders({ status: 'driver_assigned', limit: 10 })
      ]);
      setDriver(driverData);
      setOrders(ordersData.orders);
      setIsOnline(driverData.isOnline);
    } catch (error) {
      console.error('Failed to load driver data:', error);
      // For demo, use mock data
      setDriver(mockDriver);
      setOrders(mockOrders);
      setIsOnline(true);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      await deliveryService.setDriverAvailability(newStatus);
      setIsOnline(newStatus);
      
      if (newStatus && currentLocation) {
        // Update location when going online
        await deliveryService.updateDriverLocation(currentLocation);
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await deliveryService.acceptOrder(orderId);
      // Refresh orders
      loadDriverData();
    } catch (error) {
      console.error('Failed to accept order:', error);
    }
  };

  const rejectOrder = async (orderId: string) => {
    try {
      await deliveryService.rejectOrder(orderId, 'Driver unavailable');
      // Refresh orders
      loadDriverData();
    } catch (error) {
      console.error('Failed to reject order:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Account Not Found</h2>
          <p className="text-gray-600 mb-6">Please contact support or apply to become a driver.</p>
          <Link
            href="/driver/apply"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply to Drive
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-600">Welcome back, {driver.firstName}!</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {driver.firstName} {driver.lastName}
                </h2>
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-2">⭐ {driver.rating}</span>
                  <span className="text-gray-500">({driver.totalDeliveries} deliveries)</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(driver.earnings.today)}
                </div>
                <div className="text-sm text-gray-600">Today's Earnings</div>
              </div>
              
              <button
                onClick={toggleOnlineStatus}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isOnline
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {isOnline ? 'Online' : 'Go Online'}
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(driver.earnings.today)}
            </div>
            <div className="text-sm text-gray-600">Today</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(driver.earnings.week)}
            </div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(driver.earnings.month)}
            </div>
            <div className="text-sm text-gray-600">This Month</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {driver.totalDeliveries}
            </div>
            <div className="text-sm text-gray-600">Total Deliveries</div>
          </div>
        </div>

        {/* Online Status Message */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <span className="text-yellow-500 mr-3">⚠️</span>
              <div>
                <h3 className="font-medium text-yellow-800">You're currently offline</h3>
                <p className="text-yellow-700 text-sm">Go online to start receiving delivery requests</p>
              </div>
            </div>
          </div>
        )}

        {/* Available Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Orders</h2>
            <button
              onClick={loadDriverData}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders available</h3>
              <p className="text-gray-600">
                {isOnline 
                  ? "We'll notify you when new delivery requests come in."
                  : "Go online to start receiving delivery requests."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Order #{order.id.slice(-8)}
                      </h3>
                      <p className="text-gray-600">
                        Restaurant #{order.restaurantId} → {order.deliveryAddress.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(order.deliveryFee + order.tip)}
                      </div>
                      <div className="text-sm text-gray-600">Estimated earnings</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Pickup</h4>
                      <p className="text-sm text-gray-600">
                        {order.restaurantAddress.street}<br />
                        {order.restaurantAddress.city}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Delivery</h4>
                      <p className="text-sm text-gray-600">
                        {order.deliveryAddress.street}<br />
                        {order.deliveryAddress.city}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Distance</h4>
                      <p className="text-sm text-gray-600">~3.2 miles</p>
                      <p className="text-sm text-gray-600">~15 min drive</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Placed at {formatTime(order.createdAt)}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => rejectOrder(order.id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Accept Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/driver/earnings"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-900 mb-2">View Earnings</h3>
            <p className="text-sm text-gray-600">Track your daily, weekly, and monthly earnings</p>
          </Link>
          
          <Link
            href="/driver/history"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-900 mb-2">Delivery History</h3>
            <p className="text-sm text-gray-600">View your past deliveries and customer ratings</p>
          </Link>
          
          <Link
            href="/driver/support"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-3">💬</div>
            <h3 className="font-semibold text-gray-900 mb-2">Driver Support</h3>
            <p className="text-sm text-gray-600">Get help with deliveries, payments, or account issues</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Mock data for demonstration
const mockDriver: Driver = {
  id: 'driver_001',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+1-555-0123',
  vehicleType: 'car',
  vehicleInfo: {
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    color: 'Silver',
    licensePlate: 'ABC123'
  },
  rating: 4.8,
  totalRatings: 245,
  totalDeliveries: 892,
  isActive: true,
  isOnline: true,
  earnings: {
    today: 127.50,
    week: 650.25,
    month: 2840.75,
    total: 15620.30,
    pendingPayout: 127.50
  },
  joinedAt: '2023-06-15T00:00:00Z',
  lastActiveAt: new Date().toISOString(),
  backgroundCheckStatus: 'approved',
  documents: [
    { type: 'license', status: 'approved', uploadedAt: '2023-06-15T00:00:00Z' },
    { type: 'insurance', status: 'approved', uploadedAt: '2023-06-15T00:00:00Z' }
  ]
};

const mockOrders: DeliveryOrder[] = [
  {
    id: 'ord_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    status: 'ready_for_pickup',
    items: [
      { id: 'item_001', name: 'Margherita Pizza', price: 18.99, quantity: 1 },
      { id: 'item_002', name: 'Caesar Salad', price: 12.99, quantity: 1 }
    ],
    subtotal: 31.98,
    deliveryFee: 4.99,
    tip: 6.00,
    tax: 3.20,
    total: 46.17,
    deliveryAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US'
    },
    restaurantAddress: {
      street: '456 Restaurant Ave',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US'
    },
    estimatedPrepTime: 20,
    estimatedDeliveryTime: 35,
    paymentMethod: 'card',
    paymentStatus: 'completed',
    createdAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    updatedAt: new Date().toISOString()
  }
];