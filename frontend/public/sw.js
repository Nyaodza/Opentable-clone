// Service Worker for OpenTable Clone PWA

const CACHE_NAME = 'opentable-clone-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle POST requests for offline functionality
    if (request.method === 'POST') {
      handlePostRequest(event);
    }
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first, cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'image') {
    // Images - Cache first, network fallback
    event.respondWith(handleImageRequest(request));
  } else if (request.mode === 'navigate') {
    // Navigation requests - Network first, cache fallback, offline page
    event.respondWith(handleNavigationRequest(request));
  } else {
    // Other static assets - Cache first, network fallback
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cache
    console.log('Network failed, falling back to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This content is not available offline' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  // Check cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the image
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Return placeholder image for failed requests
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Image not available</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Show offline page
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort offline page
    return new Response(
      generateOfflinePage(),
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  // Check cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache static assets
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Return a basic error response for failed static requests
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle POST requests for offline functionality
function handlePostRequest(event) {
  const { request } = event;
  const url = new URL(request.url);
  
  // Queue critical POST requests for background sync
  if (url.pathname.includes('/api/reservations') || 
      url.pathname.includes('/api/reviews')) {
    
    event.respondWith(
      fetch(request).catch(() => {
        // Store request for background sync
        return queueRequest(request).then(() => {
          return new Response(
            JSON.stringify({ 
              success: false, 
              queued: true, 
              message: 'Request queued for when you\'re back online' 
            }),
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });
      })
    );
  }
}

// Queue requests for background sync
async function queueRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    // This is a simplified version - in production, use a proper IndexedDB wrapper
    localStorage.setItem(
      `queued_request_${Date.now()}`, 
      JSON.stringify(requestData)
    );
    
    console.log('Request queued for background sync:', request.url);
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  if (!event.data) {
    console.log('Push notification received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push notification data:', data);
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      silent: data.silent || false,
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'OpenTable Clone', 
        options
      )
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        tag: 'fallback'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const { action, data } = event;
  let targetUrl = '/';

  // Determine target URL based on notification data
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
        targetUrl = `/promotions/${data.promotionId}`;
        break;
      default:
        targetUrl = '/dashboard';
    }
  }

  // Handle specific actions
  if (action) {
    switch (action) {
      case 'view':
        // targetUrl is already set above
        break;
      case 'dismiss':
        return; // Don't open any window
      case 'call':
        if (data?.phone) {
          targetUrl = `tel:${data.phone}`;
        }
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope)) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: data
            });
            return;
          }
        }
        
        // No window open, open a new one
        return clients.openWindow(targetUrl);
      })
  );
});

// Background sync handling
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processQueuedRequests());
  }
});

// Process queued requests during background sync
async function processQueuedRequests() {
  try {
    const queuedRequests = Object.keys(localStorage)
      .filter(key => key.startsWith('queued_request_'))
      .map(key => {
        const data = JSON.parse(localStorage.getItem(key));
        return { key, ...data };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Processing ${queuedRequests.length} queued requests`);

    for (const requestData of queuedRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          localStorage.removeItem(requestData.key);
          console.log('Successfully synced request:', requestData.url);
        } else {
          console.error('Failed to sync request:', requestData.url, response.status);
        }
      } catch (error) {
        console.error('Error syncing request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Error processing queued requests:', error);
  }
}

// Generate offline page HTML
function generateOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - OpenTable Clone</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .container {
            text-align: center;
            max-width: 400px;
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 1rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            margin: 0 0 1rem 0;
            font-size: 2rem;
            font-weight: 700;
          }
          p {
            margin: 0 0 2rem 0;
            opacity: 0.9;
            line-height: 1.6;
          }
          button {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>You're Offline</h1>
          <p>Don't worry! Some features are still available offline. Check your connection and try again when you're back online.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
    </html>
  `;
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker loaded successfully');
