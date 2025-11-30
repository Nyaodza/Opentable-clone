'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { deliveryService } from '@/lib/api/delivery';
import { DeliveryOrder, OrderStatus } from '@/types/delivery';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  driver_assigned: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  driver_assigned: 'Driver Assigned',
  picked_up: 'Picked Up',
  in_transit: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

export default function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    loadOrders();
  }, [activeFilter]);

  const loadOrders = async () => {
    try {
      const response = await deliveryService.getUserOrders({
        status: activeFilter === 'all' ? undefined : activeFilter,
        limit: 20
      });
      setOrders(response.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      // For demo, use mock data
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filterOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'in_transit', label: 'Active' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Delivery Orders</h1>
          <p className="text-gray-600">Track your orders and view delivery history</p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/restaurants?delivery=true"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium text-center"
            >
              Order Food Delivery
            </Link>
            <Link
              href="/delivery/track"
              className="border border-red-600 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-colors font-medium text-center"
            >
              Track Active Order
            </Link>
            <Link
              href="/delivery/addresses"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
            >
              Manage Addresses
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveFilter(option.value as OrderStatus | 'all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === option.value
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛵</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {activeFilter === 'all' 
                ? "You haven't placed any delivery orders yet."
                : `No ${activeFilter.replace('_', ' ')} orders found.`
              }
            </p>
            <Link
              href="/restaurants?delivery=true"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Order Food Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Restaurant</h4>
                      <p className="text-sm text-gray-600">Restaurant #{order.restaurantId}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Items</h4>
                      <p className="text-sm text-gray-600">{order.items.length} items</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Total</h4>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Delivery Address</h4>
                      <p className="text-sm text-gray-600">
                        {order.deliveryAddress.street}, {order.deliveryAddress.city}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t pt-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="text-sm text-gray-900">{item.quantity}x {item.name}</span>
                            {item.customizations && item.customizations.length > 0 && (
                              <div className="text-xs text-gray-500 ml-4">
                                {item.customizations.map(c => c.name + ': ' + c.value).join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/delivery/orders/${order.id}`}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      View Details
                    </Link>
                    {['in_transit', 'driver_assigned', 'picked_up'].includes(order.status) && (
                      <Link
                        href={`/delivery/track/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Track Order
                      </Link>
                    )}
                    {order.status === 'delivered' && (
                      <Link
                        href={`/delivery/orders/${order.id}/review`}
                        className="text-green-600 hover:text-green-700 font-medium text-sm"
                      >
                        Leave Review
                      </Link>
                    )}
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button
                        onClick={() => {/* Handle cancel */}}
                        className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                      >
                        Cancel Order
                      </button>
                    )}
                    <button
                      onClick={() => {/* Handle reorder */}}
                      className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data for demonstration
const mockOrders: DeliveryOrder[] = [
  {
    id: 'ord_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    driverId: 'driver_001',
    status: 'in_transit',
    items: [
      {
        id: 'item_001',
        name: 'Margherita Pizza',
        price: 18.99,
        quantity: 1,
        customizations: [
          { name: 'Size', value: 'Large' },
          { name: 'Extra Cheese', value: 'Yes', price: 2.00 }
        ]
      },
      {
        id: 'item_002',
        name: 'Caesar Salad',
        price: 12.99,
        quantity: 1
      }
    ],
    subtotal: 33.98,
    deliveryFee: 3.99,
    tip: 5.00,
    tax: 3.40,
    total: 46.37,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord_002',
    customerId: 'user_001',
    restaurantId: 'rest_002',
    status: 'delivered',
    items: [
      {
        id: 'item_003',
        name: 'Chicken Tikka Masala',
        price: 16.99,
        quantity: 1
      },
      {
        id: 'item_004',
        name: 'Garlic Naan',
        price: 4.99,
        quantity: 2
      }
    ],
    subtotal: 26.97,
    deliveryFee: 2.99,
    tip: 4.00,
    tax: 2.70,
    total: 36.66,
    deliveryAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US'
    },
    restaurantAddress: {
      street: '789 Spice Lane',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      country: 'US'
    },
    estimatedPrepTime: 25,
    estimatedDeliveryTime: 40,
    actualDeliveryTime: 38,
    paymentMethod: 'card',
    paymentStatus: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];