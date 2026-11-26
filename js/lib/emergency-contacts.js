const DB_NAME = 'ormocgo-emergency';
const STORE = 'contacts';
const CACHE_KEY = 'contacts-v3';

const GROUP_META = {
  national: { category: 'national', group: 'national', label: 'National' },
  rescue: { category: 'rescue', group: 'rescue', label: 'Rescue' },
  police: { category: 'police', group: 'police', label: 'Police' },
  hospital: { category: 'hospitals', group: 'hospital', label: 'Hospital' },
};

export const EMERGENCY_GROUPS = ['national', 'rescue', 'police', 'hospital'];

export const EMERGENCY_SEED = [
  {
    id: 'national-911',
    group: 'national',
    placeId: 'national-911',
    name: 'National Emergency (911)',
    phone: '911',
    note: 'Police, fire, and medical',
  },
  {
    id: 'national-red-cross',
    group: 'national',
    placeId: 'national-red-cross',
    name: 'Philippine Red Cross',
    phone: '143',
    note: 'Ambulance & disaster response',
  },
  {
    id: 'rescue-ormoc-smart',
    group: 'rescue',
    placeId: 'rescue-ormoc',
    name: 'Ormoc Rescue',
    phone: '0921-671-4443',
    note: 'Smart',
    lat: 11.0064,
    lon: 124.6075,
  },
  {
    id: 'rescue-ormoc-globe',
    group: 'rescue',
    placeId: 'rescue-ormoc',
    name: 'Ormoc Rescue',
    phone: '0977-459-3460',
    note: 'Globe',
    lat: 11.0064,
    lon: 124.6075,
  },
  {
    id: 'rescue-ormoc-rapid',
    group: 'rescue',
    placeId: 'rescue-ormoc',
    name: 'Ormoc Rescue',
    phone: '0947-507-1433',
    note: 'Rapid Rescue',
    lat: 11.0064,
    lon: 124.6075,
  },
  {
    id: 'rescue-cdrmm-smart',
    group: 'rescue',
    placeId: 'rescue-cdrmm',
    name: 'CDRRM OPCEN',
    phone: '0998-241-2991',
    note: 'Smart',
    lat: 11.0064,
    lon: 124.6075,
  },
  {
    id: 'rescue-cdrmm-globe',
    group: 'rescue',
    placeId: 'rescue-cdrmm',
    name: 'CDRRM OPCEN',
    phone: '0977-459-3460',
    note: 'Globe',
    lat: 11.0064,
    lon: 124.6075,
  },
  {
    id: 'rescue-bfp-1',
    group: 'rescue',
    placeId: 'rescue-bfp',
    name: 'Bureau of Fire Protection',
    phone: '0907-272-6943',
    note: 'Fire protection',
    lat: 11.0052,
    lon: 124.6084,
  },
  {
    id: 'rescue-bfp-2',
    group: 'rescue',
    placeId: 'rescue-bfp',
    name: 'Bureau of Fire Protection',
    phone: '0915-170-0910',
    note: 'Fire protection',
    lat: 11.0052,
    lon: 124.6084,
  },
  {
    id: 'police-hq',
    group: 'police',
    placeId: 'police-hq',
    name: 'OCPO Headquarters',
    phone: '0998-598-6690',
    note: 'Oscar Base · Camp Downes',
    lat: 10.9987846,
    lon: 124.6168889,
  },
  {
    id: 'police-st1',
    group: 'police',
    placeId: 'police-st1',
    name: 'Station 1 (Cogon)',
    phone: '0998-598-6691',
    note: 'Aunubing St · Cogon',
    lat: 11.014122,
    lon: 124.60351,
  },
  {
    id: 'police-st2',
    group: 'police',
    placeId: 'police-st2',
    name: 'Station 2 (Cagbuhangin)',
    phone: '0998-598-6693',
    note: 'Brgy. Cagbuhangin',
    lat: 11.1014901,
    lon: 124.5842942,
  },
  {
    id: 'police-st3',
    group: 'police',
    placeId: 'police-st3',
    name: 'Station 3 (Liloan)',
    phone: '0998-967-4958',
    note: 'Brgy. Liloan',
    lat: 11.040191,
    lon: 124.549735,
  },
  {
    id: 'police-st4',
    group: 'police',
    placeId: 'police-st4',
    name: 'Station 4 (Linao)',
    phone: '0970-925-0336',
    note: 'Brgy. Linao',
    lat: 11.015168,
    lon: 124.59178,
  },
  {
    id: 'police-st5',
    group: 'police',
    placeId: 'police-st5',
    name: 'Station 5 (Dolores)',
    phone: '0970-061-3278',
    note: 'Brgy. Dolores',
    lat: 11.0759007,
    lon: 124.6296792,
  },
  {
    id: 'police-st6',
    group: 'police',
    placeId: 'police-st6',
    name: 'Station 6 (Ipil)',
    phone: '0970-056-4173',
    note: 'Brgy. Ipil',
    lat: 10.977421,
    lon: 124.632237,
  },
  {
    id: 'hospital-doctors-1',
    group: 'hospital',
    placeId: 'hospital-doctors',
    name: 'Ormoc Doctors’ Hospital',
    phone: '0938-037-0876',
    note: 'Aviles St · Emergency room',
    lat: 11.0049913,
    lon: 124.6118102,
  },
  {
    id: 'hospital-doctors-2',
    group: 'hospital',
    placeId: 'hospital-doctors',
    name: 'Ormoc Doctors’ Hospital',
    phone: '0998-581-9610',
    note: 'Aviles St · Emergency room',
    lat: 11.0049913,
    lon: 124.6118102,
  },
  {
    id: 'hospital-ospital-1',
    group: 'hospital',
    placeId: 'hospital-ospital',
    name: 'OSP A Farmers’ Medical Center',
    phone: '0945-433-1306',
    note: 'Can-adieng · Emergency room',
    lat: 11.0040679,
    lon: 124.6144815,
  },
  {
    id: 'hospital-ospital-2',
    group: 'hospital',
    placeId: 'hospital-ospital',
    name: 'OSP A Farmers’ Medical Center',
    phone: '0905-296-6894',
    note: 'Can-adieng · Emergency room',
    lat: 11.0040679,
    lon: 124.6144815,
  },
  {
    id: 'hospital-gatchalian-1',
    group: 'hospital',
    placeId: 'hospital-gatchalian',
    name: 'Clinica Gatchalian & Hospital',
    phone: '(053) 561-17937',
    note: 'Kangleon St · Landline',
    lat: 11.0110983,
    lon: 124.6095434,
  },
  {
    id: 'hospital-gatchalian-2',
    group: 'hospital',
    placeId: 'hospital-gatchalian',
    name: 'Clinica Gatchalian & Hospital',
    phone: '0949-151-2014',
    note: 'Kangleon St · Emergency room',
    lat: 11.0110983,
    lon: 124.6095434,
  },
  {
    id: 'hospital-district',
    group: 'hospital',
    placeId: 'hospital-district',
    name: 'Ormoc District Hospital',
    phone: '0985-351-7379',
    note: 'Merida–Ormoc Road · Emergency room',
    lat: 11.0226196,
    lon: 124.6031503,
  },
];

