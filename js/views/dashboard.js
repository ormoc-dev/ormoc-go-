import { getAppName, getEnv } from '../env.js';
import { getSupabase } from '../supabase.js';
import { goToPage } from '../lib/navigate.js';
import { renderBottomSheets, mountBottomSheets, openAuthSheet } from '../components/bottom-sheet.js';
import {
  createOrmocMap,
  searchPlaces,
  suggestPlaces,
  searchCategory,
  routeAllModes,
  formatModeMinutes,
  ORMOC_CENTER,
  MAP_LAYERS,
  getLayerPreviewBackground,
} from '../lib/ormoc-map.js';
import {
  listSavedPlaces,
  listSavedRoutes,
  listSavedCommunity,
  isPlaceSaved,
  isRouteSaved,
  isCommunitySaved,
  toggleSavedPlace,
  toggleSavedRoute,
  toggleSavedCommunity,
  removeSavedPlace,
  removeSavedRoute,
  removeSavedCommunity,
} from '../lib/saved.js';
import {
  getUserProfile,
  hydrateUserProfile,
  saveUserProfile,
  saveUserResume,
  getUserResumeBlob,
  removeUserResume,
  resumeLimitLabel,
  formatFileSize,
} from '../lib/user-profile.js';
import {
  EMERGENCY_SEED,
  EMERGENCY_GROUPS,
  ensureEmergencyContactsCached,
  getNearestPlaces,
  groupEmergencyContacts,
  telHref,
  withDistance,
} from '../lib/emergency-contacts.js';

const TABS = [
  { id: 'map', label: 'Map', icon: iconMap },
  { id: 'routes', label: 'Routes', icon: iconRoutes },
  { id: 'community', label: 'Community', icon: iconCommunity },
  { id: 'saved', label: 'Saved', icon: iconSaved },
  { id: 'more', label: 'More', icon: iconMore },
];

const TAB_STORAGE_KEY = 'ormocgo.dash.tab';
const MORE_VIEW_STORAGE_KEY = 'ormocgo.dash.moreView';
const PROFILE_DRAFT_KEY = 'ormocgo.dash.profileDraft';
const VALID_TABS = new Set(TABS.map((tab) => tab.id));
const VALID_MORE_VIEWS = new Set(['home', 'profile']);

function profileDraftKey(user) {
  return `${PROFILE_DRAFT_KEY}.${user?.id || 'local'}`;
}

function readProfileDraft(user) {
  try {
    const raw = sessionStorage.getItem(profileDraftKey(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      fullName: String(parsed.fullName || ''),
      about: String(parsed.about || ''),
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 24)
        : [],
    };
  } catch (_) {
    return null;
  }
}

function writeProfileDraft(user, draft) {
  try {
    sessionStorage.setItem(profileDraftKey(user), JSON.stringify({
      fullName: String(draft.fullName || ''),
      about: String(draft.about || ''),
      skills: Array.isArray(draft.skills) ? draft.skills.slice(0, 24) : [],
      updatedAt: Date.now(),
    }));
  } catch (_) {
    /* ignore */
  }
}

function clearProfileDraft(user) {
  try {
    sessionStorage.removeItem(profileDraftKey(user));
  } catch (_) {
    /* ignore */
  }
}

function readStoredTab() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('tab');
    if (VALID_TABS.has(fromQuery)) return fromQuery;
  } catch (_) {
    /* ignore */
  }
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (VALID_TABS.has(stored)) return stored;
  } catch (_) {
    /* ignore */
  }
  return 'map';
}

function readStoredMoreView() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('view');
    if (VALID_MORE_VIEWS.has(fromQuery)) return fromQuery;
  } catch (_) {
    /* ignore */
  }
  try {
    const stored = localStorage.getItem(MORE_VIEW_STORAGE_KEY);
    if (VALID_MORE_VIEWS.has(stored)) return stored;
  } catch (_) {
    /* ignore */
  }
  return 'home';
}

function persistTab(tabId) {
  if (!VALID_TABS.has(tabId)) return;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tabId);
  } catch (_) {
    /* ignore */
  }
  try {
    const url = new URL(window.location.href);
    if (tabId === 'map') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tabId);
    if (tabId !== 'more') url.searchParams.delete('view');
    else if (readStoredMoreView() === 'profile') url.searchParams.set('view', 'profile');
    window.history.replaceState(window.history.state, '', url);
  } catch (_) {
    /* ignore */
  }
}

function persistMoreView(view) {
  const next = view === 'profile' ? 'profile' : 'home';
  try {
    localStorage.setItem(MORE_VIEW_STORAGE_KEY, next);
  } catch (_) {
    /* ignore */
  }
  try {
    const url = new URL(window.location.href);
    if (next === 'profile') {
      url.searchParams.set('tab', 'more');
      url.searchParams.set('view', 'profile');
    } else {
      url.searchParams.delete('view');
    }
    window.history.replaceState(window.history.state, '', url);
  } catch (_) {
    /* ignore */
  }
}

const MAP_CATEGORIES = [
  { id: 'home', label: 'Home' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'police', label: 'Police' },
  { id: 'parks', label: 'Parks' },
  { id: 'food', label: 'Food' },
  { id: 'churches', label: 'Churches' },
  { id: 'terminals', label: 'Terminals' },
  { id: 'malls', label: 'Malls' },
  { id: 'schools', label: 'Schools' },
];

function renderEmergencyRows(list) {
  return list.map((item) => {
    const metaParts = [item.distanceLabel, item.note].filter(Boolean);
    const hasMap = Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
    const mapBtn = hasMap ? `
      <button
        type="button"
        class="map-emergency-locate"
        data-emergency-locate
        data-lat="${escapeHtml(String(item.lat))}"
        data-lon="${escapeHtml(String(item.lon))}"
        data-name="${escapeHtml(item.name)}"
        data-phone="${escapeHtml(item.phone || '')}"
        data-note="${escapeHtml(item.note || '')}"
        aria-label="Show ${escapeHtml(item.name)} on map"
        title="Show on map"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7-5.4-7-11a7 7 0 1 1 14 0c0 5.6-7 11-7 11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      </button>
    ` : '';
    return `
    <div class="map-emergency-row${item.isNearest ? ' is-nearest' : ''}" data-emergency-id="${escapeHtml(item.id)}">
      <div class="map-emergency-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <a class="map-emergency-phone" href="${escapeHtml(telHref(item.phone))}">${escapeHtml(item.phone)}</a>
        <span class="map-emergency-meta">${escapeHtml(metaParts.join(' · '))}</span>
      </div>
      <div class="map-emergency-actions">
        ${mapBtn}
        <a class="map-emergency-call" href="${escapeHtml(telHref(item.phone))}" aria-label="Call ${escapeHtml(item.name)}" title="Call">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.2 3.8h2.1c.6 0 1.1.4 1.2 1l.4 2.3a1.2 1.2 0 0 1-.3 1.1l-1.3 1.3a12.2 12.2 0 0 0 4.2 4.2l1.3-1.3a1.2 1.2 0 0 1 1.1-.3l2.3.4c.6.1 1 .6 1 1.2v2.1a1.2 1.2 0 0 1-1.3 1.2A14.8 14.8 0 0 1 3.8 5.1a1.2 1.2 0 0 1 1.2-1.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  `;
  }).join('');
}

function renderEmergencyListHtml(contacts = EMERGENCY_SEED, activeGroup = 'national') {
  const grouped = groupEmergencyContacts(contacts);
  const tab = EMERGENCY_GROUPS.includes(activeGroup) ? activeGroup : 'national';
  const rowsByTab = {
    national: grouped.national,
    rescue: grouped.rescue,
    police: grouped.police,
    hospital: grouped.hospitals,
  };
  const rows = rowsByTab[tab] || [];
  const mapCategory = tab === 'police' ? 'police' : tab === 'hospital' ? 'hospitals' : '';
  const tabLabels = {
    national: 'National',
    rescue: 'Rescue',
    police: 'Police',
    hospital: 'Hospital',
  };
  const nearestId = rows.find((item) => Number.isFinite(item.distanceKm))?.id;
  const rankedRows = rows.map((item, index) => ({
    ...item,
    isNearest: Boolean(nearestId) && item.id === nearestId && index === 0,
  }));
  const sortedHint = (tab === 'police' || tab === 'hospital' || tab === 'rescue')
    && rankedRows.some((item) => item.distanceLabel)
    ? ' · nearest first'
    : '';
  return `
    <div class="map-emergency-tabs" role="tablist" aria-label="Emergency categories">
      ${EMERGENCY_GROUPS.map((id) => `
        <button type="button" class="map-emergency-tab${tab === id ? ' is-active' : ''}" role="tab" aria-selected="${tab === id ? 'true' : 'false'}" data-emergency-tab="${id}">${tabLabels[id]}</button>
      `).join('')}
    </div>
    <div class="map-emergency-toolbar">
      <p class="map-emergency-count">${rankedRows.length} contact${rankedRows.length === 1 ? '' : 's'}${sortedHint}</p>
      ${mapCategory ? `<button type="button" class="map-emergency-map" data-emergency-category="${mapCategory}">Show on map</button>` : '<span></span>'}
    </div>
    <div class="map-emergency-rows" role="tabpanel">${renderEmergencyRows(rankedRows)}</div>
  `;
}

/** Local favorites + photos from chillandtravel.com/ormoc-tourist-spots */
const TOURIST_SPOTS = [
  {
    id: 'ormoc-city-plaza',
    name: 'Ormoc City Plaza',
    category: 'City',
    rating: 4.5,
    reviews: 312,
    image: 'public/assets/images/ormoc/tourist-spots/ormoc-city-plaza.jpg',
    lat: 11.00417,
    lon: 124.60806,
    blurb: 'Sea breeze, walks & street food',
  },
  {
    id: 'ormoc-city-museum',
    name: 'Ormoc City Museum',
    category: 'Culture',
    rating: 4.3,
    reviews: 84,
    image: 'public/assets/images/ormoc/tourist-spots/ormoc-city-museum.jpg',
    lat: 11.00503,
    lon: 124.60904,
    blurb: "People's Museum in the old City Hall",
  },
  {
    id: 'sals-pineapple',
    name: "Sal's Pineapple Plantation",
    category: 'Farm',
    rating: 4.5,
    reviews: 90,
    image: 'public/assets/images/ormoc/tourist-spots/sals-pineapple-plantation.jpg',
    images: [
      'public/assets/images/ormoc/tourist-spots/sals-pineapple-plantation.jpg',
      'public/assets/images/ormoc/tourist-spots/pina-festival.jpg',
    ],
    lat: 11.03902,
    lon: 124.61327,
    blurb: 'Fresh piña fields in Hibunawon',
  },
  {
    id: 'lake-danao',
    name: 'Lake Danao',
    category: 'Nature',
    rating: 4.6,
    reviews: 367,
    image: 'public/assets/images/ormoc/tourist-spots/lake-danao.jpg',
    lat: 11.071,
    lon: 124.7,
    blurb: 'Guitar-shaped highland lake',
  },
  {
    id: 'lake-janagdan',
    name: 'Lake Janagdan',
    category: 'Nature',
    rating: 4.7,
    reviews: 58,
    image: 'public/assets/images/ormoc/tourist-spots/lake-janagdan.jpg',
    lat: 11.10202,
    lon: 124.71576,
    blurb: 'Crater lake atop Mt. Janagdan',
  },
  {
    id: 'alto-peak',
    name: 'Alto Peak',
    category: 'Adventure',
    rating: 4.6,
    reviews: 72,
    // Photos from shellwanders.com Alto Peak guide
    image: 'public/assets/images/ormoc/tourist-spots/alto-peak.jpg',
    images: [
      'public/assets/images/ormoc/tourist-spots/alto-peak.jpg',
      'public/assets/images/ormoc/tourist-spots/alto-peak-view.jpg',
      'public/assets/images/ormoc/tourist-spots/alto-peak-sign.jpg',
    ],
    lat: 11.10352,
    lon: 124.74262,
    blurb: 'Highest peak in Eastern Visayas',
  },
  {
    id: 'sulfatara',
    name: 'Sulfatara',
    category: 'Nature',
    rating: 4.8,
    reviews: 26,
    image: 'public/assets/images/ormoc/tourist-spots/sulfatara.jpg',
    lat: 11.09596,
    lon: 124.73713,
    blurb: 'Sulfur springs in Cabintan',
  },
  {
    id: 'supremacy-camp',
    name: 'Supremacy Camp',
    category: 'Camping',
    rating: 4.0,
    reviews: 32,
    image: 'public/assets/images/ormoc/tourist-spots/supremacy-camp.jpg',
    lat: 11.09441,
    lon: 124.66488,
    blurb: 'Camping & cool air in Milagro',
  },
  {
    id: 'sabin-resort',
    name: 'Sabin Resort Hotel',
    category: 'Resort',
    rating: 4.2,
    reviews: 1677,
    image: 'public/assets/images/ormoc/tourist-spots/sabin-resort-hotel.jpg',
    lat: 10.99049,
    lon: 124.62113,
    blurb: 'Bayfront pool & seaside stay',
  },
  {
    id: '88-cafe',
    name: '88 Café',
    category: 'Cafe',
    rating: 4.4,
    reviews: 76,
    image: 'public/assets/images/ormoc/tourist-spots/88-cafe.jpg',
    lat: 11.09371,
    lon: 124.65205,
    blurb: 'Highland coffee in Milagro',
  },
  {
    id: 'martas',
    name: "Marta's",
    category: 'Dining',
    rating: 4.3,
    reviews: 43,
    image: 'public/assets/images/ormoc/tourist-spots/martas.jpg',
    lat: 10.98831,
    lon: 124.62067,
    blurb: 'Seaside dining in Bantigue',
  },
];

function spotImageList(spot) {
  if (Array.isArray(spot?.images) && spot.images.length) return spot.images;
  return spot?.image ? [spot.image] : [];
}

function googleIdentityData(user) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const google = identities.find((item) => item?.provider === 'google');
  return google?.identity_data && typeof google.identity_data === 'object'
    ? google.identity_data
    : {};
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function displayName(user) {
  const meta = user?.user_metadata || {};
  const google = googleIdentityData(user);
  return (
    firstNonEmpty(
      google.full_name,
      google.name,
      meta.full_name,
      meta.name,
      meta.preferred_username,
      user?.email ? user.email.split('@')[0] : '',
    )
    || 'there'
  );
}

function profilePhotoUrl(user) {
  const meta = user?.user_metadata || {};
  const google = googleIdentityData(user);
  const fromMeta = firstNonEmpty(
    meta.avatar_url,
    meta.picture,
    meta.avatar,
    google.avatar_url,
    google.picture,
    google.avatar,
  );
  if (fromMeta) return fromMeta;

  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    const data = identity?.identity_data || {};
    const url = firstNonEmpty(data.avatar_url, data.picture, data.avatar);
    if (url) return url;
  }
  return '';
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iconMap() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5 3.5 6.7v12.3L9 16.8l6 2.2 5.5-2.2V4.5L15 6.7 9 4.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M9 4.5v12.3M15 6.7v12.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;
}

function iconRoutes() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.5" cy="17.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M8.5 7.8c2.2 0 3.3.7 4.2 2.2.8 1.4 1.8 2.5 4.3 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function iconCommunity() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="16.2" cy="9.2" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M4.8 18.2c.4-2.6 2.3-4 4.2-4s3.8 1.4 4.2 4M13.4 18.2c.2-1.7 1.3-2.8 2.8-2.8 1.4 0 2.4.9 2.8 2.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function iconSaved() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.8h10a1.2 1.2 0 0 1 1.2 1.2v13.1L12 15.7 5.8 19.1V6A1.2 1.2 0 0 1 7 4.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;
}

