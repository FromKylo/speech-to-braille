// Service Worker for PWA Template
const CACHE_NAME = 'pwa-template-v3';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/vosk-worker.js',
  '/js/alternatives/speech-recognition.js',
  '/js/braille-translator.js',
  '/ueb-philb-braille-database.csv',
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

// Custom local model files - add these when you have them
const LOCAL_MODEL_FILES = [
  '/models/speech-model.pbmm',
  '/models/speech-model.scorer'
];

// Add local model files to cache if they exist
CACHE_URLS.push(...LOCAL_MODEL_FILES);

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        
        // Filter out files that might not exist yet to prevent install failure
        // This way the service worker will install even if some files aren't available
        return Promise.allSettled(
          CACHE_URLS.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                throw new Error(`Failed to fetch ${url}`);
              })
              .catch(err => {
                console.warn(`Couldn't cache ${url}: ${err.message}`);
                return Promise.resolve(); // Continue despite error
              })
          )
        );
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

// Fetch event with improved caching strategy
self.addEventListener('fetch', event => {
  // Don't intercept requests that won't work well with service worker caching
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  
  // For API requests, don't use cache
  if (requestUrl.pathname.includes('/api/')) {
    return fetch(event.request).catch(() => {
      return new Response(JSON.stringify({
        error: 'You are offline',
        offline: true
      }), {
        headers: {'Content-Type': 'application/json'}
      });
    });
  }
  
  // For model files, use cache-first strategy
  if (event.request.url.includes('/models/') || event.request.url.includes(VOSK_MODEL_URL)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              // Don't cache if response status isn't 200 OK
              if (!response || !response.ok || response.status !== 200) {
                console.log(`Not caching non-200 response for: ${event.request.url} (status: ${response.status})`);
                return response;
              }
              
              // Clone the response before using it
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME).then(cache => {
                try {
                  console.log('Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                } catch (cacheError) {
                  console.warn('Failed to cache resource:', event.request.url, cacheError);
                }
              });
              
              return response;
            })
            .catch(error => {
              console.error('Fetch error:', error);
              return new Response('Network error', { status: 408 });
            });
        })
    );
    return;
  }
  
  // For regular assets, use network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful full responses (status 200)
        if (response && response.ok && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            if (event.request.url.startsWith(self.location.origin)) {
              try {
                cache.put(event.request, responseClone);
              } catch (e) {
                console.warn('Cache put failed:', e);
              }
            }
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the request is for a page, return the offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // Otherwise return a simple error response
          return new Response('You are offline', { status: 503 });
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
