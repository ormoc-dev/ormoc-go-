/* OrmocGo PWA service worker — shell + limited offline features */
const APP_VERSION = (() => {
  try {
    const param = new URL(self.location.href).searchParams.get('v');
    if (param) return param;
  } catch (_) { /* ignore */ }
  return '0.1.0';
})();

const SHELL_CACHE = `ormocgo-shell-${APP_VERSION}`;

/** App shell + modules needed for offline limited features. */
const PRECACHE_SHELL = [
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
  './js/lib/ormoc-map.js',
  './js/lib/google-auth.js',
  './js/lib/google-button.js',
  './js/lib/password-field.js',
  './js/lib/auth-forms.js',
  './js/lib/saved.js',
  './js/lib/user-profile.js',
  './js/lib/emergency-contacts.js',
  './js/data/ormoc-slides.js',
  './js/data/ormoc-barangays.js',
  './js/data/ormoc-archive.js',
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
  './public/assets/icons/icon-og-animated.svg',
  './public/assets/icons/icon-og-layer-navy.png',
  './public/assets/icons/icon-og-layer-ring.png',
  './public/assets/icons/icon-og-layer-g.png',
  './public/assets/icons/logo.png',
  './public/assets/icons/ormoc_banner.png',
];

/** Static content available offline (Photo Archive, welcome slides, tourist cards). */
const PRECACHE_MEDIA = [
  // Photo Archive (City of Ormoc heritage)
  './public/assets/images/ormoc/archive/archive1.jpg',
  './public/assets/images/ormoc/archive/archive2.jpg',
  './public/assets/images/ormoc/archive/archive3.jpg',
  './public/assets/images/ormoc/archive/archive4.jpg',
  './public/assets/images/ormoc/archive/archive5.jpg',
  './public/assets/images/ormoc/archive/archive6.jpg',
  './public/assets/images/ormoc/archive/archive7.jpg',
  './public/assets/images/ormoc/archive/archive8.jpg',
  './public/assets/images/ormoc/archive/archive9.jpg',
  './public/assets/images/ormoc/archive/archive10.jpg',
  './public/assets/images/ormoc/archive/archive11.jpg',
  './public/assets/images/ormoc/archive/aguadulce.jpg',
  './public/assets/images/ormoc/archive/anilao.jpg',
  './public/assets/images/ormoc/archive/oldmaternity.jpg',
  './public/assets/images/ormoc/archive/dominadortan.jpg',
  './public/assets/images/ormoc/archive/sppc.jpg',
  // Welcome slider
  './public/assets/images/ormoc/lake-danao/01-lake-danao.jpg',
  './public/assets/images/ormoc/lake-danao/02-lake-danao-park.jpg',
  './public/assets/images/ormoc/lake-danao/04-calm-reflection.jpg',
  './public/assets/images/ormoc/03-scenic-route.jpg',
  './public/assets/images/ormoc/05-ormoc-bay.jpg',
  './public/assets/images/ormoc/07-aviles-st.jpg',
  './public/assets/images/ormoc/09-dawn-blue.jpg',
  './public/assets/images/ormoc/10-beneath-stars.jpg',
  './public/assets/images/ormoc/12-rizal-monument.jpg',
  './public/assets/images/ormoc/1000011170.jpg',
  './public/assets/images/ormoc/1000011171.jpg',
  './public/assets/images/ormoc/1000011172.jpg',
  './public/assets/images/ormoc/1000011173.jpg',
  './public/assets/images/ormoc/1000011174.jpg',
  './public/assets/images/ormoc/1000011176.jpg',
  './public/assets/images/ormoc/1000011178.jpg',
  // Tourist spot cards
  './public/assets/images/ormoc/tourist-spots/ormoc-tourist-spots-hero.jpg',
  './public/assets/images/ormoc/tourist-spots/lake-danao.jpg',
  './public/assets/images/ormoc/tourist-spots/alto-peak.jpg',
  './public/assets/images/ormoc/tourist-spots/alto-peak-sign.jpg',
  './public/assets/images/ormoc/tourist-spots/alto-peak-view.jpg',
  './public/assets/images/ormoc/tourist-spots/ormoc-city-museum.jpg',
  './public/assets/images/ormoc/tourist-spots/ormoc-city-plaza.jpg',
  './public/assets/images/ormoc/tourist-spots/lake-janagdan.jpg',
  './public/assets/images/ormoc/tourist-spots/sulfatara.jpg',
  './public/assets/images/ormoc/tourist-spots/supremacy-camp.jpg',
  './public/assets/images/ormoc/tourist-spots/sabin-resort-hotel.jpg',
  './public/assets/images/ormoc/tourist-spots/sals-pineapple-plantation.jpg',
  './public/assets/images/ormoc/tourist-spots/pina-festival.jpg',
  './public/assets/images/ormoc/tourist-spots/88-cafe.jpg',
  './public/assets/images/ormoc/tourist-spots/martas.jpg',
];

async function precacheList(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cache.add(url);
      } catch (err) {
        console.warn('[OrmocGo SW] precache skip', url, err);
      }
    })
  );
}

function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.includes('/public/assets/')
    || path.endsWith('.css')
    || path.endsWith('.js')
    || path.endsWith('.webmanifest')
    || path.endsWith('.svg')
    || path.endsWith('.png')
    || path.endsWith('.jpg')
    || path.endsWith('.jpeg')
    || path.endsWith('.webp')
    || path.endsWith('.woff2')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await precacheList(cache, PRECACHE_SHELL);
    await precacheList(cache, PRECACHE_MEDIA);
    await self.skipWaiting();
  })());
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

  // Static assets: cache-first (works offline after first install/visit).
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  // Navigations + other same-origin: network-first, cache fallback.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(SHELL_CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html') || await caches.match('./');
        if (shell) return shell;
        return caches.match('./offline.html');
      }
      return Response.error();
    }
  })());
});
