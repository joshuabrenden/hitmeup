const CACHE_NAME = 'hitmeup-v1.0.0'
const urlsToCache = [
  '/',
  '/login',
  '/signup',
  '/home',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main-app.js'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache')
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { cache: 'reload' })
        }))
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error)
      })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Claim all clients immediately
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return
  
  // Skip API calls (let them fail naturally when offline)
  if (event.request.url.includes('/api/')) return
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url)
          return response
        }
        
        // Otherwise fetch from network
        console.log('[SW] Fetching from network:', event.request.url)
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          // Clone response for cache
          const responseToCache = response.clone()
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
          
          return response
        }).catch(() => {
          // Show offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          })
        })
      })
  )
})

// Background sync for queued messages (when online again)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(
      // Process queued messages when back online
      self.registration.showNotification('HitMeUp', {
        body: 'You\'re back online! Syncing messages...',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-notification'
      })
    )
  }
})

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  let notificationData = {}
  
  if (event.data) {
    notificationData = event.data.json()
  }
  
  const options = {
    body: notificationData.body || 'New message in HitMeUp!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: notificationData,
    actions: [
      {
        action: 'view',
        title: 'View Message',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'HitMeUp',
      options
    )
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'view' || !event.action) {
    // Open the chat page
    event.waitUntil(
      clients.openWindow('/home')
    )
  }
  // 'dismiss' action just closes the notification
})