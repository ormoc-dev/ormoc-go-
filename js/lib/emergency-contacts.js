const DB_NAME = 'ormocgo-emergency';
const STORE = 'contacts';
const CACHE_KEY = 'contacts-v1';

export const EMERGENCY_SEED = [
  {
    id: 'hospital-district',
    category: 'hospitals',
    group: 'hospital',
    label: 'Hospital',
    name: 'Ormoc District Hospital',
    phone: '0917 482 3156',
    note: 'Emergency desk',
  },
  {
    id: 'hospital-ospital',
    category: 'hospitals',
    group: 'hospital',
    label: 'Hospital',
    name: 'Ospital ng Ormoc',
    phone: '0918 553 7042',
    note: 'ER hotline',
  },
  {
    id: 'hospital-clinic',
    category: 'hospitals',
    group: 'hospital',
    label: 'Hospital',
    name: 'Ormoc Doctors Clinic',
    phone: '0995 216 8841',
    note: '24/7 sample line',
  },
  {
    id: 'hospital-ambulance',
    category: 'hospitals',
    group: 'hospital',
    label: 'Hospital',
    name: 'City Ambulance Desk',
    phone: '0916 730 4490',
    note: 'Dispatch sample',
  },
  {
    id: 'police-main',
    category: 'police',
    group: 'police',
    label: 'Police',
    name: 'Ormoc City Police Station',
    phone: '0918 704 2291',
    note: 'Main hotline',
  },
  {
    id: 'police-patrol',
    category: 'police',
    group: 'police',
    label: 'Police',
    name: 'PNP Patrol Ormoc',
    phone: '0917 365 8120',
    note: 'Mobile patrol',
  },
  {
    id: 'police-barangay',
    category: 'police',
    group: 'police',
    label: 'Police',
    name: 'Tourist Assistance Desk',
    phone: '0998 441 2763',
    note: 'Sample desk line',
  },
  {
    id: 'police-traffic',
    category: 'police',
    group: 'police',
    label: 'Police',
    name: 'Traffic Unit Ormoc',
    phone: '0915 882 1047',
    note: 'Traffic / road',
  },
];

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
  return list.map((item) => ({
    id: String(item.id || ''),
    category: item.category === 'police' ? 'police' : 'hospitals',
    group: item.group === 'police' ? 'police' : 'hospital',
    label: item.label || (item.group === 'police' ? 'Police' : 'Hospital'),
    name: String(item.name || 'Emergency contact'),
    phone: String(item.phone || ''),
    note: String(item.note || ''),
  })).filter((item) => item.id && item.phone);
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
  const hospitals = [];
  const police = [];
  normalizeList(list).forEach((item) => {
    if (item.group === 'police') police.push(item);
    else hospitals.push(item);
  });
  return { hospitals, police };
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/\s+/g, '')}`;
}