function iconMore() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="17.5" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  `;
}

function renderMapPanel() {
  const chips = MAP_CATEGORIES.map((item, index) => `
    <button
      type="button"
      class="map-chip${index === 0 ? ' is-active' : ''}"
      data-map-category="${item.id}"
      aria-pressed="${index === 0 ? 'true' : 'false'}"
    >
      ${item.label}
    </button>
  `).join('');

  return `
    <section class="dash-panel dash-panel--map is-active" data-panel="map" aria-label="Map">
      <div id="ormoc-map" class="map-canvas" role="application" aria-label="Map of Ormoc"></div>

      <div class="map-overlay">
        <div class="map-search-row">
          <div class="map-search-brand" aria-hidden="true">
            <svg class="map-search-brand-svg" viewBox="140 200 760 580" width="40" height="40">
              <circle class="og-radar" cx="343" cy="489" r="230" fill="none" stroke="#0079FC" stroke-width="18"/>
              <image class="og-navy" width="1024" height="1024" href="public/assets/icons/icon-og-layer-navy.png"/>
              <image class="og-inner" width="1024" height="1024" href="public/assets/icons/icon-og-layer-ring.png"/>
              <image class="og-gee" width="1024" height="1024" href="public/assets/icons/icon-og-layer-g.png"/>
            </svg>
          </div>
          <form class="map-search" id="map-search-form" role="search">
            <label class="map-search-field">
              <span class="visually-hidden">Search places</span>
              <input
                type="search"
                name="q"
                id="map-search-input"
                placeholder="Search places in Ormoc"
                autocomplete="off"
                enterkeyhint="search"
                aria-autocomplete="list"
                aria-controls="map-suggest"
                aria-expanded="false"
              >
              <span class="map-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
                  <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </span>
            </label>
            <div class="map-suggest" id="map-suggest" hidden role="listbox" aria-label="Place suggestions"></div>
          </form>
        </div>

        <div class="map-chips" role="toolbar" aria-label="Place categories">
          ${chips}
        </div>

        <div class="map-side-tools">
        <div class="map-layers" id="map-layers">
          <button type="button" class="map-layers-btn" id="map-layers-btn" aria-label="Map layers" aria-haspopup="dialog" aria-expanded="false" aria-controls="map-layers-sheet">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.2 3.6 7.8 12 12.4l8.4-4.6L12 3.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M3.6 12.2 12 16.8l8.4-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3.6 16.4 12 21l8.4-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="map-layers-sheet" id="map-layers-sheet" hidden role="dialog" aria-label="Map layers">
            <div class="map-layers-grid" role="listbox" aria-label="Map layer options">
              ${MAP_LAYERS.map((layer) => {
                const bgImage = getLayerPreviewBackground(layer.id);
                return `
                <button
                  type="button"
                  class="map-layer-card${layer.id === 'streets' ? ' is-active' : ''}"
                  data-map-type="${layer.id}"
                  role="option"
                  aria-selected="${layer.id === 'streets' ? 'true' : 'false'}"
                >
                  <span
                    class="map-layer-thumb map-layer-thumb--${layer.id}"
                    style="${bgImage ? `background-image:${bgImage}` : ''}"
                    aria-hidden="true"
                  ></span>
                  <span class="map-layer-label">${layer.label}</span>
                  <span class="map-layer-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </span>
                </button>
              `;
              }).join('')}
            </div>
          </div>
        </div>
        <button type="button" class="map-tourist-btn" id="map-tourist-btn" aria-label="Show tourist spots" aria-pressed="false" aria-controls="tourist-rail">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.8 8.8h2.2l1.4-2.1h7.2l1.4 2.1h2.2A1.6 1.6 0 0 1 20.8 10.4v7.2a1.6 1.6 0 0 1-1.6 1.6H4.8a1.6 1.6 0 0 1-1.6-1.6v-7.2a1.6 1.6 0 0 1 1.6-1.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <circle cx="12" cy="14" r="3.1" fill="none" stroke="currentColor" stroke-width="1.8"/>
          </svg>
        </button>
        <button type="button" class="map-emergency-btn" id="map-emergency-btn" aria-label="Emergency contacts" aria-haspopup="dialog" aria-expanded="false" aria-controls="map-emergency-modal">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.2 3.8h2.1c.6 0 1.1.4 1.2 1l.4 2.3a1.2 1.2 0 0 1-.3 1.1l-1.3 1.3a12.2 12.2 0 0 0 4.2 4.2l1.3-1.3a1.2 1.2 0 0 1 1.1-.3l2.3.4c.6.1 1 .6 1 1.2v2.1a1.2 1.2 0 0 1-1.3 1.2A14.8 14.8 0 0 1 3.8 5.1a1.2 1.2 0 0 1 1.2-1.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </button>
        </div>

        <button type="button" class="map-locate-btn" id="map-locate-btn" aria-label="My location" aria-pressed="false" title="My location">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="map-emergency-modal" id="map-emergency-modal" hidden>
        <button type="button" class="map-emergency-backdrop" data-emergency-close aria-label="Close emergency contacts"></button>
        <div class="map-emergency-panel" id="map-emergency-panel" role="dialog" aria-modal="true" aria-labelledby="map-emergency-title">
          <div class="map-emergency-drag" data-emergency-drag>
            <div class="map-emergency-handle" aria-hidden="true"></div>
            <header class="map-emergency-header">
              <div>
                <h2 class="map-emergency-title" id="map-emergency-title">Emergency</h2>
                <p class="map-emergency-note">Ormoc City hotlines · National, rescue, police &amp; hospitals · Drag up to expand</p>
              </div>
              <button type="button" class="map-emergency-close" data-emergency-close aria-label="Close">Close</button>
            </header>
          </div>
          <div class="map-emergency-list" id="map-emergency-list">
            ${renderEmergencyListHtml(EMERGENCY_SEED, 'national')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderRoutesPanel() {
  return `
    <section class="dash-panel dash-panel--routes" data-panel="routes" aria-label="Directions" hidden>
      <div class="routes-screen">
        <div class="routes-map-stage">
          <div id="routes-map" class="routes-map" role="application" aria-label="Route map"></div>
          <img
            class="routes-guide-chibi"
            id="routes-guide-chibi"
            src="public/assets/icons/routes-guide-chibi.jpg"
            alt=""
            width="64"
            height="64"
            decoding="async"
            hidden
          />
        </div>

        <div class="routes-sheet" id="routes-sheet">
          <div class="routes-suggest" id="routes-suggest" hidden role="listbox" aria-label="Place suggestions"></div>
          <div class="routes-sheet-drag" data-routes-drag>
            <div class="routes-sheet-handle" aria-hidden="true"></div>
          </div>
          <div class="routes-sheet-body">
            <div class="routes-idle" id="routes-idle">
              <img
                class="routes-idle-chibi"
                src="public/assets/icons/routes-guide-chibi.jpg"
                alt=""
                width="72"
                height="72"
                decoding="async"
              />
              <div class="routes-idle-copy-wrap">
                <p class="routes-idle-title">Asa ka padong bai?</p>
                <p class="routes-idle-copy">Pilia ang destinasyon aron itandi ang oras sa biyahe.</p>
              </div>
            </div>

            <div class="routes-eta is-empty" id="routes-result" hidden>
              <strong id="routes-result-time">—</strong>
              <div class="routes-eta-copy">
                <span id="routes-summary">Choose a destination to see travel time</span>
                <span id="routes-result-dest"></span>
              </div>
              <button type="button" class="routes-save-btn" id="routes-save-btn" aria-label="Save route" title="Save route" hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.8 7.2 19.4l.9-5.4-3.9-3.8 5.4-.8L12 4.5Z"/></svg>
              </button>
            </div>

            <form class="routes-form" id="routes-form" autocomplete="off">
              <div class="routes-inputs">
                <div class="routes-rail" aria-hidden="true">
                  <span class="routes-rail-dot routes-rail-dot--from"></span>
                  <span class="routes-rail-line"></span>
                  <span class="routes-rail-dot routes-rail-dot--to"></span>
                </div>
                <div class="routes-fields">
                  <div class="routes-field-wrap">
                    <label class="routes-field">
                      <span class="visually-hidden">Starting point</span>
                      <input type="search" name="from" id="route-from" placeholder="Your location" enterkeyhint="next">
                    </label>
                    <button type="button" class="routes-field-clear" data-route-clear="from" hidden aria-label="Clear starting point" title="Clear">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                    <button type="button" class="routes-field-action" id="route-use-location" title="Use my location" aria-label="Use my location">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                    </button>
                  </div>
                  <div class="routes-field-wrap">
                    <label class="routes-field">
                      <span class="visually-hidden">Destination</span>
                      <input type="search" name="to" id="route-to" placeholder="Choose destination" enterkeyhint="search" required>
                    </label>
                    <button type="button" class="routes-field-clear" data-route-clear="to" hidden aria-label="Clear destination" title="Clear">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                    <button class="routes-submit-icon" type="submit" title="Get directions" aria-label="Get directions">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </button>
                  </div>
                </div>
                <button type="button" class="routes-swap" id="route-swap" title="Swap places" aria-label="Swap places">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>
                </button>
              </div>

              <p class="routes-error" id="routes-error" hidden></p>
            </form>

            <div class="routes-modes" id="routes-modes" hidden>
              <div class="routes-modes-scroller" id="routes-modes-grid" role="list"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSuggestItem(place, index, { kind = 'routes' } = {}) {
  const name = escapeHtml(place.name || 'Place');
  const sub = escapeHtml(place.display_name || '');
  const itemClass = kind === 'map' ? 'map-suggest-item' : 'routes-suggest-item';
  const pinClass = kind === 'map' ? 'map-suggest-pin' : 'routes-suggest-pin';
  const copyClass = kind === 'map' ? 'map-suggest-copy' : 'routes-suggest-copy';
  const indexAttr = kind === 'map' ? 'data-map-suggest-index' : 'data-suggest-index';
  return `
    <button type="button" class="${itemClass}" role="option" ${indexAttr}="${index}">
      <span class="${pinClass}" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
      </span>
      <span class="${copyClass}">
        <strong>${name}</strong>
        <span>${sub}</span>
      </span>
    </button>
  `;
}

function modeIconSvg(kind) {
  const common = 'viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if (kind === 'walk') {
    return `<svg ${common}><circle cx="12" cy="5" r="2"/><path d="M10 22l2-7 2 2 2 5"/><path d="M8 14l4-5 3 3 3-1"/></svg>`;
  }
  if (kind === 'run') {
    return `<svg ${common}><circle cx="14" cy="4.5" r="2"/><path d="M5 21l4-7 3 2 4 5"/><path d="M8 11l3-3 4 2 3-3"/></svg>`;
  }
  if (kind === 'bike') {
    return `<svg ${common}><circle cx="6.5" cy="16.5" r="3.2"/><circle cx="17.5" cy="16.5" r="3.2"/><path d="M6.5 16.5l3-7h4l4 7"/><path d="M10 9.5h4"/></svg>`;
  }
  if (kind === 'motor') {
    return `<svg ${common}><circle cx="6" cy="16" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M8.5 16h5l2-5h-4l-1.5 3"/><path d="M13 11l2-3h2"/></svg>`;
  }
  return `<svg ${common}><path d="M4 16l2-7h9l3 4v3"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/><path d="M4 16h14"/></svg>`;
}

function renderModeCard(mode, selectedId) {
  const mins = formatModeMinutes(mode.durationMin);
  const active = mode.id === selectedId ? ' is-selected' : '';
  const iconKind = escapeHtml(mode.icon || mode.id);
  return `
    <button type="button" class="route-mode route-mode--${iconKind}${active}" data-mode="${escapeHtml(mode.id)}" role="listitem" aria-label="${escapeHtml(mode.label)} ${escapeHtml(mins)}">
      <span class="route-mode-icon" aria-hidden="true">${modeIconSvg(mode.icon)}</span>
      <span class="route-mode-time">${escapeHtml(mins)}</span>
      <span class="route-mode-label">${escapeHtml(mode.label)}</span>
    </button>
  `;
}

function renderPlaceholderPanel(id, title, copy) {
  return `
    <section class="dash-panel" data-panel="${id}" aria-label="${title}" hidden>
      <div class="dash-empty">
        <h2>${title}</h2>
        <p>${copy}</p>
        <span class="dash-empty-note">Coming soon</span>
      </div>
    </section>
  `;
}

const COMMUNITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'event', label: 'Events' },
  { id: 'tip', label: 'Tips' },
  { id: 'jobs', label: 'Jobs' },
];

const COMMUNITY_POSTS = [
  {
    id: 'p1',
    type: 'alert',
    title: 'Real St. lane closure',
    body: 'One lane closed near SM Center for drainage work until Friday, 6 PM. Expect slow traffic after 4 PM.',
    author: 'City Works',
    when: '2h ago',
    place: 'Real Street',
    image: 'public/assets/images/ormoc/11-real-st.jpg',
  },
  {
    id: 'p2',
    type: 'event',
    title: 'Saturday night market',
    body: 'Love Local night market is on this weekend—food stalls, crafts, and live music by the plaza.',
    author: 'Ormoc Tourism',
    when: '5h ago',
    place: 'City Plaza',
    image: 'public/assets/images/ormoc/1000011171.jpg',
  },
  {
    id: 'p3',
    type: 'tip',
    title: 'Lake Danao tip',
    body: 'Go early for cooler weather. Bring your own food—floating cottages fill up fast on Sundays.',
    author: 'Mae R.',
    when: 'Yesterday',
    place: 'Lake Danao',
    image: 'public/assets/images/ormoc/lake-danao/01-lake-danao.jpg',
  },
  {
    id: 'p4',
    type: 'alert',
    title: 'Heavy rain advisory',
    body: 'Scattered thunderstorms expected tonight through tomorrow morning. Avoid low-lying roads near the riverbank.',
    author: 'City Disaster Desk',
    when: 'Yesterday',
    place: 'Citywide',
    image: 'public/assets/images/ormoc/05-ormoc-bay.jpg',
  },
  {
    id: 'p5',
    type: 'tip',
    title: 'Where to park near Robinsons',
    body: 'Basement fills by noon on Saturdays. Street parking on Doña Feliza is tighter after 11 AM.',
    author: 'Jun P.',
    when: '2d ago',
    place: 'Robinsons Ormoc',
    image: 'public/assets/images/ormoc/07-aviles-st.jpg',
  },
  {
    id: 'p6',
    type: 'event',
    title: 'Barangay clean-up drive',
    body: 'Volunteers meet at 6 AM Sunday near the barangay hall. Gloves and sacks provided.',
    author: 'Brgy. District 8',
    when: '3d ago',
    place: 'District 8',
    image: 'public/assets/images/ormoc/1000011172.jpg',
  },
  {
    id: 'p7',
    type: 'tip',
    title: 'Ferry tickets tip',
    body: 'Tickets sell out on long weekends. Arrive early or book the day before if you can.',
    author: 'Port Desk',
    when: '3d ago',
    place: 'Ormoc Port',
    image: 'public/assets/images/ormoc/06-ormoc-philippines.jpg',
  },
  {
    id: 'p8',
    type: 'event',
    title: "Heaven's Peak sunrise hike",
    body: 'Guided sunrise walk this Saturday. Meet at the trailhead by 4:30 AM — bring a light jacket.',
    author: 'Trail Crew',
    when: '4d ago',
    place: "Heaven's Peak",
    image: 'public/assets/images/ormoc/heavens-peak/01-mountain-overlook.jpg',
  },
  {
    id: 'p9',
    type: 'alert',
    title: 'Power interruption notice',
    body: 'Scheduled maintenance Saturday 1–4 AM along Lopez Jaena. Prepare chargers and lamps ahead of time.',
    author: 'Local Utility',
    when: '5d ago',
    place: 'Lopez Jaena',
    image: 'public/assets/images/ormoc/08-lopez-jaena.jpg',
  },
];

