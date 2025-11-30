/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache strategies for different types of resources

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache images with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache static assets with stale-while-revalidate
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Navigation route for offline fallback
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

registerRoute(navigationRoute);

// Background sync for critical actions
const reservationQueue = new Queue('reservations', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Background sync successful for reservation');
      } catch (error) {
        console.error('Background sync failed for reservation:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

const reviewQueue = new Queue('reviews', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Background sync successful for review');
      } catch (error) {
        console.error('Background sync failed for review:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Intercept POST requests for background sync
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    const url = new URL(event.request.url);
    
    // Queue reservations for background sync
    if (url.pathname.includes('/api/reservations')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          return reservationQueue.pushRequest({ request: event.request });
        })
      );
    }
    
    // Queue reviews for background sync
    if (url.pathname.includes('/api/reviews')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          return reviewQueue.pushRequest({ request: event.request });
        })
      );
    }
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag,
      renotify: data.renotify || false,
      silent: data.silent || false,
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'OpenTable Clone', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event;
  let targetUrl = '/';

  // Handle different notification types
  if (data) {
    switch (data.type) {
      case 'reservation_confirmed':
        targetUrl = `/reservations/${data.reservationId}`;
        break;
      case 'table_ready':
        targetUrl = `/restaurants/${data.restaurantId}`;
        break;
      case 'delivery_update':
        targetUrl = `/orders/${data.orderId}`;
        break;
      case 'promotion':
        targetUrl = `/restaurants/${data.restaurantId}`;
        break;
      default:
        targetUrl = '/';
    }
  }

  // Handle notification actions
  if (action) {
    switch (action) {
      case 'view':
        // Use the targetUrl as determined above
        break;
      case 'directions':
        if (data?.location) {
          targetUrl = `https://maps.google.com/?q=${data.location.latitude},${data.location.longitude}`;
        }
        break;
      case 'call':
        if (data?.phone) {
          targetUrl = `tel:${data.phone}`;
        }
        break;
      case 'calendar':
        // Add to calendar functionality would be handled by the main app
        targetUrl = `/reservations/${data.reservationId}`;
        break;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if there's already a window/tab open with the target URL
      const existingClient = clients.find((client) =>
        client.url.includes(targetUrl.split('/')[1])
      );

      if (existingClient) {
        existingClient.focus();
        if (existingClient.url !== targetUrl) {
          existingClient.postMessage({ type: 'navigate', url: targetUrl });
        }
      } else {
        self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline') || 
               new Response(
                 `
                 <!DOCTYPE html>
                 <html>
                   <head>
                     <title>Offline - OpenTable Clone</title>
                     <meta charset="utf-8">
                     <meta name="viewport" content="width=device-width, initial-scale=1">
                     <style>
                       body {
                         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                         text-align: center;
                         padding: 2rem;
                         background: #f7fafc;
                         margin: 0;
                       }
                       .container {
                         max-width: 400px;
                         margin: 0 auto;
                         background: white;
                         padding: 2rem;
                         border-radius: 8px;
                         box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                       }
                       h1 { color: #2d3748; margin-bottom: 1rem; }
                       p { color: #4a5568; margin-bottom: 1.5rem; }
                       button {
                         background: #3182ce;
                         color: white;
                         border: none;
                         padding: 0.75rem 1.5rem;
                         border-radius: 4px;
                         cursor: pointer;
                         font-size: 1rem;
                       }
                       button:hover { background: #2c5aa0; }
                       .icon { font-size: 3rem; margin-bottom: 1rem; }
                     </style>
                   </head>
                   <body>
                     <div class="container">
                       <div class="icon">📱</div>
                       <h1>You're Offline</h1>
                       <p>It looks like you've lost your internet connection. Check your connection and try again.</p>
                       <button onclick="window.location.reload()">Try Again</button>
                     </div>
                   </body>
                 </html>
                 `,
                 {
                   headers: { 'Content-Type': 'text/html' },
                 }
               );
      })
    );
  }
});

// Handle sync events for background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'reservations') {
    event.waitUntil(reservationQueue.replayRequests());
  }
  
  if (event.tag === 'reviews') {
    event.waitUntil(reviewQueue.replayRequests());
  }
});

// App update notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Update critical data in background
    const tasks = [
      updateUserNotifications(),
      updateReservationStatus(),
      syncOfflineActions(),
    ];
    
    await Promise.allSettled(tasks);
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function updateUserNotifications() {
  try {
    const response = await fetch('/api/notifications/unread');
    if (response.ok) {
      const notifications = await response.json();
      
      // Show urgent notifications
      notifications.forEach((notification: any) => {
        if (notification.urgent) {
          self.registration.showNotification(notification.title, {
            body: notification.body,
            icon: '/icons/icon-192x192.png',
            tag: `urgent-${notification.id}`,
            requireInteraction: true,
          });
        }
      });
    }
  } catch (error) {
    console.error('Failed to update notifications:', error);
  }
}

async function updateReservationStatus() {
  try {
    const response = await fetch('/api/reservations/status-updates');
    if (response.ok) {
      const updates = await response.json();
      
      // Cache updated reservation data
      const cache = await caches.open('api-cache');
      updates.forEach((update: any) => {
        cache.put(
          `/api/reservations/${update.id}`,
          new Response(JSON.stringify(update), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    }
  } catch (error) {
    console.error('Failed to update reservation status:', error);
  }
}

async function syncOfflineActions() {
  try {
    // Replay any queued background sync requests
    await reservationQueue.replayRequests();
    await reviewQueue.replayRequests();
  } catch (error) {
    console.error('Failed to sync offline actions:', error);
  }
}

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

export {};