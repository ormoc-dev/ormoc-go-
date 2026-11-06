/**
 * Google Maps (roadmap / satellite) + Nominatim search + OSRM routing for Ormoc.
 */

import { getEnv } from '../env.js';

export const ORMOC_CENTER = { lat: 11.0064, lng: 124.6075 };
export const ORMOC_ZOOM = 14;

/** Rough bounding box around Ormoc City */
export const ORMOC_BOUNDS = {
  south: 10.94,
  north: 11.10,
  west: 124.50,
  east: 124.72,
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

/** Nominatim free-text does not support OR — use multiple queries per category. */
const CATEGORY_QUERIES = {
  home: null,
  malls: [
    'SM Center Ormoc',
    'Robinsons Ormoc',
    'Gaisano Riverside Mall Ormoc',
    'Gaisano Ormoc',
    'The Point Mall Ormoc',
    'A Mall Ormoc',
    'mall Ormoc City',
    'supermarket Ormoc City',
  ],
  schools: [
    'school Ormoc City',
    'university Ormoc City',
    'college Ormoc City',
  ],
  hospitals: [
    'hospital Ormoc City',
    'clinic Ormoc City',
    'Ormoc Doctor Hospital',
    'Ospa Farmers Medical Center',
  ],
  police: [
    'police station Ormoc City',
    'Ormoc City Police Station',
    'PNP Ormoc',
  ],
  parks: [
    'park Ormoc City',
    'Lake Danao Ormoc',
    'plaza Ormoc City',
  ],
  food: [
    'restaurant Ormoc City',
    'cafe Ormoc City',
    'fast food Ormoc City',
  ],
  churches: [
    'church Ormoc City',
    'cathedral Ormoc City',
    'chapel Ormoc City',
  ],
  terminals: [
    'bus terminal Ormoc',
    'Ormoc City Terminal',
    'port Ormoc',
    'van terminal Ormoc',
  ],
};

/** Known Ormoc landmarks as reliable demo fallbacks when search is incomplete. */
const CATEGORY_LANDMARKS = {
  police: [
    {
      lat: 11.0057554,
      lon: 124.6087846,
      name: 'Ormoc City Police Station 1',
      display_name: 'Ormoc City Police Station 1, Jose G. Navarro Street, Ormoc City, Leyte',
    },
  ],
  malls: [
    {
      lat: 11.0109513,
      lon: 124.6077107,
      name: 'SM Center Ormoc',
      display_name: 'SM Center Ormoc, Real Street, Ormoc City, Leyte',
    },
    {
      lat: 11.0251080,
      lon: 124.6052122,
      name: 'Robinsons Ormoc',
      display_name: 'Robinsons Ormoc, Doña Feliza Z. Mejia, Ormoc City, Leyte',
    },
    {
      lat: 11.0076794,
      lon: 124.6043442,
      name: 'Gaisano Riverside Mall',
      display_name: 'Gaisano Riverside Mall, War Veterans Avenue, Ormoc City, Leyte',
    },
    {
      lat: 11.0075125,
      lon: 124.6081604,
      name: 'The Point Mall',
      display_name: 'The Point Mall, Rizal Street, Ormoc City, Leyte',
    },
    {
      lat: 11.0061676,
      lon: 124.6078076,
      name: 'A Mall',
      display_name: 'A Mall, Rizal Street, Ormoc City, Leyte',
    },
    {
      lat: 11.0069,
      lon: 124.6072,
      name: 'SM Hypermarket Ormoc',
      display_name: 'SM Hypermarket, Ormoc City, Leyte',
    },
  ],
  hospitals: [
    {
      lat: 11.0115,
      lon: 124.6068,
      name: 'Ormoc Doctor Hospital',
      display_name: 'Ormoc Doctor Hospital, Ormoc City, Leyte',
    },
    {
      lat: 11.0088,
      lon: 124.6095,
      name: 'Ospa Farmers Medical Center',
      display_name: 'Ospa Farmers Medical Center, Ormoc City, Leyte',
    },
  ],
  terminals: [
    {
      lat: 11.0052,
      lon: 124.6108,
      name: 'Ormoc City Terminal',
      display_name: 'Ormoc City Terminal, Ormoc City, Leyte',
    },
    {
      lat: 11.0018,
      lon: 124.6079,
      name: 'Ormoc Port',
      display_name: 'Ormoc Port, Ormoc City, Leyte',
    },
  ],
  parks: [
    {
      lat: 11.071,
      lon: 124.70,
      name: 'Lake Danao',
      display_name: 'Lake Danao Natural Park, Ormoc City, Leyte',
    },
  ],
};

const SUGGEST_LANDMARKS = Object.values(CATEGORY_LANDMARKS).flat();

const LIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

/** Layer ids used by the Map layers picker. */
export const MAP_LAYERS = [
  { id: 'streets', label: 'Streets' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'google', label: 'Google Map' },
];

const LAYER_CONFIG = {
  streets: { mapTypeId: 'roadmap', styles: null },
  light: { mapTypeId: 'roadmap', styles: LIGHT_STYLE },
  dark: { mapTypeId: 'roadmap', styles: DARK_STYLE },
  satellite: { mapTypeId: 'hybrid', styles: null },
  terrain: { mapTypeId: 'terrain', styles: null },
  google: { mapTypeId: 'roadmap', styles: null },
  roadmap: { mapTypeId: 'roadmap', styles: null },
};

/** Convert lat/lng + zoom to XYZ tile indexes (same as GPS layers panel). */
function latLngToTile(lat, lng, zoom) {
  const n = 2 ** zoom;
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { tileX, tileY, zoom };
}

/**
 * Real map tile preview URLs for layer thumbnails (ArcGIS / OSM / OpenTopoMap).
 * Returns a string or string[] (stacked overlays), matching gps_pwa basemaps.js.
 */
export function getLayerPreviewUrl(layerId, { zoom = 12 } = {}) {
  const { tileX, tileY } = latLngToTile(ORMOC_CENTER.lat, ORMOC_CENTER.lng, zoom);
  const streets = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  const imagery = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
  const places = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${zoom}/${tileY}/${tileX}`;
  const roads = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/${zoom}/${tileY}/${tileX}`;

  const previews = {
    streets,
    light: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${tileY}/${tileX}`,
    dark: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${tileY}/${tileX}`,
    satellite: [places, roads, imagery],
    terrain: `https://a.tile.opentopomap.org/${zoom}/${tileX}/${tileY}.png`,
    google: streets,
  };

  return previews[layerId] || streets;
}

/** CSS background-image value for a layer thumb. */
export function getLayerPreviewBackground(layerId) {
  const preview = getLayerPreviewUrl(layerId);
  if (Array.isArray(preview)) {
    return preview.map((url) => `url('${url}')`).join(', ');
  }
  return preview ? `url('${preview}')` : '';
}

/**
 * Demo Street View iframe embed (no Street View JS / Static API).
 * Uses the classic Google Maps svembed URL.
 */
export function getStreetViewEmbedUrl(place) {
  const lat = Number(place.lat);
  const lon = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  return (
    'https://www.google.com/maps'
    + `?layer=c&cbll=${encodeURIComponent(`${lat},${lon}`)}`
    + '&cbp=12,0,0,0,0&hl=en&output=svembed'
  );
}

let mapsPromise = null;

function getMapsApiKey() {
  const env = getEnv();
  return (
    env.GOOGLE_MAPS_API_KEY
    || env.GOOGLE_MAPS_KEY
    || ''
  ).trim();
}

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const key = getMapsApiKey();
  if (!key) {
    return Promise.reject(new Error('Google Maps API key is missing. Set GOOGLE_MAPS_API_KEY in Vercel env (Production) or .env.production, then redeploy.'));
  }

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__ormocgoMapsInit_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps failed to initialize'));
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('Could not load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function createOrmocMap(container, { locate = true, mapType = 'google' } = {}) {
  return loadGoogleMaps().then((maps) => {
    const initial = LAYER_CONFIG[mapType] || LAYER_CONFIG.google;
    const map = new maps.Map(container, {
      center: ORMOC_CENTER,
      zoom: ORMOC_ZOOM,
      mapTypeId: initial.mapTypeId,
      styles: initial.styles || undefined,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: true,
      gestureHandling: 'greedy',
    });

    const markers = [];
    const routeOverlays = [];
    let userMarker = null;
    let userAccuracy = null;
    let routeStartMarker = null;
    let infoWindow = new maps.InfoWindow();

    function openPlaceCard(place, marker = null) {
      const title = escapeHtml(place.name || 'Place');
      const subtitle = escapeHtml(place.display_name || '');
      const embedUrl = getStreetViewEmbedUrl(place);
      infoWindow.setContent(`
        <div class="place-iw">
          ${embedUrl ? `
            <iframe
              class="place-iw-street"
              src="${embedUrl}"
              title="Street View"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            ></iframe>
          ` : '<div class="place-iw-street is-empty">No Street View</div>'}
          <div class="place-iw-copy">
            <strong>${title}</strong>
            <div class="place-iw-sub">${subtitle}</div>
          </div>
        </div>
      `);

      if (marker) infoWindow.open({ map, anchor: marker });
      else {
        infoWindow.setPosition({ lat: Number(place.lat), lng: Number(place.lon) });
        infoWindow.open(map);
      }
    }

    const api = {
      maps,
      map,
      clearMarkers() {
        infoWindow.close();
        markers.splice(0).forEach((marker) => marker.setMap(null));
      },
      clearRoute() {
        routeOverlays.splice(0).forEach((overlay) => overlay.setMap(null));
      },
      setMapType(type) {
        const next = LAYER_CONFIG[type] || LAYER_CONFIG.google;
        map.setOptions({
          mapTypeId: next.mapTypeId,
          styles: next.styles || [],
        });
      },
      setStatusMarkers(places = []) {
        api.clearMarkers();
        const bounds = new maps.LatLngBounds();
        let count = 0;

        places.forEach((place) => {
          const lat = Number(place.lat);
          const lon = Number(place.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const position = { lat, lng: lon };
          const marker = new maps.Marker({
            map,
            position,
            title: place.name || 'Place',
          });
          marker.addListener('click', () => openPlaceCard(place, marker));
          markers.push(marker);
          bounds.extend(position);
          count += 1;
        });

        if (count === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(16);
        } else if (count > 1) {
          map.fitBounds(bounds, 64);
        }
      },
      focusPlace(place, { zoom = 17 } = {}) {
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        map.panTo({ lat, lng: lon });
        map.setZoom(zoom);
        openPlaceCard(place);
      },
      setUserLocation(latlng, {
        accuracy = 0,
        heading = null,
        follow = false,
        moveStart = false,
      } = {}) {
        const position = Array.isArray(latlng)
          ? { lat: latlng[0], lng: latlng[1] }
          : { lat: Number(latlng.lat), lng: Number(latlng.lng ?? latlng.lon) };
        if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

        const headingDeg = Number.isFinite(heading) ? heading : null;
        const icon = headingDeg == null
          ? {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#1a73e8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }
          : {
            path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#1a73e8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: headingDeg,
          };

        if (!userMarker) {
          userMarker = new maps.Marker({
            map,
            position,
            title: 'You are here',
            zIndex: 999,
            icon,
          });
        } else {
          userMarker.setPosition(position);
          userMarker.setIcon(icon);
        }

        const radius = Math.max(12, Math.min(80, Number(accuracy) || 0));
        if (!userAccuracy) {
          userAccuracy = new maps.Circle({
            map,
            center: position,
            radius,
            fillColor: '#1a73e8',
            fillOpacity: 0.14,
            strokeColor: '#1a73e8',
            strokeOpacity: 0.28,
            strokeWeight: 1,
            clickable: false,
            zIndex: 1,
          });
        } else {
          userAccuracy.setCenter(position);
          userAccuracy.setRadius(radius);
        }

        if (moveStart && routeStartMarker) {
          routeStartMarker.setPosition(position);
        }

        if (follow) {
          map.panTo(position);
        }
      },
      clearUserLocation() {
        if (userMarker) {
          userMarker.setMap(null);
          userMarker = null;
        }
        if (userAccuracy) {
          userAccuracy.setMap(null);
          userAccuracy = null;
        }
      },
      drawRoute(coordinates = [], summary = {}) {
        api.clearRoute();
        routeStartMarker = null;
        if (!coordinates.length) return;

        // OSRM returns [lon, lat]
        const path = coordinates.map(([lon, lat]) => ({ lat, lng: lon }));
        const line = new maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#2563eb',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map,
        });
        routeOverlays.push(line);

        const start = path[0];
        const end = path[path.length - 1];
        const liveStart = Boolean(summary.liveStart);

        if (!liveStart) {
          routeStartMarker = new maps.Marker({
            map,
            position: start,
            title: 'Start',
            label: { text: 'A', color: '#fff', fontWeight: '700' },
          });
          routeOverlays.push(routeStartMarker);
        }

        routeOverlays.push(new maps.Marker({
          map,
          position: end,
          title: summary.label || 'Destination',
          label: { text: 'B', color: '#fff', fontWeight: '700' },
        }));

        if (summary.fit !== false) {
          const bounds = new maps.LatLngBounds();
          path.forEach((point) => bounds.extend(point));
          if (liveStart && userMarker) {
            bounds.extend(userMarker.getPosition());
          }
          map.fitBounds(bounds, 72);
        }
      },
      invalidate() {
        setTimeout(() => {
          maps.event.trigger(map, 'resize');
        }, 60);
      },
    };

    if (locate && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          api.setUserLocation(latlng);
          const inOrmoc = (
            latlng.lat >= ORMOC_BOUNDS.south
            && latlng.lat <= ORMOC_BOUNDS.north
            && latlng.lng >= ORMOC_BOUNDS.west
            && latlng.lng <= ORMOC_BOUNDS.east
          );
          if (inOrmoc) {
            map.setCenter(latlng);
            map.setZoom(15);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    setTimeout(() => maps.event.trigger(map, 'resize'), 120);
    return api;
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizePlace(item) {
  return {
    lat: item.lat,
    lon: item.lon,
    name: item.name || item.display_name?.split(',')[0] || 'Place',
    display_name: item.display_name,
    type: item.type,
  };
}

function placeKey(place) {
  const lat = Number(place.lat).toFixed(4);
  const lon = Number(place.lon).toFixed(4);
  const name = String(place.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${name}|${lat}|${lon}`;
}

function mergePlaces(...lists) {
  const out = [];
  const seen = new Set();
  lists.flat().forEach((place) => {
    if (!place) return;
    const key = placeKey(place);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(place);
  });
  return out;
}

function matchLandmarks(query, limit = 6) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return SUGGEST_LANDMARKS
    .filter((place) => {
      const hay = `${place.name} ${place.display_name}`.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    })
    .slice(0, limit)
    .map((place) => ({ ...place }));
}

export async function searchPlaces(query, { limit = 8, bounded = true } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set('q', /ormoc/i.test(q) ? q : `${q}, Ormoc City, Leyte, Philippines`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('viewbox', `${ORMOC_BOUNDS.west},${ORMOC_BOUNDS.north},${ORMOC_BOUNDS.east},${ORMOC_BOUNDS.south}`);
  // Keep soft bias by viewbox; do not force bounded for brand names like SM / Robinsons.
  if (bounded) url.searchParams.set('bounded', '1');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  return (data || []).map(normalizePlace);
}

/** Instant local landmarks + Nominatim results for the directions suggest list. */
export async function suggestPlaces(query, { limit = 6 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const local = matchLandmarks(q, limit);
  let remote = [];
  try {
    remote = await searchPlaces(q, { limit, bounded: false });
  } catch (_) {
    remote = [];
  }

  return mergePlaces(local, remote).slice(0, limit);
}

async function searchOverpass(filters, { fallbackName = 'Place', typeKey = 'amenity' } = {}) {
  const { south, north, west, east } = ORMOC_BOUNDS;
  const bbox = `${south},${west},${north},${east}`;
  const parts = filters.flatMap((filter) => ([
    `node${filter}(${bbox});`,
    `way${filter}(${bbox});`,
    `relation${filter}(${bbox});`,
  ])).join('\n');

  const query = `
    [out:json][timeout:20];
    (
      ${parts}
    );
    out center tags 30;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.elements || []).map((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const name = el.tags?.name || el.tags?.brand || fallbackName;
    return {
      lat,
      lon,
      name,
      display_name: [name, el.tags?.['addr:street'], 'Ormoc City, Leyte'].filter(Boolean).join(', '),
      type: el.tags?.[typeKey] || el.tags?.shop || typeKey,
    };
  }).filter(Boolean);
}

/** Overpass: shop=mall / department_store / supermarket inside Ormoc bbox. */
function searchMallsOverpass() {
  return searchOverpass([
    '["shop"="mall"]',
    '["shop"="department_store"]',
    '["shop"="supermarket"]',
    '["name"~"SM|Robinsons|Gaisano|Mall",i]["shop"]',
  ], { fallbackName: 'Mall', typeKey: 'shop' });
}

function searchPoliceOverpass() {
  return searchOverpass([
    '["amenity"="police"]',
  ], { fallbackName: 'Police Station', typeKey: 'amenity' });
}

export async function searchCategory(categoryId, { limit = 16 } = {}) {
  if (categoryId === 'home') {
    return [{
      lat: ORMOC_CENTER.lat,
      lon: ORMOC_CENTER.lng,
      name: 'Ormoc City Center',
      display_name: 'Ormoc City, Leyte, Philippines',
    }];
  }

  const queries = CATEGORY_QUERIES[categoryId];
  if (!queries?.length) return [];

  const landmarkSeed = CATEGORY_LANDMARKS[categoryId] || [];

  const settled = await Promise.allSettled([
    ...(categoryId === 'malls' ? [searchMallsOverpass()] : []),
    ...(categoryId === 'police' ? [searchPoliceOverpass()] : []),
    ...queries.map((q) => searchPlaces(q, {
      limit: 5,
      // Brand lookups should not be strictly boxed or SM/Robinsons can be missed.
      bounded: !/sm|robinsons|gaisano/i.test(q),
    })),
  ]);

  const found = settled
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);

  return mergePlaces(landmarkSeed, ...found).slice(0, limit);
}

async function routeByProfile(from, to, profile) {
  const url = (
    `${OSRM}/route/v1/${profile}/`
    + `${from.lon},${from.lat};${to.lon},${to.lat}`
    + '?overview=full&geometries=geojson&steps=false'
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(`No ${profile} route found`);
  }
  const route = data.routes[0];
  return {
    profile,
    coordinates: route.geometry.coordinates,
    distanceM: route.distance,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

export async function routeDriving(from, to) {
  return routeByProfile(from, to, 'driving');
}

/** Speeds used when OSRM has no dedicated profile (m/s). */
const MODE_SPEED_MS = {
  run: 2.8,        // ~10 km/h jogging
  motorcycle: 11.1, // ~40 km/h city
};

function durationFromDistance(distanceM, speedMs) {
  return Math.max(1, (distanceM / speedMs) / 60);
}

function buildMode(id, label, icon, base, durationMin) {
  return {
    id,
    label,
    icon,
    coordinates: base.coordinates,
    distanceKm: base.distanceKm,
    durationMin,
  };
}

/**
 * Compare travel options between two points.
 * Walk / bike / car from OSRM; run & motorcycle estimated from path distance.
 */
export async function routeAllModes(from, to) {
  const [walk, bike, drive] = await Promise.all([
    routeByProfile(from, to, 'walking'),
    routeByProfile(from, to, 'cycling'),
    routeByProfile(from, to, 'driving'),
  ]);

  return [
    buildMode('walk', 'Walk', 'walk', walk, walk.durationMin),
    buildMode('run', 'Run', 'run', walk, durationFromDistance(walk.distanceM, MODE_SPEED_MS.run)),
    buildMode('bike', 'Bike', 'bike', bike, bike.durationMin),
    buildMode('motorcycle', 'Motor', 'motor', drive, durationFromDistance(drive.distanceM, MODE_SPEED_MS.motorcycle)),
    buildMode('car', 'Car', 'car', drive, drive.durationMin),
  ];
}

export function formatRouteSummary(route) {
  const km = route.distanceKm < 10
    ? route.distanceKm.toFixed(1)
    : Math.round(route.distanceKm);
  const mins = Math.max(1, Math.round(route.durationMin));
  return `${km} km · about ${mins} min`;
}

export function formatModeMinutes(durationMin) {
  const mins = Math.max(1, Math.round(durationMin));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
