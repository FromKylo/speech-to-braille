/**
 * Cache Manager for PWA
 * Handles service worker, installation, and cache management
 */

const cacheManager = (function() {
    // DOM elements
    let deferredPrompt = null;
    let installButton, statusDiv, lastUpdatedSpan, dynamicContent, refreshButton;
    
    // Initialize DOM element references
    function initDOMReferences() {
        installButton = document.getElementById('install-button');
        statusDiv = document.getElementById('connection-status');
        lastUpdatedSpan = document.getElementById('last-updated');
        dynamicContent = document.getElementById('dynamic-content');
        refreshButton = document.getElementById('refresh-button');
    }
    
    // Set up event listeners
    function setupEventListeners() {
        if (!installButton || !refreshButton) return;
        
        // Set the last updated time with local data
        if (lastUpdatedSpan) {
            lastUpdatedSpan.textContent = new Date().toLocaleString();
        }
        
        // Add event listeners for online/offline events
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Handle app installation
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;
            // Show the install button
            if (installButton) installButton.style.display = 'block';
        });
        
        if (installButton) {
            installButton.addEventListener('click', () => {
                if (deferredPrompt) {
                    // Show the install prompt
                    deferredPrompt.prompt();
                    // Wait for the user to respond to the prompt
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        } else {
                            console.log('User dismissed the install prompt');
                        }
                        deferredPrompt = null;
                    });
                }
            });
        }
        
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                checkCacheContents();
            });
        }
    }
    
    // Check if the app is online and update the UI
    function updateOnlineStatus() {
        if (!statusDiv) return;
        
        const isOnline = navigator.onLine;
        statusDiv.textContent = isOnline ? 'You are online.' : 'You are offline. Using cached content.';
        statusDiv.className = isOnline ? 'status online' : 'status offline';
    }
    
    // Register service worker
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(reg => {
                        console.log('Service worker registered!', reg);
                    })
                    .catch(err => {
                        console.log('Service worker registration failed:', err);
                    });
            });
        }
    }
    
    // Fetch cached data information
    async function checkCacheContents() {
        if (!dynamicContent) return;
        
        dynamicContent.innerHTML = '<p>Checking cache contents...</p>';
        
        try {
            // Check if we can access caches
            if (!('caches' in window)) {
                dynamicContent.innerHTML = '<p class="error">Cache API not available in this browser.</p>';
                return;
            }
            
            // Get all cache keys
            const cacheKeys = await caches.keys();
            
            if (cacheKeys.length === 0) {
                dynamicContent.innerHTML = '<p>No caches found.</p>';
                return;
            }
            
            let cacheContentsHTML = '<div class="cache-summary">';
            cacheContentsHTML += `<p><strong>${cacheKeys.length}</strong> cache(s) found</p>`;
            cacheContentsHTML += '</div>';
            
            // Process each cache
            for (const cacheName of cacheKeys) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                const requestUrls = requests.map(request => request.url);
                
                cacheContentsHTML += `<div class="cache-details">
                    <h3>Cache: ${cacheName}</h3>
                    <p><strong>${requestUrls.length}</strong> item(s) cached</p>
                    <details>
                        <summary>Show cached items</summary>
                        <ul class="cache-items">`;
                
                // Group items by type
                const groupedItems = {
                    html: [],
                    css: [],
                    js: [],
                    images: [],
                    models: [],
                    other: []
                };
                
                requestUrls.forEach(url => {
                    const path = new URL(url).pathname;
                    if (path.endsWith('.html')) {
                        groupedItems.html.push(url);
                    } else if (path.endsWith('.css')) {
                        groupedItems.css.push(url);
                    } else if (path.endsWith('.js')) {
                        groupedItems.js.push(url);
                    } else if (/\.(jpe?g|png|gif|svg|webp|ico)$/i.test(path)) {
                        groupedItems.images.push(url);
                    } else if (path.includes('/models/') || path.includes('vosk-model')) {
                        groupedItems.models.push(url);
                    } else {
                        groupedItems.other.push(url);
                    }
                });
                
                // Add collapsible sections for each type
                if (groupedItems.html.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>HTML Files (${groupedItems.html.length})</summary>
                        <ul>${groupedItems.html.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                if (groupedItems.css.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>CSS Files (${groupedItems.css.length})</summary>
                        <ul>${groupedItems.css.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                if (groupedItems.js.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>JavaScript Files (${groupedItems.js.length})</summary>
                        <ul>${groupedItems.js.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                if (groupedItems.images.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>Images (${groupedItems.images.length})</summary>
                        <ul>${groupedItems.images.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                if (groupedItems.models.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>Speech Models (${groupedItems.models.length})</summary>
                        <ul>${groupedItems.models.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                if (groupedItems.other.length) {
                    cacheContentsHTML += `<li><details>
                        <summary>Other Files (${groupedItems.other.length})</summary>
                        <ul>${groupedItems.other.map(url => `<li>${displayUrl(url)}</li>`).join('')}</ul>
                    </details></li>`;
                }
                
                cacheContentsHTML += `</ul></details></div>`;
            }
            
            // Check for IndexedDB models
            cacheContentsHTML += '<div class="indexeddb-details">';
            cacheContentsHTML += '<h3>IndexedDB Models</h3>';
            
            try {
                if ('speechRecognition' in window && typeof speechRecognition.isModelAvailableOffline === 'function') {
                    const modelAvailable = await speechRecognition.isModelAvailableOffline();
                    if (modelAvailable) {
                        cacheContentsHTML += '<p class="success">✓ Local speech model found in IndexedDB</p>';
                    } else {
                        cacheContentsHTML += '<p class="warning">No local speech models in IndexedDB</p>';
                    }
                } else {
                    cacheContentsHTML += '<p class="warning">Cannot check IndexedDB speech models</p>';
                }
            } catch (err) {
                cacheContentsHTML += `<p class="error">Error checking IndexedDB: ${err.message}</p>`;
            }
            
            cacheContentsHTML += '</div>';
            
            // Update the timestamp
            cacheContentsHTML += `<p class="cache-timestamp">Last checked: ${new Date().toLocaleString()}</p>`;
            
            dynamicContent.innerHTML = cacheContentsHTML;
            
        } catch (error) {
            console.error('Error checking cache:', error);
            dynamicContent.innerHTML = `<p class="error">Error checking cache: ${error.message}</p>`;
        }
    }
    
    // Helper function to display URLs in a cleaner format
    function displayUrl(url) {
        // Extract just the pathname from the URL
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        
        // If it's from our own origin, just show the path
        if (urlObj.origin === location.origin) {
            return path;
        }
        
        // For external URLs, show a simplified version
        return `${urlObj.hostname}${path}`;
    }
    
    // Initialize cache manager
    function init() {
        initDOMReferences();
        setupEventListeners();
        updateOnlineStatus(); // Initial check
        registerServiceWorker();
        
        // Initial cache check
        checkCacheContents();
    }
    
    // Public methods
    return {
        init,
        checkCacheContents,
        updateOnlineStatus
    };
})();

// Initialize cache manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    cacheManager.init();
});