const SEED_BY_ID = new Map(EMERGENCY_SEED.map((item) => [item.id, item]));

function resolveGroup(item = {}) {
  if (item.group === 'national' || item.category === 'national') return 'national';
  if (item.group === 'rescue' || item.category === 'rescue') return 'rescue';
  if (item.group === 'police' || item.category === 'police') return 'police';
  return 'hospital';
}

function toCoord(value, fallback) {
  if (value === null || value === undefined || value === '') {
    if (fallback === null || fallback === undefined || fallback === '') return null;
    const fb = Number(fallback);
    return Number.isFinite(fb) ? fb : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open emergency storage'));
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Storage request failed'));
  });
}

function normalizeList(list) {
  if (!Array.isArray(list) || !list.length) return EMERGENCY_SEED.map((item) => ({ ...item }));
  return list.map((item) => {
    const group = resolveGroup(item);
    const meta = GROUP_META[group];
    const seed = SEED_BY_ID.get(String(item.id || '')) || {};
    return {
      id: String(item.id || ''),
      category: meta.category,
      group: meta.group,
      placeId: String(item.placeId || seed.placeId || item.id || ''),
      label: item.label || meta.label,
      name: String(item.name || seed.name || 'Emergency contact'),
      phone: String(item.phone || seed.phone || ''),
      note: String(item.note || seed.note || ''),
      lat: toCoord(item.lat, seed.lat),
      lon: toCoord(item.lon, seed.lon),
    };
  }).filter((item) => item.id && item.phone);
}

export function distanceKm(from, to) {
  if (!from || !to) return null;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon ?? from.lng);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon ?? to.lng);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = (
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  );
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m away`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

export function withDistance(list, userPos) {
  return normalizeList(list).map((item) => {
    const km = distanceKm(userPos, item);
    return {
      ...item,
      distanceKm: km,
      distanceLabel: formatDistance(km),
    };
  });
}

export function sortByDistance(list = []) {
  return [...list].sort((a, b) => {
    const da = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
    const db = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return String(a.name).localeCompare(String(b.name));
  });
}

/** Unique places (by placeId), nearest first — one phone line per place. */
export function getNearestPlaces(list = [], { groups = ['hospital', 'police', 'rescue'], limit = 3 } = {}) {
  const sorted = sortByDistance(
    list.filter((item) => groups.includes(item.group) && Number.isFinite(item.distanceKm)),
  );
  const seen = new Set();
  const out = [];
  sorted.forEach((item) => {
    const key = item.placeId || item.name;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out.slice(0, limit);
}

export async function saveEmergencyContacts(list = EMERGENCY_SEED) {
  const contacts = normalizeList(list);
  const payload = {
    contacts,
    updatedAt: Date.now(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  await idbRequest(tx.objectStore(STORE).put(payload, CACHE_KEY));
  db.close();
  return contacts;
}

export async function getEmergencyContacts() {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const row = await idbRequest(tx.objectStore(STORE).get(CACHE_KEY));
    db.close();
    if (row?.contacts?.length) return normalizeList(row.contacts);
  } catch (err) {
    console.warn('[OrmocGo] Emergency cache read failed', err);
  }
  return saveEmergencyContacts(EMERGENCY_SEED);
}

export async function ensureEmergencyContactsCached() {
  return getEmergencyContacts();
}

export function groupEmergencyContacts(list) {
  const national = [];
  const rescue = [];
  const hospitals = [];
  const police = [];
  (Array.isArray(list) ? list : []).forEach((raw) => {
    const [item] = normalizeList([raw]);
    if (!item) return;
    const enriched = {
      ...item,
      distanceKm: Number.isFinite(raw.distanceKm) ? raw.distanceKm : item.distanceKm,
      distanceLabel: raw.distanceLabel || item.distanceLabel || '',
    };
    if (enriched.group === 'national') national.push(enriched);
    else if (enriched.group === 'rescue') rescue.push(enriched);
    else if (enriched.group === 'police') police.push(enriched);
    else hospitals.push(enriched);
  });
  return {
    national,
    rescue: sortByDistance(rescue),
    hospitals: sortByDistance(hospitals),
    police: sortByDistance(police),
  };
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
}
