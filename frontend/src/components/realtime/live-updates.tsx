'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocketSubscription } from '@/lib/websocket';
import { notificationService } from '@/lib/notifications';

interface LiveOrderTrackingProps {
  orderId: string;
  className?: string;
}

export function LiveOrderTracking({ orderId, className = '' }: LiveOrderTrackingProps) {
  const [orderStatus, setOrderStatus] = useState<string>('preparing');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>('');

  useWebSocketSubscription(
    'delivery_status_update',
    (message) => {
      if (message.orderId === orderId) {
        setOrderStatus(message.data.status);
        setEstimatedDeliveryTime(message.data.estimatedDeliveryTime || '');
        
        if (message.data.status === 'delivered') {
          notificationService.showDeliveryUpdate('delivered');
        }
      }
    },
    undefined,
    [orderId]
  );

  useWebSocketSubscription(
    'driver_location_update',
    (message) => {
      if (message.orderId === orderId && message.data.location) {
        setDriverLocation(message.data.location);
      }
    },
    undefined,
    [orderId]
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing':
        return '👨‍🍳';
      case 'ready':
        return '📦';
      case 'driver_assigned':
        return '🚗';
      case 'picked_up':
        return '🏃‍♂️';
      case 'on_the_way':
        return '🚚';
      case 'delivered':
        return '✅';
      default:
        return '⏳';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'Preparing your order';
      case 'ready':
        return 'Order ready for pickup';
      case 'driver_assigned':
        return 'Driver assigned';
      case 'picked_up':
        return 'Order picked up';
      case 'on_the_way':
        return 'On the way';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Processing';
    }
  };

  const statuses = ['preparing', 'ready', 'driver_assigned', 'picked_up', 'on_the_way', 'delivered'];
  const currentStatusIndex = statuses.indexOf(orderStatus);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Live Order Tracking</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="space-y-4 mb-6">
        {statuses.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          
          return (
            <div key={status} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {isCurrent ? (
                  <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
                ) : (
                  <span className="text-lg">{getStatusIcon(status)}</span>
                )}
              </div>
              
              <div className="ml-4 flex-1">
                <p className={`font-medium ${
                  isCompleted ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {getStatusText(status)}
                </p>
                {isCurrent && estimatedDeliveryTime && (
                  <p className="text-sm text-gray-600">
                    Estimated delivery: {estimatedDeliveryTime}
                  </p>
                )}
              </div>
              
              {index < statuses.length - 1 && (
                <div className={`w-px h-8 ml-5 ${
                  isCompleted ? 'bg-green-300' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Driver Location */}
      {driverLocation && orderStatus !== 'delivered' && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Driver Location</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Lat: {driverLocation.lat.toFixed(6)}, Lng: {driverLocation.lng.toFixed(6)}
            </p>
            <button className="text-blue-600 text-sm hover:text-blue-700 mt-1">
              View on Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface LiveAvailabilityProps {
  restaurantId: string;
  selectedDate: string;
  partySize: number;
  onAvailabilityUpdate: (slots: Array<{ time: string; available: boolean }>) => void;
  className?: string;
}

export function LiveAvailability({ 
  restaurantId, 
  selectedDate, 
  partySize, 
  onAvailabilityUpdate,
  className = '' 
}: LiveAvailabilityProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useWebSocketSubscription(
    'availability_update',
    (message) => {
      if (message.restaurantId === restaurantId && 
          message.data.date === selectedDate &&
          message.data.partySize === partySize) {
        onAvailabilityUpdate(message.data.availability);
        setLastUpdate(new Date());
      }
    },
    undefined,
    [restaurantId, selectedDate, partySize]
  );

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Live availability • Updated {lastUpdate.toLocaleTimeString()}</span>
    </div>
  );
}

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useWebSocketSubscription(
    'connection_status_change',
    (message) => {
      setIsConnected(message.data.isConnected);
      setShowStatus(true);
      
      // Hide status after 3 seconds if connected
      if (message.data.isConnected) {
        setTimeout(() => setShowStatus(false), 3000);
      }
    },
    undefined,
    []
  );

  if (!showStatus) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className="text-sm font-medium">
          {isConnected ? 'Connected' : 'Connection lost'}
        </span>
      </div>
    </div>
  );
}

interface LiveReservationCounterProps {
  restaurantId: string;
  className?: string;
}

export function LiveReservationCounter({ restaurantId, className = '' }: LiveReservationCounterProps) {
  const [reservationCount, setReservationCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useWebSocketSubscription(
    'reservation_confirmed',
    (message) => {
      if (message.restaurantId === restaurantId) {
        setReservationCount(prev => prev + 1);
        
        // Check if reservation is for today
        const reservationDate = new Date(message.data.date);
        const today = new Date();
        if (reservationDate.toDateString() === today.toDateString()) {
          setTodayCount(prev => prev + 1);
        }
      }
    },
    undefined,
    [restaurantId]
  );

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-blue-800">Live Activity</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-blue-900">{todayCount}</p>
          <p className="text-xs text-blue-700">Today's Reservations</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-900">{reservationCount}</p>
          <p className="text-xs text-blue-700">Total This Session</p>
        </div>
      </div>
    </div>
  );
}

interface LivePromotionBannerProps {
  className?: string;
}

export function LivePromotionBanner({ className = '' }: LivePromotionBannerProps) {
  const [promotion, setPromotion] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useWebSocketSubscription(
    'promotion_available',
    (message) => {
      setPromotion(message.data);
      setIsVisible(true);
      
      // Auto-hide after 10 seconds
      setTimeout(() => setIsVisible(false), 10000);
    },
    undefined,
    []
  );

  if (!isVisible || !promotion) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <h4 className="font-semibold">{promotion.title}</h4>
            <p className="text-sm opacity-90">{promotion.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              // Handle promotion action
              window.open(promotion.url, '_blank');
            }}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Claim Offer
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}