export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPreferences {
  reservations: boolean;
  promotions: boolean;
  reminders: boolean;
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  reviews: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: globalThis.PushSubscription | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        // Get existing push subscription
        this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Permission Management
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  public getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  // Push Subscription Management
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const permission = this.getPermissionStatus();
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      this.pushSubscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(this.pushSubscription);

      return {
        endpoint: this.pushSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.pushSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.pushSubscription.getKey('auth')!),
        },
      };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.pushSubscription) {
      return true;
    }

    try {
      const unsubscribed = await this.pushSubscription.unsubscribe();
      if (unsubscribed) {
        // Notify server about unsubscription
        await this.removeSubscriptionFromServer();
        this.pushSubscription = null;
      }
      return unsubscribed;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  public async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        this.pushSubscription = subscription;
        return {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  // Local Notifications
  public showLocalNotification(title: string, options: NotificationOptions = {}): void {
    const permission = this.getPermissionStatus();
    if (!permission.granted) {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    if (this.shouldSuppressNotification()) {
      console.log('Notification suppressed due to quiet hours');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
    };

    new Notification(title, defaultOptions);
  }

  public async showRichNotification(
    title: string,
    body: string,
    options: {
      icon?: string;
      image?: string;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
      data?: any;
      tag?: string;
      renotify?: boolean;
      silent?: boolean;
      requireInteraction?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const permission = this.getPermissionStatus();
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }

    if (this.shouldSuppressNotification()) {
      console.log('Rich notification suppressed due to quiet hours');
      return;
    }

    const notificationOptions: NotificationOptions = {
      body,
      icon: options.icon || '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      image: options.image,
      actions: options.actions,
      data: options.data,
      tag: options.tag,
      renotify: options.renotify || false,
      silent: options.silent || false,
      requireInteraction: options.requireInteraction || false,
      vibrate: options.silent ? undefined : [200, 100, 200],
    };

    await this.swRegistration.showNotification(title, notificationOptions);
  }

  // Scheduled Notifications
  public async scheduleNotification(
    title: string,
    body: string,
    scheduledTime: Date,
    options: {
      id?: string;
      icon?: string;
      data?: any;
      tag?: string;
    } = {}
  ): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const delay = scheduledTime.getTime() - Date.now();
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Store scheduled notification in IndexedDB or localStorage
    const scheduledNotification = {
      id: options.id || `scheduled_${Date.now()}`,
      title,
      body,
      scheduledTime: scheduledTime.toISOString(),
      options,
    };

    await this.storeScheduledNotification(scheduledNotification);

    // Set up timer for notification
    setTimeout(async () => {
      await this.showRichNotification(title, body, options);
      await this.removeScheduledNotification(scheduledNotification.id);
    }, delay);
  }

  public async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    return await this.removeScheduledNotification(notificationId);
  }

  public async getScheduledNotifications(): Promise<Array<{
    id: string;
    title: string;
    body: string;
    scheduledTime: string;
    options: any;
  }>> {
    return await this.getStoredScheduledNotifications();
  }

  // Notification Templates
  public async showReservationConfirmation(reservationData: {
    restaurantName: string;
    date: string;
    time: string;
    partySize: number;
    confirmationCode: string;
  }): Promise<void> {
    await this.showRichNotification(
      '✅ Reservation Confirmed',
      `Your table for ${reservationData.partySize} at ${reservationData.restaurantName} on ${reservationData.date} at ${reservationData.time} is confirmed.`,
      {
        icon: '/icons/reservation-confirmed.png',
        tag: 'reservation-confirmed',
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icons/view.png',
          },
          {
            action: 'calendar',
            title: 'Add to Calendar',
            icon: '/icons/calendar.png',
          },
        ],
        data: {
          type: 'reservation_confirmed',
          reservationData,
        },
        requireInteraction: true,
      }
    );
  }

  public async showTableReadyNotification(restaurantName: string): Promise<void> {
    await this.showRichNotification(
      '🍽️ Your Table is Ready!',
      `Your table at ${restaurantName} is now ready. Please proceed to the restaurant.`,
      {
        icon: '/icons/table-ready.png',
        tag: 'table-ready',
        actions: [
          {
            action: 'directions',
            title: 'Get Directions',
            icon: '/icons/directions.png',
          },
          {
            action: 'call',
            title: 'Call Restaurant',
            icon: '/icons/phone.png',
          },
        ],
        data: {
          type: 'table_ready',
          restaurantName,
        },
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      }
    );
  }

  public async showDeliveryUpdate(status: string, driverName?: string, estimatedTime?: string): Promise<void> {
    let title = '🚗 Delivery Update';
    let body = '';

    switch (status) {
      case 'preparing':
        title = '👨‍🍳 Order Being Prepared';
        body = 'Your order is being prepared in the kitchen.';
        break;
      case 'driver_assigned':
        title = '🚗 Driver Assigned';
        body = `${driverName} is now delivering your order.`;
        break;
      case 'picked_up':
        title = '📦 Order Picked Up';
        body = `Your order has been picked up and is on the way. Estimated delivery: ${estimatedTime}.`;
        break;
      case 'delivered':
        title = '✅ Order Delivered';
        body = 'Your order has been delivered. Enjoy your meal!';
        break;
    }

    await this.showRichNotification(title, body, {
      icon: '/icons/delivery.png',
      tag: 'delivery-update',
      data: {
        type: 'delivery_update',
        status,
        driverName,
        estimatedTime,
      },
    });
  }

  public async showPromotionNotification(promotion: {
    title: string;
    description: string;
    discount: string;
    restaurantName: string;
    expiryDate: string;
  }): Promise<void> {
    await this.showRichNotification(
      `🎉 ${promotion.title}`,
      `${promotion.discount} off at ${promotion.restaurantName}. ${promotion.description}`,
      {
        icon: '/icons/promotion.png',
        image: '/images/promotion-banner.jpg',
        tag: 'promotion',
        actions: [
          {
            action: 'view',
            title: 'View Offer',
            icon: '/icons/view.png',
          },
          {
            action: 'book',
            title: 'Book Now',
            icon: '/icons/book.png',
          },
        ],
        data: {
          type: 'promotion',
          promotion,
        },
      }
    );
  }

  // Preferences Management
  public async getNotificationPreferences(): Promise<NotificationPreferences> {
    const stored = localStorage.getItem('notification_preferences');
    if (stored) {
      return JSON.parse(stored);
    }

    // Default preferences
    return {
      reservations: true,
      promotions: true,
      reminders: true,
      orderUpdates: true,
      deliveryUpdates: true,
      reviews: false,
      sound: true,
      vibration: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };
  }

  public async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    const current = await this.getNotificationPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
  }

  // Utility Methods
  private shouldSuppressNotification(): boolean {
    const preferences = JSON.parse(localStorage.getItem('notification_preferences') || '{}');
    if (!preferences.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = preferences.quietHours.start;
    const end = preferences.quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private async sendSubscriptionToServer(subscription: globalThis.PushSubscription): Promise<void> {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };

    // Send to your API
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async storeScheduledNotification(notification: any): Promise<void> {
    const stored = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    stored.push(notification);
    localStorage.setItem('scheduled_notifications', JSON.stringify(stored));
  }

  private async removeScheduledNotification(id: string): Promise<boolean> {
    const stored = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    const filtered = stored.filter((n: any) => n.id !== id);
    localStorage.setItem('scheduled_notifications', JSON.stringify(filtered));
    return filtered.length < stored.length;
  }

  private async getStoredScheduledNotifications(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React hooks
export function useNotificationPermission() {
  const [permission, setPermission] = React.useState<NotificationPermission>(() =>
    notificationService.getPermissionStatus()
  );

  const requestPermission = async () => {
    const newPermission = await notificationService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  };

  React.useEffect(() => {
    const checkPermission = () => {
      setPermission(notificationService.getPermissionStatus());
    };

    // Check permission status on focus
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  return { permission, requestPermission };
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = React.useState<NotificationPreferences | null>(null);

  React.useEffect(() => {
    notificationService.getNotificationPreferences().then(setPreferences);
  }, []);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    await notificationService.updateNotificationPreferences(updates);
    const updated = await notificationService.getNotificationPreferences();
    setPreferences(updated);
  };

  return { preferences, updatePreferences };
}

export default notificationService;