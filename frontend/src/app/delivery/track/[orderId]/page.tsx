'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { deliveryService } from '@/lib/api/delivery';
import { DeliveryOrder, DeliveryTracking, TrackingEvent } from '@/types/delivery';

const trackingSteps = [
  { key: 'order_placed', label: 'Order Placed', icon: '📝' },
  { key: 'order_confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'preparation_started', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'ready_for_pickup', label: 'Ready', icon: '🛎️' },
  { key: 'driver_assigned', label: 'Driver Assigned', icon: '🚗' },
  { key: 'order_picked_up', label: 'Picked Up', icon: '📦' },
  { key: 'in_transit', label: 'On the Way', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' }
];

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (orderId) {
      loadOrderData();
      
      // Update time every minute
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);

      // Poll for updates every 30 seconds for active orders
      const pollInterval = setInterval(() => {
        if (order && ['preparing', 'driver_assigned', 'picked_up', 'in_transit'].includes(order.status)) {
          loadTrackingData();
        }
      }, 30000);

      return () => {
        clearInterval(interval);
        clearInterval(pollInterval);
      };
    }
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const [orderData, trackingData] = await Promise.all([
        deliveryService.getOrder(orderId),
        deliveryService.trackOrder(orderId)
      ]);
      setOrder(orderData);
      setTracking(trackingData);
    } catch (err) {
      console.error('Failed to load order data:', err);
      setError('Failed to load order information');
      // For demo, use mock data
      setOrder(mockOrder);
      setTracking(mockTracking);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingData = async () => {
    try {
      const trackingData = await deliveryService.trackOrder(orderId);
      setTracking(trackingData);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
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

  const getEstimatedArrival = () => {
    if (!tracking?.estimatedArrival) return null;
    const arrivalTime = new Date(tracking.estimatedArrival);
    const now = new Date();
    const diffMinutes = Math.max(0, Math.floor((arrivalTime.getTime() - now.getTime()) / 60000));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      return formatTime(tracking.estimatedArrival);
    }
  };

  const getCurrentStepIndex = () => {
    if (!tracking?.events.length) return 0;
    
    const latestEvent = tracking.events[tracking.events.length - 1];
    const stepIndex = trackingSteps.findIndex(step => step.key === latestEvent.type);
    return stepIndex >= 0 ? stepIndex : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'We couldn\'t find this order.'}</p>
          <Link
            href="/delivery"
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const estimatedArrival = getEstimatedArrival();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/delivery" className="text-red-600 hover:text-red-700 font-medium mb-4 inline-block">
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-600">Order #{order.id.slice(-8)}</p>
        </div>

        {/* Order Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
              <p className="text-gray-600">Restaurant #{order.restaurantId}</p>
            </div>
            {estimatedArrival && (
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{estimatedArrival}</div>
                <div className="text-sm text-gray-600">Estimated arrival</div>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {trackingSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg border-2 ${
                        isCompleted
                          ? 'bg-red-600 border-red-600 text-white'
                          : isCurrent
                          ? 'bg-red-100 border-red-600 text-red-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Progress Line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 -z-10">
              <div
                className="h-full bg-red-600 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (trackingSteps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
            
            <div className="space-y-4 mb-6">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.quantity}x {item.name}
                    </div>
                    {item.customizations && item.customizations.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {item.customizations.map(c => c.name + ': ' + c.value).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tip</span>
                <span>{formatCurrency(order.tip)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Delivery Address</h4>
                <p className="text-gray-600">
                  {order.deliveryAddress.street}<br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                </p>
                {order.deliveryAddress.instructions && (
                  <p className="text-sm text-gray-500 mt-1">
                    Instructions: {order.deliveryAddress.instructions}
                  </p>
                )}
              </div>

              {order.driverId && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Your Driver</h4>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      👤
                    </div>
                    <div>
                      <div className="font-medium">Driver #{order.driverId.slice(-6)}</div>
                      <div className="text-sm text-gray-500">⭐ 4.8 rating</div>
                    </div>
                  </div>
                </div>
              )}

              {order.specialInstructions && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Special Instructions</h4>
                  <p className="text-gray-600">{order.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        {tracking?.events && tracking.events.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h3>
            <div className="space-y-3">
              {tracking.events.slice().reverse().map((event, index) => (
                <div key={event.id} className="flex items-start">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{event.message}</div>
                    <div className="text-sm text-gray-500">{formatTime(event.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mt-8">
          <Link
            href={`/delivery/orders/${order.id}`}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            View Full Details
          </Link>
          
          {order.status === 'delivered' && (
            <Link
              href={`/delivery/orders/${order.id}/review`}
              className="border border-red-600 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Leave Review
            </Link>
          )}
          
          {['pending', 'confirmed', 'preparing'].includes(order.status) && (
            <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock data for demonstration
const mockOrder: DeliveryOrder = {
  id: 'ord_123456789',
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
    country: 'US',
    instructions: 'Leave at door, ring doorbell'
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
  specialInstructions: 'Extra napkins please',
  createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
  updatedAt: new Date().toISOString()
};

const mockTracking: DeliveryTracking = {
  orderId: 'ord_123456789',
  status: 'in_transit',
  estimatedArrival: new Date(Date.now() + 900000).toISOString(), // 15 minutes from now
  events: [
    {
      id: 'evt_001',
      type: 'order_placed',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      message: 'Order placed successfully'
    },
    {
      id: 'evt_002',
      type: 'order_confirmed',
      timestamp: new Date(Date.now() - 1650000).toISOString(),
      message: 'Restaurant confirmed your order'
    },
    {
      id: 'evt_003',
      type: 'preparation_started',
      timestamp: new Date(Date.now() - 1500000).toISOString(),
      message: 'Kitchen started preparing your food'
    },
    {
      id: 'evt_004',
      type: 'ready_for_pickup',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      message: 'Your order is ready for pickup'
    },
    {
      id: 'evt_005',
      type: 'driver_assigned',
      timestamp: new Date(Date.now() - 480000).toISOString(),
      message: 'Driver assigned and heading to restaurant'
    },
    {
      id: 'evt_006',
      type: 'order_picked_up',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      message: 'Driver picked up your order'
    },
    {
      id: 'evt_007',
      type: 'in_transit',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      message: 'On the way to your location'
    }
  ]
};