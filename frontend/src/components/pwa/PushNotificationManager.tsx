'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface PushNotificationManagerProps {}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if push notifications are supported
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        
        // Check if user previously dismissed the prompt
        const dismissed = localStorage.getItem('push-notifications-dismissed');
        if (!dismissed && Notification.permission === 'default') {
          // Show prompt after a delay and only if app is being used
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 30000); // 30 seconds

          return () => clearTimeout(timer);
        }

        // Get existing subscription
        getExistingSubscription();
      }
    }
  }, []);

  const getExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      setSubscription(existingSubscription);
    } catch (error) {
      console.error('Error getting existing subscription:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!isSupported) return;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        setShowPrompt(false);
        toast.success('Notifications enabled! You\'ll receive updates about your reservations.');
      } else if (permission === 'denied') {
        setShowPrompt(false);
        toast.error('Notifications blocked. You can enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications.');
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // You would typically get this from your server
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(subscription);

      // Send subscription to your server
      await sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      // Replace with your actual API endpoint
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
        
        toast.success('Notifications disabled.');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable notifications.');
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('push-notifications-dismissed', 'true');
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('OpenTable Clone', {
        body: 'Your reservation reminder is working!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'test-notification',
      });
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Permission Prompt */}
      {showPrompt && permission === 'default' && (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-4 md:right-auto md:max-w-sm z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-3">
                  <Bell className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Stay Updated</h3>
                  <p className="text-xs text-muted-foreground">Get notified</p>
                </div>
              </div>
              <button
                onClick={dismissPrompt}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss notification prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Get notified about reservation confirmations, reminders, and special offers.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={requestNotificationPermission}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Enable
              </button>
              <button
                onClick={dismissPrompt}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings (for development/testing) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
            <div className="font-medium">Push Notifications</div>
            <div>Permission: {permission}</div>
            <div>Subscribed: {subscription ? 'Yes' : 'No'}</div>
            
            <div className="flex gap-1">
              {permission === 'granted' && !subscription && (
                <button
                  onClick={subscribeToPushNotifications}
                  className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs"
                >
                  Subscribe
                </button>
              )}
              
              {subscription && (
                <>
                  <button
                    onClick={unsubscribeFromPushNotifications}
                    className="bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs"
                  >
                    Unsubscribe
                  </button>
                  <button
                    onClick={testNotification}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
                  >
                    Test
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};