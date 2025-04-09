// Service Worker for PWA Template
const CACHE_NAME = 'pwa-template-v2';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/vosk-worker.js',
  '/manifest.json',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap',
  '/node_modules/vosk-browser/dist/vosk.js'
];

// Vosk model URL (we'll use the CDN version)
const VOSK_MODEL_URL = 'https://cdn.jsdelivr.net/gh/ccoreilly/vosk-browser@master/public/models/vosk-model-small-en-us-0.15';

// Add Vosk model related files to cache
const VOSK_MODEL_FILES = [
  `${VOSK_MODEL_URL}/am/final.mdl`,
  `${VOSK_MODEL_URL}/conf/mfcc.conf`,
  `${VOSK_MODEL_URL}/conf/model.conf`,
  `${VOSK_MODEL_URL}/graph/disambig_tid.int`,
  `${VOSK_MODEL_URL}/graph/Gr.fst`,
  `${VOSK_MODEL_URL}/graph/HCLr.fst`,
  `${VOSK_MODEL_URL}/graph/phones.txt`,
  `${VOSK_MODEL_URL}/graph/phones/align_lexicon.int`,
  `${VOSK_MODEL_URL}/graph/phones/disambig.int`,
  `${VOSK_MODEL_URL}/graph/phones/optional_silence.csl`,
  `${VOSK_MODEL_URL}/graph/phones/optional_silence.txt`,
  `${VOSK_MODEL_URL}/graph/phones/silence.csl`,
  `${VOSK_MODEL_URL}/graph/phones/silence.txt`,
  `${VOSK_MODEL_URL}/graph/words.txt`,
  `${VOSK_MODEL_URL}/ivector/final.dubm`,
  `${VOSK_MODEL_URL}/ivector/final.ie`,
  `${VOSK_MODEL_URL}/ivector/final.mat`,
  `${VOSK_MODEL_URL}/ivector/global_cmvn.stats`,
  `${VOSK_MODEL_URL}/ivector/online_cmvn.conf`,
  `${VOSK_MODEL_URL}/ivector/splice.conf`
];

// Add all Vosk model files to the cache list
CACHE_URLS.push(...VOSK_MODEL_FILES);

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (event.request.url.startsWith(self.location.origin) || event.request.url.startsWith(VOSK_MODEL_URL)) {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        if (event.request.url.startsWith(VOSK_MODEL_URL)) {
          return caches.match(event.request);
        }
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({
              error: 'You are offline',
              offline: true
            }), {
              headers: {'Content-Type': 'application/json'}
            });
          }
          return caches.match('/offline.html');
        });
      })
  );
});

// Background sync for deferred actions when offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Function to handle background sync
function syncData() {
  // In a real app, you would retrieve queued actions from IndexedDB
  // and send them to your server
  console.log('Background sync executed');
  return Promise.resolve();
}

// Push notification event handler
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'PWA Template', options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    const url = event.notification.data.url;
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});