const COMMUNITY_JOBS = [
  {
    id: 'j1',
    title: 'Café barista',
    company: 'Harbor Brew',
    location: 'Ormoc City Proper',
    meta: 'Part-time · On-site',
    posted: '1d ago',
    applicants: '12 applicants',
    easyApply: true,
    logo: 'https://www.google.com/s2/favicons?domain=starbucks.com&sz=128',
  },
  {
    id: 'j2',
    title: 'Sales associate',
    company: 'City Retail Hub',
    location: 'Real Street',
    meta: 'Full-time · Entry level',
    posted: '2d ago',
    applicants: '28 applicants',
    easyApply: true,
    logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128',
  },
  {
    id: 'j3',
    title: 'Tour guide helper',
    company: 'Lake Danao Trails',
    location: 'Lake Danao',
    meta: 'Weekend · Seasonal',
    posted: '3d ago',
    applicants: '8 applicants',
    easyApply: false,
    logo: 'https://www.google.com/s2/favicons?domain=tripadvisor.com&sz=128',
  },
  {
    id: 'j4',
    title: 'Front desk associate',
    company: 'Bayview Inn',
    location: 'Ormoc Bay area',
    meta: 'Full-time · Customer service',
    posted: '4d ago',
    applicants: '19 applicants',
    easyApply: true,
    logo: 'https://www.google.com/s2/favicons?domain=marriott.com&sz=128',
  },
];

function communityTypeLabel(type) {
  if (type === 'alert') return 'Alert';
  if (type === 'event') return 'Event';
  if (type === 'tip') return 'Tip';
  return 'Update';
}

function communityAuthorInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function renderCommunityPost(post) {
  const saved = isCommunitySaved(post);
  const media = post.image
    ? `<img class="community-post-img" src="${escapeHtml(post.image)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `
    <article class="community-post community-post--${escapeHtml(post.type)}${post.image ? ' has-media' : ''}${saved ? ' is-saved' : ''}" data-community-type="${escapeHtml(post.type)}" data-community-id="${escapeHtml(post.id)}">
      <div class="community-post-top">
        <span class="community-tag community-tag--${escapeHtml(post.type)}">${escapeHtml(communityTypeLabel(post.type))}</span>
        <div class="community-post-top-actions">
          <span class="community-when">${escapeHtml(post.when)}</span>
          <button
            type="button"
            class="community-post-save${saved ? ' is-saved' : ''}"
            data-community-save="${escapeHtml(post.id)}"
            aria-label="${saved ? 'Remove from saved' : 'Save update'}"
            aria-pressed="${saved ? 'true' : 'false'}"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
      <h3 class="community-post-title">${escapeHtml(post.title)}</h3>
      <p class="community-post-body">${escapeHtml(post.body)}</p>
      ${media}
      <p class="community-post-meta">
        <span>${escapeHtml(post.author)}</span>
        <span aria-hidden="true">·</span>
        <span>${escapeHtml(post.place)}</span>
      </p>
    </article>
  `;
}

function renderCommunityJob(job) {
  const saved = isCommunitySaved({ ...job, kind: 'job' });
  const initials = escapeHtml(communityAuthorInitials(job.company));
  const logoInner = job.logo
    ? `<img class="community-job-logo-img" src="${escapeHtml(job.logo)}" alt="" width="48" height="48" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span class="community-job-logo-fallback" aria-hidden="true">${initials}</span>`;
  const applyLabel = job.easyApply ? 'Easy Apply' : 'Apply';
  return `
    <article class="community-job${saved ? ' is-saved' : ''}" data-community-job="${escapeHtml(job.id)}">
      <div class="community-job-logo" aria-hidden="true" data-job-logo="${escapeHtml(initials)}">
        ${logoInner}
      </div>
      <div class="community-job-content">
        <h3 class="community-job-title">${escapeHtml(job.title)}</h3>
        <p class="community-job-company">${escapeHtml(job.company)}</p>
        <p class="community-job-meta">${escapeHtml(job.location)} · ${escapeHtml(job.meta)}</p>
        <p class="community-job-stats">${escapeHtml(job.posted)} · ${escapeHtml(job.applicants)}</p>
      </div>
      <div class="community-job-actions">
        <button type="button" class="community-job-apply${job.easyApply ? ' community-job-apply--easy' : ''}" data-job-apply="${escapeHtml(job.id)}">
          ${escapeHtml(applyLabel)}
        </button>
        <button
          type="button"
          class="community-job-save${saved ? ' is-saved' : ''}"
          data-job-save="${escapeHtml(job.id)}"
          aria-label="${saved ? 'Remove from saved' : 'Save job'}"
          aria-pressed="${saved ? 'true' : 'false'}"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </article>
  `;
}

function renderCommunityPanel() {
  const filters = COMMUNITY_FILTERS.map((filter, index) => `
    <button
      type="button"
      class="community-filter${index === 0 ? ' is-active' : ''}"
      data-community-filter="${escapeHtml(filter.id)}"
      aria-pressed="${index === 0 ? 'true' : 'false'}"
    >
      ${escapeHtml(filter.label)}
    </button>
  `).join('');

  return `
    <section class="dash-panel dash-panel--community" data-panel="community" aria-label="Community" hidden>
      <div class="community-screen">
        <div class="community-chrome">
          <header class="community-top">
            <div class="community-top-copy">
              <h1 class="community-title">Community</h1>
              <p class="community-copy">Alerts, events, tips, and local jobs in Ormoc.</p>
            </div>
          </header>

          <div class="community-filters" role="toolbar" aria-label="Community filters">
            ${filters}
          </div>
        </div>

        <div class="community-feed" id="community-feed">
          <div class="community-section" data-community-section="feed">
            ${COMMUNITY_POSTS.map(renderCommunityPost).join('')}
          </div>

          <div class="community-section community-section--jobs" data-community-section="jobs" hidden>
            <div class="community-jobs-banner">
              <strong>Jobs near Ormoc</strong>
              <span>${COMMUNITY_JOBS.length} openings</span>
            </div>
            ${COMMUNITY_JOBS.map(renderCommunityJob).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProfileSkills(skills = []) {
  if (!skills.length) {
    return `<p class="more-profile-empty">Add skills so local jobs can know what you do.</p>`;
  }
  return `<div class="more-skill-chips">${skills.map((skill) => `<span class="more-skill-chip">${escapeHtml(skill)}</span>`).join('')}</div>`;
}

function renderResumeSummary(resume) {
  if (!resume?.name) {
    return `<p class="profile-resume-empty">No resume uploaded yet.</p>`;
  }
  return `
    <div class="profile-resume-file">
      <div class="profile-resume-copy">
        <strong>${escapeHtml(resume.name)}</strong>
        <span>${escapeHtml(formatFileSize(resume.size))} · ${escapeHtml((resume.type || 'file').split('/').pop() || 'file')}</span>
      </div>
      <div class="profile-resume-actions">
        <button type="button" class="profile-resume-btn" data-profile-resume-download>Download</button>
        <button type="button" class="profile-resume-btn profile-resume-btn--danger" data-profile-resume-remove>Remove</button>
      </div>
    </div>
  `;
}

function renderMorePanel(user) {
  const profile = getUserProfile(user);
  const accountName = displayName(user);
  const rawName = accountName || profile.fullName || 'there';
  const name = escapeHtml(rawName);
  const email = escapeHtml(user?.email || '');
  const appName = escapeHtml(getAppName());
  const version = escapeHtml(getEnv().APP_VERSION || '0.1.0');
  const photo = profilePhotoUrl(user);
  const avatar = photo
    ? `<img class="more-avatar-img" src="${escapeHtml(photo)}" alt="" width="64" height="64" referrerpolicy="no-referrer" decoding="async" data-more-avatar-img>`
    : `<span class="more-avatar-initials" data-more-avatar-initials>${escapeHtml(initials(rawName))}</span>`;
  const skillInputs = profile.skills.map((skill) => `
    <li class="profile-skill-item">
      <span>${escapeHtml(skill)}</span>
      <button type="button" class="profile-skill-remove" data-profile-skill-remove="${escapeHtml(skill)}" aria-label="Remove ${escapeHtml(skill)}">×</button>
    </li>
  `).join('');

  return `
    <section class="dash-panel dash-panel--more" data-panel="more" aria-label="More" hidden>
      <div class="more-screen" data-more-view="${escapeHtml(readStoredTab() === 'more' ? readStoredMoreView() : 'home')}">
        <div class="more-home" data-more-pane="home"${readStoredTab() === 'more' && readStoredMoreView() === 'profile' ? ' hidden' : ''}>
          <header class="more-hero">
            <div class="more-account">
              <div class="more-avatar${photo ? ' more-avatar--photo' : ''}" data-more-avatar aria-hidden="true">${avatar}</div>
              <div class="more-account-copy">
                <h1 class="more-title" data-more-display-name>${name}</h1>
                <p class="more-email" data-more-email>${email || `Signed in to ${appName}`}</p>
              </div>
            </div>
          </header>

          <div class="more-body">
            <nav class="more-nav" aria-label="Account menu">
              <button type="button" class="more-row" data-more-open-profile>
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>Edit profile</strong>
                  <span>About you, skills, and resume</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
              <button type="button" class="more-row" data-more-sheet="inside">
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>What's inside</strong>
                  <span>How OrmocGo helps locals and visitors</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
              <button type="button" class="more-row" data-more-sheet="heritage">
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-4.5-4.5L7 20"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>Photo Archive</strong>
                  <span>Historical photographs of Ormoc's heritage</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
              <button type="button" class="more-row" data-more-sheet="support">
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v10H7l-3 3V6Z"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>Support</strong>
                  <span>Help, feedback, and contact</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
              <button type="button" class="more-row" data-more-sheet="terms">
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h8l4 4v14H7V3Z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>Terms &amp; Conditions</strong>
                  <span>Community project guidelines</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
            </nav>

            <div class="more-version" aria-label="App version">
              <span>Version</span>
              <span data-more-version>${version}</span>
            </div>

            <div class="more-footer">
              <button type="button" class="more-signout" id="dashboard-signout">Sign out</button>
              <p class="more-footnote">Non-profit · Ad-free · Made for Ormoc</p>
            </div>
          </div>
        </div>

        <div class="more-profile-edit" data-more-pane="profile"${readStoredTab() === 'more' && readStoredMoreView() === 'profile' ? '' : ' hidden'}>
          <header class="profile-edit-top">
            <div class="profile-edit-heading">
              <h2 class="profile-edit-title">Edit profile</h2>
              <p class="profile-edit-copy">Share your about, skills, and resume for local jobs.</p>
            </div>
            <button type="button" class="profile-back" data-more-close-profile aria-label="Back">
              Back
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </header>

          <form class="profile-form" id="profile-edit-form" novalidate>
            <label class="profile-field">
              <span class="profile-label">Display name</span>
              <input type="text" name="fullName" id="profile-fullname" maxlength="80" value="${escapeHtml(profile.fullName || rawName)}" placeholder="Your name" autocomplete="name">
            </label>

            <label class="profile-field">
              <span class="profile-label">About</span>
              <textarea name="about" id="profile-about" rows="5" maxlength="1200" placeholder="A short intro about your work, experience, or what you're looking for.">${escapeHtml(profile.about || '')}</textarea>
            </label>

            <div class="profile-field">
              <span class="profile-label">Skills</span>
              <div class="profile-skill-row">
                <input type="text" id="profile-skill-input" maxlength="40" placeholder="e.g. Barista, Sales, Tour guide" autocomplete="off">
                <button type="button" class="profile-skill-add" id="profile-skill-add">Add</button>
              </div>
              <ul class="profile-skill-list" id="profile-skill-list">${skillInputs}</ul>
              <p class="profile-hint">Add up to 24 skills. Tap × to remove one.</p>
            </div>

            <div class="profile-field">
              <span class="profile-label">Resume</span>
              <p class="profile-hint">${escapeHtml(resumeLimitLabel())}</p>
              <div class="profile-resume-box" data-profile-resume-box>
                ${renderResumeSummary(profile.resume)}
              </div>
              <label class="profile-upload">
                <input type="file" id="profile-resume-input" accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,text/rtf" hidden>
                <span>Upload resume</span>
              </label>
              <p class="profile-resume-status" id="profile-resume-status" aria-live="polite"></p>
            </div>

            <p class="profile-form-status" id="profile-form-status" aria-live="polite"></p>
            <button type="submit" class="profile-save-btn">Save profile</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderSavedPlaceItem(place) {
  const rating = place.rating != null
    ? `<span class="saved-item-meta saved-item-meta--rating">${Number(place.rating).toFixed(1)}★ · ${escapeHtml(place.category || 'Place')}</span>`
    : `<span class="saved-item-meta">${escapeHtml(place.category || 'Saved place')}</span>`;
  const thumb = place.image
    ? `<img class="saved-item-thumb" src="${escapeHtml(place.image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="saved-item-thumb saved-item-thumb--empty" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg></span>`;
  return `
    <article class="saved-item" data-saved-place="${escapeHtml(place.id)}">
      ${thumb}
      <button type="button" class="saved-item-main" data-saved-open-place="${escapeHtml(place.id)}">
        <strong>${escapeHtml(place.name)}</strong>
        <span class="saved-item-sub">${escapeHtml(place.display_name || place.category || 'Saved place')}</span>
        ${rating}
      </button>
      <button type="button" class="saved-item-remove" data-saved-remove-place="${escapeHtml(place.id)}" aria-label="Remove ${escapeHtml(place.name)}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </article>
  `;
}

function renderSavedRouteItem(route) {
  const mins = formatModeMinutes(route.durationMin || 1);
  const km = route.distanceKm < 10 ? Number(route.distanceKm).toFixed(1) : Math.round(route.distanceKm);
  return `
    <article class="saved-item saved-item--route" data-saved-route="${escapeHtml(route.id)}">
      <span class="saved-item-thumb saved-item-thumb--route" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      <button type="button" class="saved-item-main" data-saved-open-route="${escapeHtml(route.id)}">
        <strong>${escapeHtml(route.to?.label || 'Destination')}</strong>
        <span class="saved-item-sub">From ${escapeHtml(route.from?.label || 'Start')}</span>
        <span class="saved-item-meta">${escapeHtml(route.modeLabel || 'Route')} · ${escapeHtml(mins)} · ${escapeHtml(String(km))} km</span>
      </button>
      <button type="button" class="saved-item-remove" data-saved-remove-route="${escapeHtml(route.id)}" aria-label="Remove saved route">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </article>
  `;
}

function renderSavedCommunityItem(item) {
  const isJob = item.kind === 'job';
  const label = isJob ? 'Job' : communityTypeLabel(item.type);
  const sub = isJob
    ? `${item.company || ''}${item.location ? ` · ${item.location}` : ''}`
    : (item.body || item.author || 'Community update');
  const meta = isJob
    ? (item.meta || item.when || 'Saved job')
    : `${item.author || 'Community'}${item.place ? ` · ${item.place}` : ''}`;
  const thumb = item.image
    ? `<img class="saved-item-thumb" src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span class="saved-item-thumb saved-item-thumb--${isJob ? 'route' : 'empty'}" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${isJob ? 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' : 'M4 6h16M4 12h16M4 18h10'}"/></svg></span>`;
  return `
    <article class="saved-item saved-item--community" data-saved-community="${escapeHtml(item.id)}">
      ${thumb}
      <button type="button" class="saved-item-main" data-saved-open-community="${escapeHtml(item.id)}" data-saved-community-kind="${escapeHtml(item.kind || 'post')}">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="saved-item-sub">${escapeHtml(sub)}</span>
        <span class="saved-item-meta">${escapeHtml(label)} · ${escapeHtml(meta)}</span>
      </button>
      <button type="button" class="saved-item-remove" data-saved-remove-community="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </article>
  `;
}

function renderSavedPanel() {
  return `
    <section class="dash-panel dash-panel--saved" data-panel="saved" aria-label="Saved" hidden>
      <div class="saved-screen">
        <div class="saved-chrome">
          <header class="saved-top">
            <div>
              <h1 class="saved-title">Saved</h1>
              <p class="saved-copy">Places, routes, and community items you starred.</p>
            </div>
          </header>
          <div class="saved-filters" role="toolbar" aria-label="Saved filters">
            <button type="button" class="saved-filter is-active" data-saved-filter="all" aria-pressed="true">All</button>
            <button type="button" class="saved-filter" data-saved-filter="places" aria-pressed="false">Places</button>
            <button type="button" class="saved-filter" data-saved-filter="routes" aria-pressed="false">Routes</button>
            <button type="button" class="saved-filter" data-saved-filter="community" aria-pressed="false">Community</button>
          </div>
        </div>
        <div class="saved-feed" id="saved-feed">
          <div class="saved-section" data-saved-section="places"></div>
          <div class="saved-section" data-saved-section="routes"></div>
          <div class="saved-section" data-saved-section="community"></div>
        </div>
      </div>
    </section>
  `;
}

function starsMarkup(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 && rating - full < 0.8;
  const parts = [];
  for (let i = 0; i < 5; i += 1) {
    if (i < full) parts.push('★');
    else if (i === full && half) parts.push('☆');
    else parts.push('☆');
  }
  return parts.join('');
}

function renderTouristCardMedia(spot) {
  const photos = spotImageList(spot);
  const preview = photos[0] || '';
  if (photos.length <= 1) {
    return `
      <div class="tourist-card-media" aria-hidden="true">
        <img
          class="tourist-card-img"
          data-tourist-photo="${escapeHtml(spot.id)}"
          data-fallback-src="${escapeHtml(preview)}"
          src="${escapeHtml(preview)}"
          alt=""
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer-when-downgrade"
          onerror="if(this.dataset.fallbackSrc&&this.src!==this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc}else{this.onerror=null;this.classList.add('is-broken')}"
        >
      </div>
    `;
  }

  const slides = photos.map((src, index) => `
    <div class="tourist-card-slide${index === 0 ? ' is-active' : ''}" data-card-slide="${index}">
      <img
        class="tourist-card-img"
        src="${escapeHtml(src)}"
        alt=""
        loading="${index === 0 ? 'eager' : 'lazy'}"
        decoding="async"
        referrerpolicy="no-referrer-when-downgrade"
      >
    </div>
  `).join('');

  const dots = photos.map((_, index) => `
    <span class="tourist-card-dot${index === 0 ? ' is-active' : ''}" data-card-dot="${index}"></span>
  `).join('');

  return `
    <div class="tourist-card-media is-slideshow" data-tourist-slideshow="${escapeHtml(spot.id)}" aria-hidden="true">
      <div class="tourist-card-track">
        ${slides}
      </div>
      <div class="tourist-card-dots">${dots}</div>
    </div>
  `;
}

function renderTouristRail() {
  const cards = TOURIST_SPOTS.map((spot) => {
    const saved = isPlaceSaved(spot);
    return `
    <article class="tourist-card${saved ? ' is-saved' : ''}" data-tourist-id="${escapeHtml(spot.id)}">
      ${renderTouristCardMedia(spot)}
      <button type="button" class="tourist-card-main" data-tourist-open="${escapeHtml(spot.id)}" aria-label="${escapeHtml(spot.name)}, ${spot.rating} stars">
        <span class="tourist-card-body">
          <span class="tourist-card-cat">${escapeHtml(spot.category)}</span>
          <strong class="tourist-card-name">${escapeHtml(spot.name)}</strong>
          <span class="tourist-card-rating">
            <span class="tourist-card-score">${spot.rating.toFixed(1)}</span>
            <span class="tourist-card-stars" aria-hidden="true">${starsMarkup(spot.rating)}</span>
            <span class="tourist-card-reviews">(${spot.reviews})</span>
          </span>
          <span class="tourist-card-blurb">${escapeHtml(spot.blurb)}</span>
        </span>
      </button>
      <button
        type="button"
        class="tourist-save-btn${saved ? ' is-saved' : ''}"
        data-tourist-save="${escapeHtml(spot.id)}"
        aria-label="${saved ? 'Remove from saved' : 'Save place'}"
        aria-pressed="${saved ? 'true' : 'false'}"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.8 7.2 19.4l.9-5.4-3.9-3.8 5.4-.8L12 4.5Z"/></svg>
      </button>
    </article>
  `;
  }).join('');

  return `
    <div class="tourist-stack" id="tourist-stack" hidden>
      <div class="tourist-rail" id="tourist-rail" aria-label="Tourist spots">
        <div class="tourist-rail-head">
          <img
            class="tourist-rail-chibi"
            src="public/assets/icons/tourist-guide-chibi.png"
            alt=""
            width="56"
            height="56"
            decoding="async"
          />
          <div class="tourist-rail-copy">
            <p class="tourist-rail-title">Kitaa ang suroyanan bai!</p>
            <p class="tourist-rail-sub">11 local favorites around Ormoc</p>
          </div>
          <button type="button" class="tourist-rail-close" id="tourist-rail-close" aria-label="Close tourist spots">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="tourist-rail-scroller" role="list">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

export function renderDashboard(user) {
  const startTab = readStoredTab();
  const nav = TABS.map((tab) => `
    <button
      type="button"
      class="bottom-nav-item${tab.id === startTab ? ' is-active' : ''}"
      data-tab="${tab.id}"
      aria-current="${tab.id === startTab ? 'page' : 'false'}"
    >
      <span class="bottom-nav-icon">${tab.icon()}</span>
      <span class="bottom-nav-label">${tab.label}</span>
    </button>
  `).join('');

  const mapHtml = renderMapPanel();
  const routesHtml = renderRoutesPanel();
  const communityHtml = renderCommunityPanel();
  const savedHtml = renderSavedPanel();
  const moreHtml = renderMorePanel(user);

  const withPanelState = (html, id) => {
    const active = id === startTab;
    return html
      .replace(
        `class="dash-panel dash-panel--${id}${id === 'map' ? ' is-active' : ''}"`,
        `class="dash-panel dash-panel--${id}${active ? ' is-active' : ''}"`,
      )
      .replace(
        `data-panel="${id}"${id === 'map' ? '' : ' hidden'}`,
        `data-panel="${id}"${active ? '' : ' hidden'}`,
      );
  };

  return `
    <section class="dash-shell" aria-label="OrmocGo app" data-active-tab="${escapeHtml(startTab)}">
      <div class="app-toast" id="app-toast" role="status" aria-live="polite" hidden></div>
      <div class="app-confirm-toast" id="signout-confirm" role="alertdialog" aria-modal="true" aria-labelledby="signout-confirm-title" hidden>
        <div class="app-confirm-toast-card">
          <p class="app-confirm-toast-title" id="signout-confirm-title">Sign out?</p>
          <p class="app-confirm-toast-copy">You’ll need to sign in again for saved profile, places, and offline mode — offline needs your login data.</p>
          <div class="app-confirm-toast-actions">
            <button type="button" class="app-confirm-toast-cancel" data-signout-cancel>Cancel</button>
            <button type="button" class="app-confirm-toast-ok" data-signout-confirm>Sign out</button>
          </div>
        </div>
      </div>
      <div class="dash-body">
        ${withPanelState(mapHtml, 'map')}
        ${withPanelState(routesHtml, 'routes')}
        ${withPanelState(communityHtml, 'community')}
        ${withPanelState(savedHtml, 'saved')}
        ${withPanelState(moreHtml, 'more')}
      </div>

      ${renderTouristRail()}

      <nav class="bottom-nav" aria-label="Primary">
        ${nav}
      </nav>

      ${renderBottomSheets()}
    </section>
  `;
}

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: ORMOC_CENTER.lat, lon: ORMOC_CENTER.lng, label: 'Ormoc City Center' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        label: 'Current location',
      }),
      () => resolve({ lat: ORMOC_CENTER.lat, lon: ORMOC_CENTER.lng, label: 'Ormoc City Center' }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export function mountDashboard(root = document) {
  const shell = root.querySelector('.dash-shell') || document.querySelector('.dash-shell');
  if (!shell || shell.dataset.bound === '1') return;
  shell.dataset.bound = '1';
  mountBottomSheets(shell);

  const panels = Array.from(shell.querySelectorAll('[data-panel]'));
  const tabs = Array.from(shell.querySelectorAll('[data-tab]'));
  const searchForm = shell.querySelector('#map-search-form');
  const searchInput = shell.querySelector('#map-search-input');
  const chips = Array.from(shell.querySelectorAll('[data-map-category]'));
  const mapTypeBtns = Array.from(shell.querySelectorAll('[data-map-type]'));
  const layersBtn = shell.querySelector('#map-layers-btn');
  const layersSheet = shell.querySelector('#map-layers-sheet');
  const layersWrap = shell.querySelector('#map-layers');
  const signOutBtn = shell.querySelector('#dashboard-signout');
  const routesForm = shell.querySelector('#routes-form');
  const routesError = shell.querySelector('#routes-error');
  const routesSummary = shell.querySelector('#routes-summary');
  const mapEl = shell.querySelector('#ormoc-map');

  let mapApi = null;
  let activeCategory = 'home';
  let activeMapType = 'streets';
  let searchTimer = null;

  const emergencyBtn = shell.querySelector('#map-emergency-btn');
  const emergencyModal = shell.querySelector('#map-emergency-modal');
  const emergencyList = shell.querySelector('#map-emergency-list');
  const locateBtn = shell.querySelector('#map-locate-btn');
  let emergencyContactsCache = EMERGENCY_SEED;
  let emergencyActiveTab = 'national';
  let emergencyUserPos = null;
  let locateWatchId = null;
  let locateTracking = false;
  let locateBusy = false;
  let locateSeq = 0;

  function paintEmergencyList() {
    if (!emergencyList) return;
    emergencyList.innerHTML = renderEmergencyListHtml(emergencyContactsCache, emergencyActiveTab);
    bindEmergencyListControls();
  }

  function bindEmergencyListControls() {
    emergencyList?.querySelectorAll('[data-emergency-tab]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const nextTab = btn.getAttribute('data-emergency-tab');
        emergencyActiveTab = EMERGENCY_GROUPS.includes(nextTab) ? nextTab : 'national';
        paintEmergencyList();
      });
    });

    emergencyList?.querySelectorAll('[data-emergency-category]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const category = btn.getAttribute('data-emergency-category');
        if (!category) return;
        setEmergencyOpen(false);
        if (searchInput) searchInput.value = '';
        runCategory(category);
        setStatus(category === 'police' ? 'Showing police nearby' : 'Showing hospitals nearby');
      });
    });

    emergencyList?.querySelectorAll('[data-emergency-locate]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const lat = Number(btn.getAttribute('data-lat'));
        const lon = Number(btn.getAttribute('data-lon'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const name = btn.getAttribute('data-name') || 'Emergency location';
        const phone = btn.getAttribute('data-phone') || '';
        const note = btn.getAttribute('data-note') || '';
        const place = {
          lat,
          lon,
          name,
          display_name: [note, 'Ormoc City, Leyte'].filter(Boolean).join(' · '),
          phone,
          phones: phone ? [phone] : [],
        };

        setEmergencyOpen(false);
        if (searchInput) searchInput.value = '';
        chips.forEach((chip) => {
          const active = false;
          chip.classList.toggle('is-active', active);
          chip.setAttribute('aria-pressed', 'false');
        });

        try {
          if (!mapApi && mapEl) {
            mapApi = await createOrmocMap(mapEl, { locate: true });
            if (mapApi) mapApi.setMapType(activeMapType);
          }
          if (!mapApi) {
            setStatus('Map is still loading', { type: 'error' });
            return;
          }
          mapApi.setStatusMarkers([place]);
          mapApi.focusPlace(place, { zoom: 16 });
          setStatus(`${name} · on map`);
        } catch (err) {
          setStatus(err.message || 'Could not open map location', { type: 'error' });
        }
      });
    });
  }

  async function refreshEmergencyList({ locate = true } = {}) {
    const base = await ensureEmergencyContactsCached();
    if (locate) {
      emergencyUserPos = await getCurrentPosition();
    }
    emergencyContactsCache = emergencyUserPos
      ? withDistance(base, emergencyUserPos)
      : base;

    const nearest = getNearestPlaces(emergencyContactsCache, {
      groups: ['hospital', 'police', 'rescue'],
      limit: 1,
    })[0];
    if (nearest?.group && EMERGENCY_GROUPS.includes(nearest.group)) {
      emergencyActiveTab = nearest.group;
    }

    paintEmergencyList();
    return emergencyContactsCache;
  }

  const emergencyPanel = shell.querySelector('#map-emergency-panel');
  const emergencyDrag = shell.querySelector('[data-emergency-drag]');

  function emergencySheetHeights() {
    const viewH = window.innerHeight || 700;
    return {
      mid: Math.min(Math.round(viewH * 0.58), 380),
      max: Math.min(Math.round(viewH * 0.92), viewH - 16),
      close: Math.min(Math.round(viewH * 0.34), 220),
    };
  }

  function setEmergencySheetHeight(px, { expanded = false } = {}) {
    if (!emergencyPanel) return;
    const height = Math.max(160, Math.round(px));
    emergencyPanel.style.setProperty('--emergency-h', `${height}px`);
    emergencyPanel.classList.toggle('is-expanded', expanded);
  }

  function resetEmergencySheetHeight() {
    if (!emergencyPanel) return;
    emergencyPanel.classList.remove('is-dragging', 'is-expanded');
    emergencyPanel.style.removeProperty('--emergency-h');
  }

  function bindEmergencySheetDrag() {
    if (!emergencyPanel || !emergencyDrag || emergencyDrag.dataset.dragBound === '1') return;
    emergencyDrag.dataset.dragBound = '1';

    let dragging = false;
    let startY = 0;
    let startH = 0;
    let pointerId = null;

    const onMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const { max } = emergencySheetHeights();
      const nextH = Math.min(max, Math.max(140, startH + (startY - event.clientY)));
      setEmergencySheetHeight(nextH, { expanded: nextH > emergencySheetHeights().mid + 40 });
    };

    const onUp = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      emergencyPanel.classList.remove('is-dragging');
      try {
        emergencyDrag.releasePointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
      pointerId = null;

      const currentH = emergencyPanel.getBoundingClientRect().height;
      const { mid, max, close } = emergencySheetHeights();
      if (currentH <= close) {
        resetEmergencySheetHeight();
        setEmergencyOpen(false);
        return;
      }
      if (currentH >= (mid + max) / 2) {
        setEmergencySheetHeight(max, { expanded: true });
        return;
      }
      setEmergencySheetHeight(mid, { expanded: false });
    };

    emergencyDrag.addEventListener('pointerdown', (event) => {
      if (event.button != null && event.button !== 0) return;
      if (event.target.closest('[data-emergency-close]')) return;
      dragging = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      startH = emergencyPanel.getBoundingClientRect().height;
      emergencyPanel.classList.add('is-dragging');
      emergencyDrag.setPointerCapture(pointerId);
      event.preventDefault();
    });

    emergencyDrag.addEventListener('pointermove', onMove);
    emergencyDrag.addEventListener('pointerup', onUp);
    emergencyDrag.addEventListener('pointercancel', onUp);
  }

  function setEmergencyOpen(open) {
    if (!emergencyModal || !emergencyBtn) return;
    const next = Boolean(open);
    emergencyModal.hidden = !next;
    emergencyBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
    emergencyBtn.classList.toggle('is-active', next);
    if (!next) resetEmergencySheetHeight();
    else {
      const { mid } = emergencySheetHeights();
      setEmergencySheetHeight(mid, { expanded: false });
    }
    requestAnimationFrame(() => {
      emergencyModal.classList.toggle('is-open', next);
    });
    document.body.classList.toggle('emergency-sheet-open', next);
    if (next) void refreshEmergencyList({ locate: true });
  }

  bindEmergencySheetDrag();

  function setLayersOpen(open) {
    if (!layersSheet || !layersBtn) return;
    layersSheet.hidden = !open;
    layersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    layersWrap?.classList.toggle('is-open', open);
    if (open) setEmergencyOpen(false);
  }

  const toastEl = shell.querySelector('#app-toast');
  let toastTimer = null;

  function showToast(message, { type = 'info', duration = 2600 } = {}) {
    if (!toastEl) return;
    const text = String(message || '').trim();
    if (!text) {
      toastEl.hidden = true;
      toastEl.classList.remove('is-visible', 'is-success', 'is-error', 'is-info');
      toastEl.textContent = '';
      return;
    }

    const kind = type === 'success' || type === 'error' ? type : 'info';
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.remove('is-success', 'is-error', 'is-info');
    toastEl.classList.add(`is-${kind}`);
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));

    clearTimeout(toastTimer);
    if (duration > 0) {
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('is-visible');
        window.setTimeout(() => {
          if (!toastEl.classList.contains('is-visible')) {
            toastEl.hidden = true;
            toastEl.textContent = '';
          }
        }, 200);
      }, duration);
    }
  }

  function setStatus(text, { sticky = false, type = 'info' } = {}) {
    const message = String(text || '').trim();
    showToast(message, {
      type,
      duration: message ? (sticky ? 4200 : 2600) : 0,
    });
  }

  function setTab(tabId, { persist = true } = {}) {
    const next = VALID_TABS.has(tabId) ? tabId : 'map';
    tabs.forEach((tab) => {
      const active = tab.getAttribute('data-tab') === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-current', active ? 'page' : 'false');
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute('data-panel') === next;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    shell.dataset.activeTab = next;
    if (persist) persistTab(next);

    const tabMeta = TABS.find((tab) => tab.id === next);
    document.title = `${tabMeta?.label || 'Map'} · OrmocGo`;

    if (next === 'map' && mapApi) {
      mapApi.invalidate();
    } else if (next !== 'map') {
      stopLocateTracking({ keepMarker: true });
    }
    if (next === 'routes') {
      ensureRoutesMap().then(async (api) => {
        api?.invalidate();
        // Re-draw after basemap sync so the blue route line is never lost.
        if (routePlan?.selectedId) {
          await applySelectedMode(routePlan.selectedId);
        } else if (routePlan && isLiveFollowMode(routePlan.selectedId)) {
          startRouteTracking(routePlan.selectedId);
        }
      });
      void ensureRouteFromLocation({ focusTo: false });
    } else {
      stopRouteTracking();
    }
    if (next === 'saved') {
      refreshSavedLists?.();
    }
    if (next === 'more') {
      void syncGoogleAccountProfile();
      const moreView = readStoredMoreView();
      setMoreView?.(moreView, { persist: false });
      // Only hydrate once when opening Edit profile — never overwrite in-progress typing.
      if (moreView === 'profile') void loadProfileEditor?.({ preserveDraft: true });
    }
  }

  async function runSearch(query) {
    if (!mapApi) return;
    const q = String(query || '').trim();
    if (!q) {
      await runCategory(activeCategory);
      return;
    }

    setStatus(`Searching “${q}”…`, { sticky: true });
    try {
      const places = await searchPlaces(q);
      if (!places.length) {
        mapApi.clearMarkers();
        setStatus(`No places found for “${q}”`);
        return;
      }
      mapApi.setStatusMarkers(places);
      setStatus(`${places.length} result${places.length === 1 ? '' : 's'} · ${q}`);
    } catch (err) {
      setStatus(err.message || 'Search failed', { type: 'error' });
    }
  }

  async function runCategory(categoryId) {
    if (!mapApi) return;
    activeCategory = categoryId || 'home';
    const selected = MAP_CATEGORIES.find((item) => item.id === activeCategory) || MAP_CATEGORIES[0];

    chips.forEach((chip) => {
      const active = chip.getAttribute('data-map-category') === selected.id;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (selected.id === 'home') {
      mapApi.clearMarkers();
      mapApi.map.setCenter(ORMOC_CENTER);
      mapApi.map.setZoom(14);
      setStatus('');
      return;
    }

    setStatus(`Finding ${selected.label}…`, { sticky: true });
    try {
      const places = await searchCategory(selected.id);
      if (!places.length) {
        mapApi.clearMarkers();
        setStatus(`No ${selected.label.toLowerCase()} found nearby`);
        return;
      }
      mapApi.setStatusMarkers(places, { category: selected.id });
      setStatus(`${places.length} ${selected.label.toLowerCase()} · tap a pin`);
    } catch (err) {
      setStatus(err.message || 'Category search failed', { type: 'error' });
    }
  }

  function setMapType(type) {
    const known = MAP_LAYERS.some((layer) => layer.id === type);
    activeMapType = known ? type : 'streets';
    mapTypeBtns.forEach((btn) => {
      const active = btn.getAttribute('data-map-type') === activeMapType;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (mapApi) mapApi.setMapType(activeMapType);
    // Keep Routes map on the same basemap the user picked on Map.
    if (routesMapApi) routesMapApi.setMapType(activeMapType);
    setLayersOpen(false);
  }

  function setLocateUi(active) {
    locateTracking = Boolean(active);
    if (!locateBtn) return;
    locateBtn.classList.toggle('is-active', locateTracking);
    locateBtn.setAttribute('aria-pressed', locateTracking ? 'true' : 'false');
    locateBtn.setAttribute('aria-label', 'My location');
    locateBtn.setAttribute('title', 'My location');
  }

  function stopLocateTracking({ keepMarker = true } = {}) {
    if (locateWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locateWatchId);
    }
    locateWatchId = null;
    locateBusy = false;
    locateBtn?.classList.remove('is-busy');
    setLocateUi(false);
    if (!keepMarker) mapApi?.clearUserLocation?.();
  }

  function applyLocatePosition(pos, { zoom = true } = {}) {
    if (!mapApi || !pos) return;
    const latlng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    mapApi.setUserLocation(latlng, {
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      follow: true,
    });
    if (zoom) {
      mapApi.map.setCenter(latlng);
      mapApi.map.setZoom(17);
    }
  }

  function locateErrorMessage(err) {
    if (!navigator.geolocation) return 'Please turn on location';
    // Permission denied, position unavailable, or device location off.
    if (err?.code === 1 || err?.code === 2) return 'Please turn on location';
    if (err?.code === 3) return 'Location request timed out — try again';
    return err?.message || 'Please turn on location';
  }

  async function requestAndLocate() {
    if (!navigator.geolocation) {
      stopLocateTracking({ keepMarker: true });
      showToast('Please turn on location', { type: 'error', duration: 3600 });
      return;
    }
    if (!mapApi) {
      showToast('Map is still loading', { type: 'error' });
      return;
    }

    // Cancel an in-flight locate request.
    if (locateBusy) {
      locateSeq += 1;
      stopLocateTracking({ keepMarker: true });
      return;
    }

    const seq = ++locateSeq;
    locateBusy = true;
    setLocateUi(true);
    locateBtn?.classList.add('is-busy');
    setLayersOpen(false);
    setEmergencyOpen(false);

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        });
      });
      if (seq !== locateSeq) return;
      applyLocatePosition(pos, { zoom: true });
      // One-shot: release the button once the fix is on the map.
      stopLocateTracking({ keepMarker: true });
    } catch (err) {
      if (seq !== locateSeq) return;
      stopLocateTracking({ keepMarker: true });
      showToast(locateErrorMessage(err), { type: 'error', duration: 3600 });
    } finally {
      if (seq === locateSeq) {
        locateBusy = false;
        locateBtn?.classList.remove('is-busy');
        setLocateUi(false);
      }
    }
  }

  async function initMap() {
    if (!mapEl) return;
    try {
      mapApi = await createOrmocMap(mapEl, { mapType: activeMapType });
      setStatus('');
      await runCategory('home');
    } catch (err) {
      setStatus(err.message || 'Could not load map', { sticky: true, type: 'error' });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setTab(tab.getAttribute('data-tab')));
  });

  if (layersBtn) {
    layersBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setEmergencyOpen(false);
      setLayersOpen(Boolean(layersSheet?.hidden));
    });
  }

  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setLayersOpen(false);
      setTouristRailOpen?.(false);
      const isOpen = Boolean(emergencyModal && !emergencyModal.hidden && emergencyModal.classList.contains('is-open'));
      setEmergencyOpen(!isOpen);
    });
  }

  if (locateBtn) {
    locateBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void requestAndLocate();
    });
  }

  async function routeToPlaceFromMap(place) {
    if (!place || !routesForm?.to) return;
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setStatus('That place has no location', { type: 'error' });
      return;
    }

    setTab('routes');
    // Let the Routes panel lay out before MapLibre measures the canvas.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bootApi = await ensureRoutesMap();
    bootApi?.invalidate?.();

    applyPlaceToInput(routesForm.to, {
      lat,
      lon,
      name: place.name || 'Destination',
      display_name: place.display_name || place.name || '',
    });
    syncRouteFieldChrome();
    await ensureRouteFromLocation({ focusTo: false });

    if (routesForm.from.value.trim() || routesForm.from.dataset.lat) {
      await runDirections();
      // One more paint after sheet height settles — fixes missing OSRM line.
      requestAnimationFrame(() => {
        routesMapApi?.refreshRoute?.();
        routesMapApi?.invalidate?.();
      });
    } else {
      setStatus('Set your starting point, then tap Go');
    }
  }

  window.addEventListener('ormocgo:route-to-place', (event) => {
    void routeToPlaceFromMap(event.detail);
  });

  emergencyModal?.querySelectorAll('[data-emergency-close]').forEach((btn) => {
    btn.addEventListener('click', () => setEmergencyOpen(false));
  });

  bindEmergencyListControls();
  void refreshEmergencyList();

  mapTypeBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      setMapType(btn.getAttribute('data-map-type'));
    });
  });

  document.addEventListener('click', (event) => {
    if (layersWrap?.classList.contains('is-open') && !layersWrap.contains(event.target)) {
      setLayersOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setLayersOpen(false);
      setEmergencyOpen(false);
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      hideMapSuggestions();
      runCategory(chip.getAttribute('data-map-category'));
    });
  });

  const touristRail = shell.querySelector('#tourist-rail');

  function mountTouristCardSlideshows() {
    if (!touristRail) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    touristRail.querySelectorAll('[data-tourist-slideshow]').forEach((media) => {
      if (media.dataset.bound === '1') return;
      media.dataset.bound = '1';
      const slides = [...media.querySelectorAll('[data-card-slide]')];
      const dots = [...media.querySelectorAll('[data-card-dot]')];
      if (slides.length < 2) return;

      let index = 0;
      let timer = null;

      function show(next) {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      }

      function start() {
        if (reduceMotion) return;
        stop();
        timer = window.setInterval(() => show(index + 1), 3200);
      }

      function stop() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }

      media.addEventListener('pointerenter', stop);
      media.addEventListener('pointerleave', start);
      start();
    });
  }

  async function hydrateTouristPhotos() {
    // Tourist images stay on local / curated assets (no Google Places).
  }

  function syncTouristSaveButtons() {
    if (!touristRail) return;
    touristRail.querySelectorAll('[data-tourist-id]').forEach((card) => {
      const spot = TOURIST_SPOTS.find((item) => item.id === card.dataset.touristId);
      if (!spot) return;
      const saved = isPlaceSaved(spot);
      const btn = card.querySelector('[data-tourist-save]');
      card.classList.toggle('is-saved', saved);
      if (btn) {
        btn.classList.toggle('is-saved', saved);
        btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
        btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save place');
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none');
      }
    });
  }

  mountTouristCardSlideshows();
  hydrateTouristPhotos();

  if (touristRail) {
    touristRail.addEventListener('click', async (event) => {
      const saveBtn = event.target.closest('[data-tourist-save]');
      if (saveBtn) {
        event.preventDefault();
        event.stopPropagation();
        const spot = TOURIST_SPOTS.find((item) => item.id === saveBtn.dataset.touristSave);
        if (!spot) return;
        const saved = toggleSavedPlace(spot);
        syncTouristSaveButtons();
        refreshSavedLists();
        setStatus(saved ? `Saved ${spot.name}` : `Removed ${spot.name}`, { type: 'success' });
        return;
      }

      const openBtn = event.target.closest('[data-tourist-open]');
      const card = event.target.closest('[data-tourist-id]');
      if (!openBtn && !card) return;
      const spotId = openBtn?.dataset.touristOpen || card?.dataset.touristId;
      const spot = TOURIST_SPOTS.find((item) => item.id === spotId);
      if (!spot) return;

      setTab('map');
      if (!mapApi) await initMap();
      if (!mapApi) return;

      touristRail.querySelectorAll('.tourist-card').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.touristId === spot.id);
      });

      const place = {
        lat: spot.lat,
        lon: spot.lon,
        name: spot.name,
        display_name: `${spot.blurb} · ${spot.rating.toFixed(1)}★ (${spot.reviews} reviews)`,
      };
      mapApi.setStatusMarkers([place]);
      mapApi.focusPlace(place, { zoom: 15 });
      setStatus(`${spot.name} · ${spot.rating.toFixed(1)}★`);
    });
  }

  const mapSuggest = shell.querySelector('#map-suggest');
  let mapSuggestItems = [];
  let mapSuggestSeq = 0;

  function hideMapSuggestions() {
    mapSuggestItems = [];
    if (mapSuggest) {
      mapSuggest.hidden = true;
      mapSuggest.innerHTML = '';
    }
    searchInput?.setAttribute('aria-expanded', 'false');
  }

  function showMapSuggestions(places, { loading = false } = {}) {
    if (!mapSuggest) return;
    mapSuggestItems = places || [];

    if (loading && !mapSuggestItems.length) {
      mapSuggest.innerHTML = `<div class="map-suggest-status">Searching places…</div>`;
      mapSuggest.hidden = false;
      searchInput?.setAttribute('aria-expanded', 'true');
      return;
    }

    if (!mapSuggestItems.length) {
      mapSuggest.innerHTML = `<div class="map-suggest-status">No places found</div>`;
      mapSuggest.hidden = false;
      searchInput?.setAttribute('aria-expanded', 'true');
      return;
    }

    mapSuggest.innerHTML = mapSuggestItems
      .map((place, i) => renderSuggestItem(place, i, { kind: 'map' }))
      .join('');
    mapSuggest.hidden = false;
    searchInput?.setAttribute('aria-expanded', 'true');
  }

  async function pickMapSuggestion(place) {
    if (!place) return;
    hideMapSuggestions();
    if (searchInput) searchInput.value = place.name || place.display_name || '';

    chips.forEach((chip) => {
      chip.classList.remove('is-active');
      chip.setAttribute('aria-pressed', 'false');
    });

    try {
      if (!mapApi && mapEl) {
        mapApi = await createOrmocMap(mapEl, { mapType: activeMapType });
      }
      if (!mapApi) {
        setStatus('Map is still loading', { type: 'error' });
        return;
      }
      mapApi.setStatusMarkers([place]);
      mapApi.focusPlace(place, { zoom: 16 });
      setStatus(place.name || 'Place found');
    } catch (err) {
      setStatus(err.message || 'Could not open place', { type: 'error' });
    }
  }

  if (searchForm) {
    searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (mapSuggestItems.length) {
        await pickMapSuggestion(mapSuggestItems[0]);
        searchInput?.blur();
        return;
      }
      hideMapSuggestions();
      await runSearch(searchInput?.value || '');
      searchInput?.blur();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = searchInput.value.trim();
      if (!q) {
        hideMapSuggestions();
        searchTimer = setTimeout(() => runCategory(activeCategory), 200);
        return;
      }
      if (q.length < 2) {
        hideMapSuggestions();
        return;
      }

      const seq = ++mapSuggestSeq;
      showMapSuggestions([], { loading: true });
      searchTimer = setTimeout(async () => {
        try {
          const places = await suggestPlaces(q, { limit: 6 });
          if (seq !== mapSuggestSeq) return;
          showMapSuggestions(places);
        } catch (_) {
          if (seq !== mapSuggestSeq) return;
          showMapSuggestions([]);
        }
      }, 280);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideMapSuggestions();
    });

    searchInput.addEventListener('blur', () => {
      // Let suggestion click register before closing.
      window.setTimeout(() => {
        if (!mapSuggest?.contains(document.activeElement)) hideMapSuggestions();
      }, 160);
    });
  }

  if (mapSuggest) {
    mapSuggest.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    mapSuggest.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-map-suggest-index]');
      if (!btn) return;
      const place = mapSuggestItems[Number(btn.getAttribute('data-map-suggest-index'))];
      void pickMapSuggestion(place);
    });
  }

  const routesModes = shell.querySelector('#routes-modes');
  const routesModesGrid = shell.querySelector('#routes-modes-grid');
  const routesIdle = shell.querySelector('#routes-idle');
  const routesGuideChibi = shell.querySelector('#routes-guide-chibi');
  const routesResult = shell.querySelector('#routes-result');
  const routesResultTime = shell.querySelector('#routes-result-time');
  const routesResultDest = shell.querySelector('#routes-result-dest');
  const routesMapEl = shell.querySelector('#routes-map');
  const routesSuggest = shell.querySelector('#routes-suggest');
  const routeLocateBtn = shell.querySelector('#route-use-location');
  const routeSwapBtn = shell.querySelector('#route-swap');
  const routesSaveBtn = shell.querySelector('#routes-save-btn');
  const routesSheet = shell.querySelector('#routes-sheet');
  const routesSheetDrag = shell.querySelector('[data-routes-drag]');
  const routeFromClear = shell.querySelector('[data-route-clear="from"]');
  const routeToClear = shell.querySelector('[data-route-clear="to"]');
  let routePlan = null;
  let routeFromPrefillPromise = null;

  function clearRouteInput(input) {
    if (!input) return;
    input.value = '';
    delete input.dataset.lat;
    delete input.dataset.lon;
    delete input.dataset.label;
  }

  function syncRouteFieldChrome() {
    const fromHas = Boolean(routesForm?.from?.value.trim());
    const toHas = Boolean(routesForm?.to?.value.trim());
    if (routeFromClear) routeFromClear.hidden = !fromHas;
    if (routeToClear) routeToClear.hidden = !toHas;
    if (routeLocateBtn) routeLocateBtn.hidden = fromHas;
  }

  function focusRouteDestination() {
    const to = routesForm?.to;
    if (!to) return;
    requestAnimationFrame(() => {
      to.focus({ preventScroll: true });
      const len = to.value.length;
      try {
        to.setSelectionRange(len, len);
      } catch (_) {
        /* some browsers block setSelectionRange on type=search */
      }
    });
  }

  async function ensureRouteFromLocation({ focusTo = false } = {}) {
    if (!routesForm?.from) return null;
    const from = routesForm.from;
    const value = from.value.trim();
    const hasCoords = Boolean(from.dataset.lat && from.dataset.lon);
    const isGenericHere = !value || /^(your|current|my) location$/i.test(value);

    if (hasCoords && value && !isGenericHere) {
      syncRouteFieldChrome();
      if (focusTo) focusRouteDestination();
      return {
        lat: Number(from.dataset.lat),
        lon: Number(from.dataset.lon),
        label: from.dataset.label || value,
      };
    }

    if (hasCoords && isGenericHere) {
      syncRouteFieldChrome();
      if (focusTo) focusRouteDestination();
      return {
        lat: Number(from.dataset.lat),
        lon: Number(from.dataset.lon),
        label: 'Your location',
      };
    }

    if (routeFromPrefillPromise) {
      const place = await routeFromPrefillPromise;
      if (focusTo) focusRouteDestination();
      return place;
    }

    routeFromPrefillPromise = (async () => {
      try {
        const here = await getCurrentPosition();
        const nextValue = from.value.trim();
        const nextHasCoords = Boolean(from.dataset.lat && from.dataset.lon);
        // Another path (saved route, suggestion, locate) may have filled From while GPS resolved.
        if (nextHasCoords && nextValue) {
          syncRouteFieldChrome();
          return {
            lat: Number(from.dataset.lat),
            lon: Number(from.dataset.lon),
            label: from.dataset.label || nextValue,
          };
        }
        if (nextValue && !/^(your|current|my) location$/i.test(nextValue)) {
          syncRouteFieldChrome();
          return null;
        }
        from.value = 'Your location';
        from.dataset.lat = String(here.lat);
        from.dataset.lon = String(here.lon);
        from.dataset.label = 'Your location';
        syncRouteFieldChrome();
        const api = await ensureRoutesMap();
        api?.setUserLocation({ lat: here.lat, lng: here.lon });
        return {
          lat: here.lat,
          lon: here.lon,
          label: 'Your location',
        };
      } catch (_) {
        syncRouteFieldChrome();
        return null;
      } finally {
        routeFromPrefillPromise = null;
      }
    })();

    const place = await routeFromPrefillPromise;
    if (focusTo) focusRouteDestination();
    return place;
  }

  function routesSheetHeights() {
    const viewH = window.innerHeight || 700;
    const natural = routesSheet?.scrollHeight || 180;
    return {
      mid: Math.min(Math.max(natural, 160), Math.round(viewH * 0.42)),
      max: Math.min(Math.round(viewH * 0.78), 560),
      min: 150,
    };
  }

  function setRoutesSheetHeight(px, { expanded = false } = {}) {
    if (!routesSheet) return;
    routesSheet.style.setProperty('--routes-sheet-h', `${Math.max(140, Math.round(px))}px`);
    routesSheet.classList.toggle('is-expanded', expanded);
    routesMapApi?.invalidate?.();
  }

  function resetRoutesSheetHeight() {
    if (!routesSheet) return;
    routesSheet.classList.remove('is-dragging', 'is-expanded');
    routesSheet.style.removeProperty('--routes-sheet-h');
    routesMapApi?.invalidate?.();
  }

  function bindRoutesSheetDrag() {
    if (!routesSheet || !routesSheetDrag || routesSheetDrag.dataset.dragBound === '1') return;
    routesSheetDrag.dataset.dragBound = '1';

    let dragging = false;
    let startY = 0;
    let startH = 0;
    let pointerId = null;

    const onMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const { max, min } = routesSheetHeights();
      const nextH = Math.min(max, Math.max(min, startH + (startY - event.clientY)));
      setRoutesSheetHeight(nextH, { expanded: nextH > routesSheetHeights().mid + 36 });
    };

    const onUp = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      routesSheet.classList.remove('is-dragging');
      try {
        routesSheetDrag.releasePointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
      pointerId = null;

      const currentH = routesSheet.getBoundingClientRect().height;
      const { mid, max } = routesSheetHeights();
      if (currentH >= (mid + max) / 2) {
        setRoutesSheetHeight(max, { expanded: true });
        return;
      }
      resetRoutesSheetHeight();
    };

    routesSheetDrag.addEventListener('pointerdown', (event) => {
      if (event.button != null && event.button !== 0) return;
      dragging = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      startH = routesSheet.getBoundingClientRect().height;
      routesSheet.classList.add('is-dragging');
      routesSheet.style.setProperty('--routes-sheet-h', `${Math.round(startH)}px`);
      routesSheetDrag.setPointerCapture(pointerId);
      event.preventDefault();
    });

    routesSheetDrag.addEventListener('pointermove', onMove);
    routesSheetDrag.addEventListener('pointerup', onUp);
    routesSheetDrag.addEventListener('pointercancel', onUp);
  }

  bindRoutesSheetDrag();

  function currentRouteSavePayload() {
    if (!routePlan?.modes?.length) return null;
    const mode = routePlan.modes.find((m) => m.id === routePlan.selectedId) || routePlan.modes[0];
    return {
      from: routePlan.from,
      to: routePlan.to,
      modeId: mode.id,
      modeLabel: mode.label,
      durationMin: mode.durationMin,
      distanceKm: mode.distanceKm,
    };
  }

  function syncRouteSaveButton() {
    if (!routesSaveBtn) return;
    const payload = currentRouteSavePayload();
    const saved = payload ? isRouteSaved(payload) : false;
    routesSaveBtn.classList.toggle('is-saved', saved);
    routesSaveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    routesSaveBtn.setAttribute('aria-label', saved ? 'Remove saved route' : 'Save route');
    const svg = routesSaveBtn.querySelector('svg');
    if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none');
  }
  let routesMapApi = null;
  let routesMapPromise = null;
  let suggestTimer = null;
  let suggestItems = [];
  let suggestTarget = null;
  let routeWatchId = null;

  function isLiveFollowMode(modeId) {
    return modeId === 'walk' || modeId === 'run';
  }

  function stopRouteTracking() {
    if (routeWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(routeWatchId);
    }
    routeWatchId = null;
  }

  function startRouteTracking(modeId) {
    stopRouteTracking();
    if (!navigator.geolocation || !isLiveFollowMode(modeId)) return;

    routeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const api = routesMapApi;
        if (!api || !routePlan || !isLiveFollowMode(routePlan.selectedId)) return;

        const latlng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        api.setUserLocation(latlng, {
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          follow: false,
          moveStart: false,
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 12000,
      },
    );
  }

  async function ensureRoutesMap() {
    if (routesMapApi) return routesMapApi;
    if (!routesMapEl) return null;
    if (!routesMapPromise) {
      routesMapPromise = createOrmocMap(routesMapEl, { locate: false, mapType: activeMapType })
        .then((api) => {
          routesMapApi = api;
          return api;
        })
        .catch((err) => {
          routesMapPromise = null;
          throw err;
        });
    }
    return routesMapPromise;
  }

  function setRoutesIdleMode(mode = 'prompt') {
    const next = mode === 'guide' || mode === 'loading' ? mode : 'prompt';
    if (routesIdle) {
      routesIdle.hidden = next === 'guide';
      routesIdle.classList.toggle('is-loading-hint', next === 'loading');
      const title = routesIdle.querySelector('.routes-idle-title');
      const copy = routesIdle.querySelector('.routes-idle-copy');
      if (next === 'loading') {
        if (title) title.textContent = 'Finding routes…';
        if (copy) copy.textContent = 'Comparing walk, run, bike, motor, and car.';
      } else {
        if (title) title.textContent = 'Asa ka padong bai?';
        if (copy) copy.textContent = 'Pilia ang destinasyon aron itandi ang oras sa biyahe.';
      }
    }
    if (routesGuideChibi) routesGuideChibi.hidden = next !== 'guide';
  }

  function setRoutesEmpty(empty) {
    setRoutesIdleMode(empty ? 'prompt' : 'guide');
    if (routesModes) routesModes.hidden = empty;
    if (routesResult) {
      routesResult.hidden = empty;
      routesResult.classList.toggle('is-empty', empty);
    }
    if (routesSaveBtn) routesSaveBtn.hidden = empty;
    if (empty) {
      if (routesResultTime) routesResultTime.textContent = '—';
      if (routesSummary) routesSummary.textContent = 'Choose a destination to see travel time';
      if (routesResultDest) routesResultDest.textContent = '';
      stopRouteTracking();
      resetRoutesSheetHeight();
    }
    routesSheet?.classList.toggle('has-route', !empty);
  }

  function hideSuggestions() {
    suggestItems = [];
    suggestTarget = null;
    if (routesSuggest) {
      routesSuggest.hidden = true;
      routesSuggest.innerHTML = '';
      routesSuggest.classList.remove('is-loading');
    }
    shell.querySelector('#routes-sheet')?.classList.remove('is-suggesting');
  }

  function showSuggestions(target, places, { loading = false } = {}) {
    suggestTarget = target;
    suggestItems = places || [];
    if (!routesSuggest) return;

    shell.querySelector('#routes-sheet')?.classList.add('is-suggesting');
    routesSuggest.classList.toggle('is-loading', loading);

    if (loading && !suggestItems.length) {
      routesSuggest.innerHTML = `<div class="routes-suggest-status">Searching places…</div>`;
      routesSuggest.hidden = false;
      return;
    }

    if (!suggestItems.length) {
      routesSuggest.innerHTML = `<div class="routes-suggest-status">No places found</div>`;
      routesSuggest.hidden = false;
      return;
    }

    routesSuggest.innerHTML = suggestItems.map((place, i) => renderSuggestItem(place, i)).join('');
    routesSuggest.hidden = false;
  }

  function applyPlaceToInput(input, place) {
    if (!input || !place) return;
    input.value = place.name || place.display_name || '';
    input.dataset.lat = String(place.lat);
    input.dataset.lon = String(place.lon);
    input.dataset.label = place.name || '';
    syncRouteFieldChrome();
  }

  async function resolveEndpoint(input, { allowGps = false } = {}) {
    const value = String(input?.value || '').trim();
    const cachedLat = Number(input?.dataset.lat);
    const cachedLon = Number(input?.dataset.lon);

    if (Number.isFinite(cachedLat) && Number.isFinite(cachedLon) && value) {
      return {
        lat: cachedLat,
        lon: cachedLon,
        label: input.dataset.label || value,
      };
    }

    if (allowGps && (!value || /^(your|current|my) location$/i.test(value))) {
      const here = await getCurrentPosition();
      if (input && !value) {
        input.value = 'Your location';
        input.dataset.lat = String(here.lat);
        input.dataset.lon = String(here.lon);
        input.dataset.label = 'Your location';
        syncRouteFieldChrome();
      }
      return here;
    }

    if (!value) throw new Error(allowGps ? 'Set a starting point.' : 'Choose a destination.');
    const hits = await searchPlaces(value, { limit: 1, bounded: false });
    if (!hits.length) {
      throw new Error(allowGps ? 'Could not find your starting place.' : 'Could not find that destination.');
    }
    applyPlaceToInput(input, hits[0]);
    return {
      lat: Number(hits[0].lat),
      lon: Number(hits[0].lon),
      label: hits[0].name,
    };
  }

  async function applySelectedMode(modeId) {
    if (!routePlan?.modes?.length) return;
    const mode = routePlan.modes.find((m) => m.id === modeId) || routePlan.modes[0];
    routePlan.selectedId = mode.id;

    if (routesModesGrid) {
      routesModesGrid.innerHTML = routePlan.modes
        .map((m) => renderModeCard(m, routePlan.selectedId))
        .join('');
    }
    if (routesResultTime) {
      routesResultTime.textContent = formatModeMinutes(mode.durationMin);
    }
    if (routesSummary) {
      const km = mode.distanceKm < 10 ? mode.distanceKm.toFixed(1) : Math.round(mode.distanceKm);
      routesSummary.textContent = `${mode.label} · ${km} km`;
    }
    if (routesResultDest) {
      routesResultDest.textContent = routePlan.to.label;
    }
    setRoutesEmpty(false);
    syncRouteSaveButton();

    const api = await ensureRoutesMap();
    if (api) {
      const live = isLiveFollowMode(mode.id);
      api.clearMarkers();
      api.drawRoute(mode.coordinates, {
        label: routePlan.to.label,
        liveStart: live,
        fit: true,
      });
      api.invalidate();
      // Re-paint after layout — Routes map often starts at 0×0 while the panel is hidden.
      window.setTimeout(() => {
        api.refreshRoute?.();
        api.invalidate();
      }, 160);

      if (live) {
        // Seed current position immediately, then keep watching as the user walks.
        try {
          const here = await getCurrentPosition();
          api.setUserLocation(
            { lat: here.lat, lng: here.lon },
            { follow: false, accuracy: 25 },
          );
        } catch (_) { /* watch will still try */ }
        startRouteTracking(mode.id);
      } else {
        stopRouteTracking();
      }
    }
  }

  if (routesSaveBtn) {
    routesSaveBtn.addEventListener('click', () => {
      const payload = currentRouteSavePayload();
      if (!payload) return;
      const saved = toggleSavedRoute(payload);
      syncRouteSaveButton();
      refreshSavedLists();
      setStatus(saved ? 'Route saved' : 'Route removed from saved', { type: 'success' });
    });
  }

  async function runDirections() {
    if (!routesForm) return;
    if (routesError) routesError.hidden = true;
    hideSuggestions();
    setRoutesEmpty(true);
    setRoutesIdleMode('loading');
    routePlan = null;

    const toValue = routesForm.to.value.trim();
    if (!toValue) {
      setRoutesEmpty(true);
      return;
    }

    const submit = routesForm.querySelector('[type="submit"]');
    const sheet = shell.querySelector('#routes-sheet');
    if (submit) submit.disabled = true;
    sheet?.classList.add('is-loading');

    try {
      await ensureRoutesMap();
      const fromPlace = await resolveEndpoint(routesForm.from, { allowGps: true });
      const toPlace = await resolveEndpoint(routesForm.to);

      const modes = await routeAllModes(fromPlace, toPlace);
      const fastest = [...modes].sort((a, b) => a.durationMin - b.durationMin)[0];
      routePlan = {
        from: fromPlace,
        to: toPlace,
        modes,
        selectedId: fastest?.id || 'car',
      };

      await applySelectedMode(routePlan.selectedId);
      sheet?.classList.add('has-route');
    } catch (err) {
      setRoutesEmpty(true);
      sheet?.classList.remove('has-route');
      if (routesError) {
        routesError.hidden = false;
        routesError.textContent = err.message || 'Routing failed.';
      }
    } finally {
      if (submit) submit.disabled = false;
      sheet?.classList.remove('is-loading');
    }
  }

  function bindSuggestInput(input) {
    if (!input) return;

    input.addEventListener('input', () => {
      delete input.dataset.lat;
      delete input.dataset.lon;
      delete input.dataset.label;
      syncRouteFieldChrome();
      clearTimeout(suggestTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        hideSuggestions();
        return;
      }
      showSuggestions(input, [], { loading: true });
      suggestTimer = setTimeout(async () => {
        try {
          const places = await suggestPlaces(q, { limit: 6 });
          if (document.activeElement !== input && !routesSuggest?.matches(':hover')) return;
          showSuggestions(input, places);
        } catch (_) {
          if (document.activeElement === input) {
            showSuggestions(input, []);
          } else {
            hideSuggestions();
          }
        }
      }, 180);
    });

    input.addEventListener('focus', () => {
      const q = input.value.trim();
      if (q.length >= 2) {
        showSuggestions(input, suggestTarget === input ? suggestItems : [], { loading: !suggestItems.length });
        clearTimeout(suggestTimer);
        suggestTimer = setTimeout(async () => {
          const places = await suggestPlaces(q, { limit: 6 });
          if (document.activeElement !== input) return;
          showSuggestions(input, places);
        }, 80);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (routesSuggest?.matches(':hover')) return;
        if (routesSuggest?.contains(document.activeElement)) return;
        hideSuggestions();
      }, 180);
    });
  }

  bindSuggestInput(routesForm?.from);
  bindSuggestInput(routesForm?.to);
  routesForm?.from?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    hideSuggestions();
    focusRouteDestination();
  });
  syncRouteFieldChrome();

  shell.querySelectorAll('[data-route-clear]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const which = btn.getAttribute('data-route-clear');
      const input = which === 'to' ? routesForm?.to : routesForm?.from;
      clearRouteInput(input);
      hideSuggestions();
      syncRouteFieldChrome();
      if (which === 'to') {
        setRoutesEmpty(true);
        input?.focus();
        return;
      }
      input?.focus();
    });
  });

  if (routesSuggest) {
    routesSuggest.addEventListener('mousedown', (event) => event.preventDefault());
    routesSuggest.addEventListener('touchstart', (event) => {
      const item = event.target.closest('[data-suggest-index]');
      if (item) event.preventDefault();
    }, { passive: false });
    routesSuggest.addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-suggest-index]');
      if (!btn || !suggestTarget) return;
      const place = suggestItems[Number(btn.dataset.suggestIndex)];
      if (!place) return;
      applyPlaceToInput(suggestTarget, place);
      syncRouteFieldChrome();
      hideSuggestions();
      if (suggestTarget === routesForm?.to && (routesForm.from.value.trim() || routesForm.from.dataset.lat)) {
        await runDirections();
      } else if (suggestTarget === routesForm?.from) {
        focusRouteDestination();
      }
    });
  }

  if (routeLocateBtn) {
    routeLocateBtn.addEventListener('click', async () => {
      routeLocateBtn.disabled = true;
      try {
        const here = await getCurrentPosition();
        if (routesForm?.from) {
          routesForm.from.value = 'Your location';
          routesForm.from.dataset.lat = String(here.lat);
          routesForm.from.dataset.lon = String(here.lon);
          routesForm.from.dataset.label = 'Your location';
        }
        hideSuggestions();
        syncRouteFieldChrome();
        const api = await ensureRoutesMap();
        api?.setUserLocation({ lat: here.lat, lng: here.lon });
        focusRouteDestination();
      } finally {
        routeLocateBtn.disabled = false;
      }
    });
  }

  if (routeSwapBtn && routesForm) {
    routeSwapBtn.addEventListener('click', () => {
      const from = routesForm.from;
      const to = routesForm.to;
      if (!from || !to) return;
      const swap = {
        value: from.value,
        lat: from.dataset.lat,
        lon: from.dataset.lon,
        label: from.dataset.label,
      };
      from.value = to.value;
      from.dataset.lat = to.dataset.lat || '';
      from.dataset.lon = to.dataset.lon || '';
      from.dataset.label = to.dataset.label || '';
      to.value = swap.value;
      to.dataset.lat = swap.lat || '';
      to.dataset.lon = swap.lon || '';
      to.dataset.label = swap.label || '';
      hideSuggestions();
      syncRouteFieldChrome();
    });
  }

  if (routesModesGrid) {
    routesModesGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (!btn) return;
      applySelectedMode(btn.dataset.mode);
    });
  }

  if (routesForm) {
    routesForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await runDirections();
    });
  }

  // Don't create the Routes map while its panel is display:none — that leaves
  // MapLibre at 0×0 and the OSRM line never paints (markers still show).

  shell.querySelectorAll('[data-more-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openAuthSheet(btn.getAttribute('data-more-sheet'));
    });
  });

  const moreScreen = shell.querySelector('.more-screen');
  const moreHomePane = shell.querySelector('[data-more-pane="home"]');
  const moreProfilePane = shell.querySelector('[data-more-pane="profile"]');
  const profileForm = shell.querySelector('#profile-edit-form');
  const profileNameInput = shell.querySelector('#profile-fullname');
  const profileAboutInput = shell.querySelector('#profile-about');
  const profileSkillInput = shell.querySelector('#profile-skill-input');
  const profileSkillList = shell.querySelector('#profile-skill-list');
  const profileSkillAdd = shell.querySelector('#profile-skill-add');
  const profileResumeInput = shell.querySelector('#profile-resume-input');
  const profileResumeBox = shell.querySelector('[data-profile-resume-box]');
  const profileResumeStatus = shell.querySelector('#profile-resume-status');
  const profileFormStatus = shell.querySelector('#profile-form-status');
  const moreDisplayName = shell.querySelector('[data-more-display-name]');
  const moreEmailEl = shell.querySelector('[data-more-email]');
  const moreAvatarEl = shell.querySelector('[data-more-avatar]');
  let profileSkills = [];
  let profileUser = null;
  let profileEditorReady = false;
  let profileDraftDirty = false;
  let profileDraftTimer = null;

  async function ensureProfileUser({ force = false } = {}) {
    if (profileUser && !force) return profileUser;
    try {
      const supabase = await getSupabase();
      // getUser() usually has fuller Google metadata than the cached session user.
      const { data: userData } = await supabase?.auth.getUser() || {};
      if (userData?.user) {
        profileUser = userData.user;
        return profileUser;
      }
      const { data } = await supabase?.auth.getSession() || {};
      profileUser = data?.session?.user || { id: 'local' };
    } catch (_) {
      profileUser = { id: 'local' };
    }
    return profileUser;
  }

  function paintMoreAccount(user) {
    if (!user) return;
    const accountName = displayName(user);
    const photo = profilePhotoUrl(user);
    if (moreDisplayName) moreDisplayName.textContent = accountName;
    if (moreEmailEl && user.email) moreEmailEl.textContent = user.email;
    if (!moreAvatarEl) return;

    if (photo) {
      moreAvatarEl.classList.add('more-avatar--photo');
      let img = moreAvatarEl.querySelector('[data-more-avatar-img]');
      if (!img) {
        moreAvatarEl.innerHTML = '';
        img = document.createElement('img');
        img.className = 'more-avatar-img';
        img.alt = '';
        img.width = 64;
        img.height = 64;
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.dataset.moreAvatarImg = '';
        moreAvatarEl.appendChild(img);
      }
      img.src = photo;
      img.onerror = () => {
        moreAvatarEl.classList.remove('more-avatar--photo');
        moreAvatarEl.innerHTML = `<span class="more-avatar-initials" data-more-avatar-initials>${escapeHtml(initials(accountName))}</span>`;
      };
      return;
    }

    moreAvatarEl.classList.remove('more-avatar--photo');
    moreAvatarEl.innerHTML = `<span class="more-avatar-initials" data-more-avatar-initials>${escapeHtml(initials(accountName))}</span>`;
  }

  function setMoreView(view, { persist = true } = {}) {
    const next = view === 'profile' ? 'profile' : 'home';
    moreScreen?.setAttribute('data-more-view', next);
    if (moreHomePane) moreHomePane.hidden = next !== 'home';
    if (moreProfilePane) moreProfilePane.hidden = next !== 'profile';
    if (persist) persistMoreView(next);
    if (next === 'profile') {
      document.title = 'Edit profile · OrmocGo';
    } else if (shell.dataset.activeTab === 'more') {
      document.title = 'More · OrmocGo';
    }
  }

  function renderSkillList() {
    if (!profileSkillList) return;
    profileSkillList.innerHTML = profileSkills.map((skill) => `
      <li class="profile-skill-item">
        <span>${escapeHtml(skill)}</span>
        <button type="button" class="profile-skill-remove" data-profile-skill-remove="${escapeHtml(skill)}" aria-label="Remove ${escapeHtml(skill)}">×</button>
      </li>
    `).join('');
  }

  function getEditorDraftSnapshot() {
    return {
      fullName: String(profileNameInput?.value || ''),
      about: String(profileAboutInput?.value || ''),
      skills: [...profileSkills],
    };
  }

  function applyEditorFields({ fullName = '', about = '', skills = [] } = {}, user) {
    profileSkills = Array.isArray(skills) ? [...skills] : [];
    if (profileNameInput) profileNameInput.value = fullName || displayName(user);
    if (profileAboutInput) profileAboutInput.value = about || '';
    renderSkillList();
  }

  function persistEditorDraft(user) {
    writeProfileDraft(user, getEditorDraftSnapshot());
    profileDraftDirty = true;
  }

  function scheduleEditorDraft(user) {
    profileDraftDirty = true;
    clearTimeout(profileDraftTimer);
    profileDraftTimer = setTimeout(() => {
      writeProfileDraft(user, getEditorDraftSnapshot());
    }, 200);
  }

  function refreshMoreProfileSummary(profile, user) {
    paintMoreAccount(user);
    if (profileResumeBox) profileResumeBox.innerHTML = renderResumeSummary(profile.resume);
  }

  async function syncGoogleAccountProfile() {
    const user = await ensureProfileUser({ force: true });
    paintMoreAccount(user);
    if (!user?.id || user.id === 'local') return user;

    const profile = getUserProfile(user);
    const googleName = displayName(user);
    const emailLocal = user.email ? user.email.split('@')[0] : '';
    const shouldSeedName = !profile.fullName
      || profile.fullName.toLowerCase() === String(emailLocal || '').toLowerCase();
    if (shouldSeedName && googleName && googleName !== 'there') {
      saveUserProfile(user, { fullName: googleName });
      if (profileNameInput && (!profileNameInput.value || profileNameInput.value === emailLocal)) {
        profileNameInput.value = googleName;
      }
    }
    return user;
  }

  async function loadProfileEditor({ preserveDraft = false, force = false } = {}) {
    const user = await ensureProfileUser();
    const draft = readProfileDraft(user);

    // Keep whatever the user is typing when switching tabs / returning to the app.
    if (preserveDraft && profileEditorReady && !force) {
      if (profileDraftDirty || draft) {
        if (draft && !profileDraftDirty) applyEditorFields(draft, user);
        return;
      }
      if (profileAboutInput?.value || profileNameInput?.value || profileSkills.length) {
        return;
      }
    }

    let profile = getUserProfile(user);
    const initial = draft || {
      fullName: profile.fullName || displayName(user),
      about: profile.about || '',
      skills: [...(profile.skills || [])],
    };
    applyEditorFields(initial, user);
    profileDraftDirty = Boolean(draft);
    if (profileResumeStatus) profileResumeStatus.textContent = '';
    if (profileFormStatus) profileFormStatus.textContent = '';
    if (profileResumeBox) profileResumeBox.innerHTML = renderResumeSummary(profile.resume);
    profileEditorReady = true;

    profile = await hydrateUserProfile(user);
    // Never clobber unsaved draft after remote hydrate.
    if (!(profileDraftDirty || readProfileDraft(user))) {
      applyEditorFields({
        fullName: profile.fullName || displayName(user),
        about: profile.about || '',
        skills: [...(profile.skills || [])],
      }, user);
    }
    if (profileResumeBox) profileResumeBox.innerHTML = renderResumeSummary(profile.resume);
    refreshMoreProfileSummary(profile, user);
  }

  function addProfileSkill() {
    const value = String(profileSkillInput?.value || '').trim();
    if (!value) return;
    const exists = profileSkills.some((skill) => skill.toLowerCase() === value.toLowerCase());
    if (!exists && profileSkills.length < 24) {
      profileSkills.push(value.slice(0, 40));
      renderSkillList();
      ensureProfileUser().then((user) => persistEditorDraft(user));
    }
    if (profileSkillInput) profileSkillInput.value = '';
    profileSkillInput?.focus();
  }

  shell.querySelector('[data-more-open-profile]')?.addEventListener('click', async () => {
    await loadProfileEditor({ preserveDraft: true });
    setMoreView('profile');
  });

  shell.querySelector('[data-more-close-profile]')?.addEventListener('click', () => {
    // Keep draft so Back → Edit profile still has typed text until Save.
    setMoreView('home');
  });

  profileNameInput?.addEventListener('input', () => {
    ensureProfileUser().then((user) => scheduleEditorDraft(user));
  });
  profileAboutInput?.addEventListener('input', () => {
    ensureProfileUser().then((user) => scheduleEditorDraft(user));
  });

  // Flush draft when leaving the app / phone tab so remount can restore it.
  const flushProfileDraft = () => {
    if (!profileDraftDirty) return;
    ensureProfileUser().then((user) => {
      writeProfileDraft(user, getEditorDraftSnapshot());
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushProfileDraft();
  });
  window.addEventListener('pagehide', flushProfileDraft);

  profileSkillAdd?.addEventListener('click', addProfileSkill);
  profileSkillInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addProfileSkill();
    }
  });

  profileSkillList?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-profile-skill-remove]');
    if (!btn) return;
    const skill = btn.getAttribute('data-profile-skill-remove');
    profileSkills = profileSkills.filter((item) => item !== skill);
    renderSkillList();
    ensureProfileUser().then((user) => persistEditorDraft(user));
  });

  profileResumeInput?.addEventListener('change', async () => {
    const file = profileResumeInput.files?.[0];
    profileResumeInput.value = '';
    if (!file) return;
    const user = await ensureProfileUser();
    if (profileResumeStatus) profileResumeStatus.textContent = 'Uploading…';
    try {
      const profile = await saveUserResume(user, file);
      if (profileResumeBox) profileResumeBox.innerHTML = renderResumeSummary(profile.resume);
      if (profileResumeStatus) profileResumeStatus.textContent = '';
      refreshMoreProfileSummary(profile, user);
      showToast('Resume uploaded', { type: 'success' });
    } catch (err) {
      if (profileResumeStatus) profileResumeStatus.textContent = '';
      showToast(err?.message || 'Could not upload resume', { type: 'error' });
    }
  });

  profileResumeBox?.addEventListener('click', async (event) => {
    const user = await ensureProfileUser();
    if (event.target.closest('[data-profile-resume-remove]')) {
      try {
        const profile = await removeUserResume(user);
        if (profileResumeBox) profileResumeBox.innerHTML = renderResumeSummary(profile.resume);
        if (profileResumeStatus) profileResumeStatus.textContent = '';
        refreshMoreProfileSummary(profile, user);
        showToast('Resume removed', { type: 'success' });
      } catch (err) {
        showToast(err?.message || 'Could not remove resume', { type: 'error' });
      }
      return;
    }
    if (event.target.closest('[data-profile-resume-download]')) {
      try {
        const blob = await getUserResumeBlob(user);
        const profile = getUserProfile(user);
        if (!blob) {
          showToast('Resume file not found', { type: 'error' });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = profile.resume?.name || 'resume';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (_) {
        showToast('Could not download resume', { type: 'error' });
      }
    }
  });

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = profileForm.querySelector('.profile-save-btn');
    if (saveBtn) saveBtn.disabled = true;
    if (profileFormStatus) profileFormStatus.textContent = '';
    try {
      const user = await ensureProfileUser();
      const profile = saveUserProfile(user, {
        fullName: profileNameInput?.value || '',
        about: profileAboutInput?.value || '',
        skills: profileSkills,
      });
      clearProfileDraft(user);
      profileDraftDirty = false;
      refreshMoreProfileSummary(profile, user);
      showToast('Profile saved', { type: 'success' });
    } catch (err) {
      showToast(err?.message || 'Could not save profile', { type: 'error' });
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  ensureProfileUser().then(async (user) => {
    refreshMoreProfileSummary(getUserProfile(user), user);
    const hydrated = await hydrateUserProfile(user);
    refreshMoreProfileSummary(hydrated, user);
  });

  const signOutConfirm = shell.querySelector('#signout-confirm');
  const signOutConfirmOk = shell.querySelector('[data-signout-confirm]');
  const signOutConfirmCancel = shell.querySelector('[data-signout-cancel]');

  function setSignOutConfirmOpen(open) {
    if (!signOutConfirm) return;
    const next = Boolean(open);
    signOutConfirm.hidden = !next;
    requestAnimationFrame(() => {
      signOutConfirm.classList.toggle('is-visible', next);
    });
    document.body.classList.toggle('signout-confirm-open', next);
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      setSignOutConfirmOpen(true);
    });
  }

  signOutConfirmCancel?.addEventListener('click', () => {
    setSignOutConfirmOpen(false);
  });

  signOutConfirm?.addEventListener('click', (event) => {
    if (event.target === signOutConfirm) setSignOutConfirmOpen(false);
  });

  signOutConfirmOk?.addEventListener('click', async () => {
    if (signOutConfirmOk) {
      signOutConfirmOk.disabled = true;
      signOutConfirmOk.textContent = 'Signing out…';
    }
    if (signOutBtn) {
      signOutBtn.disabled = true;
      signOutBtn.textContent = 'Signing out…';
    }
    try {
      const supabase = await getSupabase();
      if (supabase) await supabase.auth.signOut();
      setSignOutConfirmOpen(false);
      goToPage('home');
    } catch (_) {
      setSignOutConfirmOpen(false);
      if (signOutConfirmOk) {
        signOutConfirmOk.disabled = false;
        signOutConfirmOk.textContent = 'Sign out';
      }
      if (signOutBtn) {
        signOutBtn.disabled = false;
        signOutBtn.textContent = 'Sign out';
      }
      showToast('Could not sign out. Try again.', { type: 'error' });
    }
  });

  const communityFilters = Array.from(shell.querySelectorAll('[data-community-filter]'));
  const communityFeedSection = shell.querySelector('[data-community-section="feed"]');
  const communityJobsSection = shell.querySelector('[data-community-section="jobs"]');
  const communityPosts = Array.from(shell.querySelectorAll('.community-post'));

  function setCommunityFilter(filterId) {
    const next = filterId || 'all';
    communityFilters.forEach((btn) => {
      const active = btn.getAttribute('data-community-filter') === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const showJobs = next === 'jobs';
    if (communityFeedSection) communityFeedSection.hidden = showJobs;
    if (communityJobsSection) communityJobsSection.hidden = !showJobs;

    communityPosts.forEach((post) => {
      if (showJobs) {
        post.hidden = true;
        return;
      }
      const type = post.getAttribute('data-community-type');
      post.hidden = next !== 'all' && type !== next;
    });
  }

  communityFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      setCommunityFilter(btn.getAttribute('data-community-filter'));
    });
  });

  shell.querySelectorAll('[data-job-logo]').forEach((wrap) => {
    const img = wrap.querySelector('.community-job-logo-img');
    if (!img) return;
    const showFallback = () => {
      const initials = wrap.getAttribute('data-job-logo') || '?';
      wrap.innerHTML = `<span class="community-job-logo-fallback" aria-hidden="true">${initials}</span>`;
    };
    if (img.complete && img.naturalWidth === 0) {
      showFallback();
      return;
    }
    img.addEventListener('error', showFallback, { once: true });
  });

  shell.querySelectorAll('[data-job-apply]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-applied')) return;
      btn.classList.add('is-applied');
      btn.textContent = 'Applied';
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  function syncCommunitySaveButtons() {
    shell.querySelectorAll('[data-community-save]').forEach((btn) => {
      const post = COMMUNITY_POSTS.find((item) => item.id === btn.getAttribute('data-community-save'));
      if (!post) return;
      const saved = isCommunitySaved(post);
      btn.classList.toggle('is-saved', saved);
      btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save update');
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none');
      btn.closest('.community-post')?.classList.toggle('is-saved', saved);
    });

    shell.querySelectorAll('[data-job-save]').forEach((btn) => {
      const job = COMMUNITY_JOBS.find((item) => item.id === btn.getAttribute('data-job-save'));
      if (!job) return;
      const saved = isCommunitySaved({ ...job, kind: 'job' });
      btn.classList.toggle('is-saved', saved);
      btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save job');
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none');
      btn.closest('.community-job')?.classList.toggle('is-saved', saved);
    });
  }

  shell.querySelectorAll('[data-community-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const post = COMMUNITY_POSTS.find((item) => item.id === btn.getAttribute('data-community-save'));
      if (!post) return;
      const saved = toggleSavedCommunity({ ...post, kind: 'post' });
      syncCommunitySaveButtons();
      refreshSavedLists();
      setStatus(saved ? 'Saved to Community' : 'Removed from saved', { type: 'success' });
    });
  });

  shell.querySelectorAll('[data-job-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const job = COMMUNITY_JOBS.find((item) => item.id === btn.getAttribute('data-job-save'));
      if (!job) return;
      const saved = toggleSavedCommunity({ ...job, kind: 'job', image: job.logo });
      syncCommunitySaveButtons();
      refreshSavedLists();
      setStatus(saved ? 'Job saved' : 'Job removed from saved', { type: 'success' });
    });
  });

  const savedFilters = Array.from(shell.querySelectorAll('[data-saved-filter]'));
  const savedPlacesSection = shell.querySelector('[data-saved-section="places"]');
  const savedRoutesSection = shell.querySelector('[data-saved-section="routes"]');
  const savedCommunitySection = shell.querySelector('[data-saved-section="community"]');
  let savedActiveFilter = 'all';

  function setSavedFilter(filterId) {
    savedActiveFilter = ['all', 'places', 'routes', 'community'].includes(filterId) ? filterId : 'all';
    savedFilters.forEach((btn) => {
      const active = btn.getAttribute('data-saved-filter') === savedActiveFilter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const showAll = savedActiveFilter === 'all';
    if (savedPlacesSection) savedPlacesSection.hidden = !(showAll || savedActiveFilter === 'places');
    if (savedRoutesSection) savedRoutesSection.hidden = !(showAll || savedActiveFilter === 'routes');
    if (savedCommunitySection) savedCommunitySection.hidden = !(showAll || savedActiveFilter === 'community');
    refreshSavedLists();
  }

  function refreshSavedLists() {
    const places = listSavedPlaces();
    const routes = listSavedRoutes();
    const community = listSavedCommunity();
    const showAll = savedActiveFilter === 'all';
    const nothingSaved = !places.length && !routes.length && !community.length;

    if (savedPlacesSection) {
      if (places.length) {
        savedPlacesSection.innerHTML = `
          ${showAll ? '<h2 class="saved-section-title">Places</h2>' : ''}
          ${places.map(renderSavedPlaceItem).join('')}
        `;
      } else if (savedActiveFilter === 'places') {
        savedPlacesSection.innerHTML = `<div class="saved-empty">
            <strong>No saved places yet</strong>
            <p>On Map, tap the star on a tourist spot to save it here.</p>
          </div>`;
      } else if (showAll && nothingSaved) {
        savedPlacesSection.innerHTML = `<div class="saved-empty">
            <strong>Nothing saved yet</strong>
            <p>Star places, routes, posts, or jobs and they’ll show up here.</p>
          </div>`;
      } else {
        savedPlacesSection.innerHTML = '';
      }
    }

    if (savedRoutesSection) {
      if (routes.length) {
        savedRoutesSection.innerHTML = `
          ${showAll ? '<h2 class="saved-section-title">Routes</h2>' : ''}
          ${routes.map(renderSavedRouteItem).join('')}
        `;
      } else if (savedActiveFilter === 'routes') {
        savedRoutesSection.innerHTML = `<div class="saved-empty">
            <strong>No saved routes yet</strong>
            <p>On Routes, get directions, then tap the star to save.</p>
          </div>`;
      } else {
        savedRoutesSection.innerHTML = '';
      }
    }

    if (savedCommunitySection) {
      if (community.length) {
        savedCommunitySection.innerHTML = `
          ${showAll ? '<h2 class="saved-section-title">Community</h2>' : ''}
          ${community.map(renderSavedCommunityItem).join('')}
        `;
      } else if (savedActiveFilter === 'community') {
        savedCommunitySection.innerHTML = `<div class="saved-empty">
            <strong>No saved community items yet</strong>
            <p>On Community, tap the bookmark on a post or job to save it here.</p>
          </div>`;
      } else {
        savedCommunitySection.innerHTML = '';
      }
    }

    syncTouristSaveButtons();
    syncRouteSaveButton();
    syncCommunitySaveButtons();
  }

  savedFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSavedFilter(btn.getAttribute('data-saved-filter'));
    });
  });

  const savedFeed = shell.querySelector('#saved-feed');
  if (savedFeed) {
    savedFeed.addEventListener('click', async (event) => {
      const removePlace = event.target.closest('[data-saved-remove-place]');
      if (removePlace) {
        removeSavedPlace(removePlace.dataset.savedRemovePlace);
        refreshSavedLists();
        setStatus('Place removed', { type: 'success' });
        return;
      }

      const removeRoute = event.target.closest('[data-saved-remove-route]');
      if (removeRoute) {
        removeSavedRoute(removeRoute.dataset.savedRemoveRoute);
        refreshSavedLists();
        setStatus('Route removed', { type: 'success' });
        return;
      }

      const removeCommunity = event.target.closest('[data-saved-remove-community]');
      if (removeCommunity) {
        removeSavedCommunity(removeCommunity.dataset.savedRemoveCommunity);
        refreshSavedLists();
        setStatus('Removed from saved', { type: 'success' });
        return;
      }

      const openPlace = event.target.closest('[data-saved-open-place]');
      if (openPlace) {
        const place = listSavedPlaces().find((item) => item.id === openPlace.dataset.savedOpenPlace);
        if (!place) return;
        setTab('map');
        if (!mapApi) await initMap();
        if (!mapApi) return;
        mapApi.setStatusMarkers([place]);
        mapApi.focusPlace(place, { zoom: 15 });
        setStatus(place.name);
        return;
      }

      const openRoute = event.target.closest('[data-saved-open-route]');
      if (openRoute) {
        const route = listSavedRoutes().find((item) => item.id === openRoute.dataset.savedOpenRoute);
        if (!route || !routesForm) return;
        setTab('routes');
        routesForm.from.value = route.from?.label || 'Your location';
        routesForm.from.dataset.lat = String(route.from?.lat ?? '');
        routesForm.from.dataset.lon = String(route.from?.lon ?? '');
        routesForm.from.dataset.label = route.from?.label || '';
        routesForm.to.value = route.to?.label || '';
        routesForm.to.dataset.lat = String(route.to?.lat ?? '');
        routesForm.to.dataset.lon = String(route.to?.lon ?? '');
        routesForm.to.dataset.label = route.to?.label || '';
        syncRouteFieldChrome();
        await runDirections();
        if (route.modeId) await applySelectedMode(route.modeId);
        return;
      }

      const openCommunity = event.target.closest('[data-saved-open-community]');
      if (openCommunity) {
        const item = listSavedCommunity().find((entry) => entry.id === openCommunity.dataset.savedOpenCommunity);
        if (!item) return;
        setTab('community');
        const kind = openCommunity.dataset.savedCommunityKind || item.kind || 'post';
        setCommunityFilter(kind === 'job' ? 'jobs' : (item.type || 'all'));
        requestAnimationFrame(() => {
          const target = shell.querySelector(
            kind === 'job'
              ? `[data-community-job="${item.id}"]`
              : `[data-community-id="${item.id}"]`,
          );
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    });
  }

  const touristStack = shell.querySelector('#tourist-stack');
  const mapTouristBtn = shell.querySelector('#map-tourist-btn');
  const touristCloseBtn = shell.querySelector('#tourist-rail-close');

  function setTouristRailOpen(open) {
    const next = Boolean(open);
    if (touristStack) {
      touristStack.classList.toggle('is-open', next);
      touristStack.hidden = !next;
    }
    if (mapTouristBtn) {
      mapTouristBtn.classList.toggle('is-active', next);
      mapTouristBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      mapTouristBtn.setAttribute('aria-label', next ? 'Hide tourist spots' : 'Show tourist spots');
    }
    if (next) {
      setLayersOpen(false);
      setEmergencyOpen(false);
    }
  }

  mapTouristBtn?.addEventListener('click', () => {
    const open = !(touristStack && !touristStack.hidden && touristStack.classList.contains('is-open'));
    setTouristRailOpen(open);
  });

  touristCloseBtn?.addEventListener('click', () => {
    setTouristRailOpen(false);
  });


  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('data-tab') === 'saved') refreshSavedLists();
    });
  });

  refreshSavedLists();
  setSavedFilter('all');

  const initialTab = readStoredTab();
  setTab(initialTab);
  initMap();
  void syncGoogleAccountProfile();

  // Show tourist spots rail by default when landing on Map.
  if (initialTab === 'map') {
    setTouristRailOpen(true);
  }

  // Keep tab + More sub-view in sync if URL changes.
  window.addEventListener('popstate', () => {
    const next = readStoredTab();
    if (shell.dataset.activeTab !== next) {
      setTab(next, { persist: false });
      return;
    }
    if (next === 'more') {
      const moreView = readStoredMoreView();
      setMoreView(moreView, { persist: false });
      if (moreView === 'profile') void loadProfileEditor({ preserveDraft: true });
    }
  });
}
