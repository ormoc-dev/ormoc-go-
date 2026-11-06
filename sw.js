/* OrmocGo PWA service worker — app shell cache */
const APP_VERSION = (() => {
  try {
    const param = new URL(self.location.href).searchParams.get('v');
    if (param) return param;
  } catch (_) { /* ignore */ }
  return '0.1.0';
})();

const SHELL_CACHE = `ormocgo-shell-${APP_VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './public/css/app.css',
  './public/css/layout/theme.css',
  './public/css/home.css',
  './public/css/auth/auth.css',
  './public/css/dashboard.css',
  './js/app.js',
  './js/config.js',
  './js/env.js',
  './js/pwa.js',
  './js/supabase.js',
  './js/lib/navigate.js',
  './js/lib/google-auth.js',
  './js/lib/google-button.js',
  './js/lib/password-field.js',
  './js/data/ormoc-slides.js',
  './js/components/header.js',
  './js/components/footer.js',
  './js/components/sidebar.js',
  './js/components/ormoc-slider.js',
  './js/components/bottom-sheet.js',
  './js/views/home.js',
  './js/views/dashboard.js',
  './js/views/login.js',
  './js/views/signup.js',
  './js/views/not-found.js',
  './public/assets/icons/icon-192.png',
  './public/assets/icons/icon-512.png',
  './public/assets/icons/logo.png',
  './public/assets/icons/ormoc_banner.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('ormocgo-shell-') && key !== SHELL_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache env files (always network).
  if (url.pathname.endsWith('/.env') || url.pathname.endsWith('/.env.production')) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(SHELL_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        return caches.match('./offline.html');
      }
      return Response.error();
    }
  })());
});
