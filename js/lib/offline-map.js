/**
 * Offline map support: warm Cache API with Ormoc-area street tiles + MapLibre CDN.
 * Works with the service worker tile cache (ormocgo-map-tiles).
 */

export const MAP_TILE_CACHE = 'ormocgo-map-tiles';

/** Keep in sync with ORMOC_BOUNDS in ormoc-map.js (avoid import cycle). */
const ORMOC_BOUNDS = {
  south: 10.94,
  north: 11.12,
  west: 124.50,
  east: 124.72,
};

const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';

/** Default Streets layer — must match LAYER_CONFIG.streets in ormoc-map.js. */
const STREET_TILE = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2';
const STREET_SUBDOMAINS = ['0', '1', '2', '3'];

function latLngToTile(lat, lng, zoom) {
  const n = 2 ** zoom;
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { tileX, tileY };
}

function tilesForBounds(bounds, zoom) {
  const nw = latLngToTile(bounds.north, bounds.west, zoom);
  const se = latLngToTile(bounds.south, bounds.east, zoom);
  const minX = Math.min(nw.tileX, se.tileX);
  const maxX = Math.max(nw.tileX, se.tileX);
  const minY = Math.min(nw.tileY, se.tileY);
  const maxY = Math.max(nw.tileY, se.tileY);
  const urls = [];
  let i = 0;
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const s = STREET_SUBDOMAINS[i % STREET_SUBDOMAINS.length];
      i += 1;
      urls.push(
        STREET_TILE
          .replace('{s}', s)
          .replace('{x}', String(x))
          .replace('{y}', String(y))
          .replace('{z}', String(zoom)),
      );
    }
  }
  return urls;
}

function isCdnScript(url) {
  return url.includes('jsdelivr.net') && url.includes('maplibre-gl');
}

async function putInCache(cache, url) {
  try {
    const existing = await cache.match(url);
    if (existing) return true;

    // Prefer CORS so MapLibre (crossOrigin images / scripts) can use the response offline.
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
      if (res && res.ok) {
        await cache.put(url, res);
        return true;
      }
    } catch (_) {
      /* fall through */
    }

    // CDN scripts must stay CORS; skip opaque for those.
    if (isCdnScript(url)) return false;

    const opaque = await fetch(url, { mode: 'no-cors', credentials: 'omit', cache: 'reload' });
    await cache.put(url, opaque);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Precache MapLibre + Ormoc street tiles (z12–15) while online.
 * Safe to call repeatedly; skips URLs already cached.
 */
export async function warmOrmocMapOffline({
  zooms = [12, 13, 14, 15],
  bounds = ORMOC_BOUNDS,
} = {}) {
  if (typeof caches === 'undefined') return { ok: false, reason: 'no-caches' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }

  const cache = await caches.open(MAP_TILE_CACHE);
  const queue = [MAPLIBRE_CSS, MAPLIBRE_JS];
  zooms.forEach((z) => {
    queue.push(...tilesForBounds(bounds, z));
  });

  let saved = 0;
  const concurrency = 6;
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const idx = cursor;
      cursor += 1;
      const url = queue[idx];
      if (await putInCache(cache, url)) saved += 1;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { ok: true, saved, total: queue.length };
}
