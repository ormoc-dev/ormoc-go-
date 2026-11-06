const PLACES_KEY = 'ormocgo.saved.places';
const ROUTES_KEY = 'ormocgo.saved.routes';

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function placeId(place) {
  if (place?.id) return String(place.id);
  const lat = Number(place?.lat);
  const lon = Number(place?.lon ?? place?.lng);
  const name = String(place?.name || place?.label || 'place').toLowerCase().replace(/\s+/g, '-');
  return `${name}:${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function routeId(route) {
  if (route?.id) return String(route.id);
  const from = String(route?.from?.label || '').toLowerCase();
  const to = String(route?.to?.label || '').toLowerCase();
  return `${from}->${to}:${Number(route?.from?.lat).toFixed(4)},${Number(route?.to?.lat).toFixed(4)}`;
}

export function listSavedPlaces() {
  return readList(PLACES_KEY);
}

export function listSavedRoutes() {
  return readList(ROUTES_KEY);
}

export function isPlaceSaved(place) {
  const id = placeId(place);
  return listSavedPlaces().some((item) => item.id === id);
}

export function isRouteSaved(route) {
  const id = routeId(route);
  return listSavedRoutes().some((item) => item.id === id);
}

export function savePlace(place) {
  const id = placeId(place);
  const list = listSavedPlaces().filter((item) => item.id !== id);
  const next = {
    id,
    name: place.name || place.label || 'Saved place',
    display_name: place.display_name || place.blurb || '',
    image: place.image || '',
    category: place.category || 'Place',
    rating: place.rating ?? null,
    reviews: place.reviews ?? null,
    lat: Number(place.lat),
    lon: Number(place.lon ?? place.lng),
    savedAt: Date.now(),
  };
  list.unshift(next);
  writeList(PLACES_KEY, list.slice(0, 40));
  return next;
}

export function removeSavedPlace(id) {
  writeList(PLACES_KEY, listSavedPlaces().filter((item) => item.id !== String(id)));
}

export function toggleSavedPlace(place) {
  const id = placeId(place);
  if (isPlaceSaved(place)) {
    removeSavedPlace(id);
    return false;
  }
  savePlace(place);
  return true;
}

export function saveRoute(route) {
  const id = routeId(route);
  const list = listSavedRoutes().filter((item) => item.id !== id);
  const next = {
    id,
    from: {
      label: route.from?.label || 'Start',
      lat: Number(route.from?.lat),
      lon: Number(route.from?.lon),
    },
    to: {
      label: route.to?.label || 'Destination',
      lat: Number(route.to?.lat),
      lon: Number(route.to?.lon),
    },
    modeId: route.modeId || 'car',
    modeLabel: route.modeLabel || 'Car',
    durationMin: Number(route.durationMin) || 0,
    distanceKm: Number(route.distanceKm) || 0,
    savedAt: Date.now(),
  };
  list.unshift(next);
  writeList(ROUTES_KEY, list.slice(0, 30));
  return next;
}

export function removeSavedRoute(id) {
  writeList(ROUTES_KEY, listSavedRoutes().filter((item) => item.id !== String(id)));
}

export function toggleSavedRoute(route) {
  const id = routeId(route);
  if (isRouteSaved(route)) {
    removeSavedRoute(id);
    return false;
  }
  saveRoute(route);
  return true;
}
