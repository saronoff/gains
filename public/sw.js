const CACHE = 'gains-v2';
const STATIC = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for Supabase and Anthropic API calls
  if (url.hostname.includes('supabase.co') || url.hostname.includes('anthropic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // App shell (HTML/JS/CSS) — network-first so code changes show up on next
  // load instead of being stuck behind a stale cache-first entry forever.
  const isAppShell = url.origin === self.location.origin &&
    (e.request.mode === 'navigate' || /\.(js|css|html)$/.test(url.pathname));
  if (isAppShell) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (CDN libs, icons, fonts)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    })
  );
});

// Timer notifications — e.waitUntil keeps the SW alive until the notification
// fires, preventing iOS from terminating it before the timeout completes.
let _timerTimeout = null;
let _timerResolve = null;

self.addEventListener('message', e => {
  if (e.data?.type === 'timer-start') {
    // Cancel any in-flight timer and resolve its promise so the old waitUntil exits
    clearTimeout(_timerTimeout);
    if (_timerResolve) { _timerResolve(); _timerResolve = null; }

    e.waitUntil(new Promise(resolve => {
      _timerResolve = resolve;
      _timerTimeout = setTimeout(() => {
        _timerTimeout = null;
        _timerResolve = null;
        self.registration.showNotification('Rest timer done', {
          body: 'Time for your next set.',
          icon: '/icons/icon-192.png',
          tag: 'gains-timer',
          renotify: true
        }).then(resolve).catch(resolve);
      }, e.data.delay);
    }));
  } else if (e.data?.type === 'timer-cancel') {
    clearTimeout(_timerTimeout);
    _timerTimeout = null;
    if (_timerResolve) { _timerResolve(); _timerResolve = null; }
  }
});
