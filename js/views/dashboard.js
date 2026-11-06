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
  isPlaceSaved,
  isRouteSaved,
  toggleSavedPlace,
  toggleSavedRoute,
  removeSavedPlace,
  removeSavedRoute,
} from '../lib/saved.js';

const TABS = [
  { id: 'map', label: 'Map', icon: iconMap },
  { id: 'routes', label: 'Routes', icon: iconRoutes },
  { id: 'community', label: 'Community', icon: iconCommunity },
  { id: 'saved', label: 'Saved', icon: iconSaved },
  { id: 'more', label: 'More', icon: iconMore },
];

const MAP_CATEGORIES = [
  { id: 'home', label: 'Home' },
  { id: 'malls', label: 'Malls' },
  { id: 'schools', label: 'Schools' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'police', label: 'Police' },
  { id: 'parks', label: 'Parks' },
  { id: 'food', label: 'Food' },
  { id: 'churches', label: 'Churches' },
  { id: 'terminals', label: 'Terminals' },
];

const TOURIST_SPOTS = [
  {
    id: 'lake-danao',
    name: 'Lake Danao Natural Park',
    category: 'Nature park',
    rating: 4.6,
    reviews: 367,
    image: 'public/assets/images/ormoc/01-lake-danao.jpg',
    lat: 11.0653,
    lon: 124.70381,
    blurb: 'Guitar-shaped highland lake',
  },
  {
    id: 'lake-danao-park',
    name: 'Lake Danao Park Views',
    category: 'Scenic lookout',
    rating: 4.5,
    reviews: 128,
    image: 'public/assets/images/ormoc/02-lake-danao-park.jpg',
    lat: 11.06177,
    lon: 124.70286,
    blurb: 'Cool mountain scenery',
  },
  {
    id: 'ormoc-bay',
    name: 'Ormoc Bay Walk',
    category: 'Waterfront',
    rating: 4.4,
    reviews: 214,
    image: 'public/assets/images/ormoc/05-ormoc-bay.jpg',
    lat: 11.0018,
    lon: 124.6079,
    blurb: 'Sunset & bay views',
  },
  {
    id: 'rizal-monument',
    name: 'Rizal Monument',
    category: 'Landmark',
    rating: 4.3,
    reviews: 96,
    image: 'public/assets/images/ormoc/12-rizal-monument.jpg',
    lat: 11.0064,
    lon: 124.6075,
    blurb: 'City plaza landmark',
  },
  {
    id: 'scenic-route',
    name: 'Scenic Highland Route',
    category: 'Drive / trek',
    rating: 4.7,
    reviews: 88,
    image: 'public/assets/images/ormoc/03-scenic-route.jpg',
    lat: 11.04,
    lon: 124.66,
    blurb: 'Pineapple farms & peaks',
  },
  {
    id: 'calm-reflection',
    name: 'Calm Water Reflection',
    category: 'Photo spot',
    rating: 4.5,
    reviews: 64,
    image: 'public/assets/images/ormoc/04-calm-reflection.jpg',
    lat: 11.063,
    lon: 124.701,
    blurb: 'Quiet lakeside photos',
  },
  {
    id: 'heavens-peak',
    name: "Heaven's Peak",
    category: 'Adventure',
    rating: 4.5,
    reviews: 86,
    image: 'public/assets/images/ormoc/06-ormoc-philippines.jpg',
    lat: 11.09,
    lon: 124.69,
    blurb: 'Hilltop overlook',
  },
  {
    id: 'real-street',
    name: 'Real Street Corridor',
    category: 'City vibe',
    rating: 4.2,
    reviews: 152,
    image: 'public/assets/images/ormoc/11-real-st.jpg',
    lat: 11.0085,
    lon: 124.6072,
    blurb: 'Shops & city energy',
  },
];

function displayName(user) {
  const meta = user?.user_metadata || {};
  return (
    meta.full_name
    || meta.name
    || meta.preferred_username
    || (user?.email ? user.email.split('@')[0] : '')
    || 'there'
  );
}

function profilePhotoUrl(user) {
  const meta = user?.user_metadata || {};
  const fromMeta = meta.avatar_url || meta.picture || meta.avatar || '';
  if (fromMeta) return String(fromMeta);

  const identities = Array.isArray(user?.identities) ? user.identities : [];
  for (const identity of identities) {
    const data = identity?.identity_data || {};
    const url = data.avatar_url || data.picture || data.avatar || '';
    if (url) return String(url);
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
      <div id="ormoc-map" class="map-canvas" role="application" aria-label="Google Map of Ormoc"></div>

      <div class="map-overlay">
        <form class="map-search" id="map-search-form" role="search">
          <label class="map-search-field">
            <span class="visually-hidden">Search places</span>
            <span class="map-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
            <input
              type="search"
              name="q"
              id="map-search-input"
              placeholder="Search place, landmark, street, or where to go"
              autocomplete="off"
              enterkeyhint="search"
            >
          </label>
        </form>

        <div class="map-chips" role="toolbar" aria-label="Place categories">
          ${chips}
        </div>

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
                  class="map-layer-card${layer.id === 'google' ? ' is-active' : ''}"
                  data-map-type="${layer.id}"
                  role="option"
                  aria-selected="${layer.id === 'google' ? 'true' : 'false'}"
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
      </div>

      <div class="map-status" id="map-status" aria-live="polite">
        Loading Google Maps…
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
          <div class="routes-idle" id="routes-idle">
            <p class="routes-idle-title">Where to?</p>
            <p class="routes-idle-copy">Pick a destination to compare travel times.</p>
          </div>
        </div>

        <div class="routes-sheet" id="routes-sheet">
          <div class="routes-suggest" id="routes-suggest" hidden role="listbox" aria-label="Place suggestions"></div>
          <div class="routes-sheet-handle" aria-hidden="true"></div>

          <div class="routes-eta" id="routes-result" hidden>
            <strong id="routes-result-time"></strong>
            <div class="routes-eta-copy">
              <span id="routes-summary"></span>
              <span id="routes-result-dest"></span>
            </div>
            <button type="button" class="routes-save-btn" id="routes-save-btn" aria-label="Save route" title="Save route">
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
                  <button type="button" class="routes-field-action" id="route-use-location" title="Use my location" aria-label="Use my location">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                  </button>
                </div>
                <div class="routes-field-wrap">
                  <label class="routes-field">
                    <span class="visually-hidden">Destination</span>
                    <input type="search" name="to" id="route-to" placeholder="Choose destination" enterkeyhint="search" required>
                  </label>
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
    </section>
  `;
}

function renderSuggestItem(place, index) {
  const name = escapeHtml(place.name || 'Place');
  const sub = escapeHtml(place.display_name || '');
  return `
    <button type="button" class="routes-suggest-item" role="option" data-suggest-index="${index}">
      <span class="routes-suggest-pin" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
      </span>
      <span class="routes-suggest-copy">
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
  return `
    <button type="button" class="route-mode${active}" data-mode="${escapeHtml(mode.id)}" role="listitem" aria-label="${escapeHtml(mode.label)} ${escapeHtml(mins)}">
      <span class="route-mode-icon">${modeIconSvg(mode.icon)}</span>
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
  { id: 'place', label: 'Places' },
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
    image: 'public/assets/images/ormoc/01-lake-danao.jpg',
  },
  {
    id: 'p4',
    type: 'place',
    title: 'Ormoc Port update',
    body: 'Ferry tickets sell out on long weekends. Arrive early or book the day before if you can.',
    author: 'Port Desk',
    when: 'Yesterday',
    place: 'Ormoc Port',
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
];

const COMMUNITY_JOBS = [
  {
    id: 'j1',
    title: 'Café barista',
    company: 'Local coffee shop · Ormoc',
    meta: 'Part-time · Walk-in',
    image: 'public/assets/images/ormoc/09-dawn-blue.jpg',
  },
  {
    id: 'j2',
    title: 'Sales associate',
    company: 'Retail · City proper',
    meta: 'Full-time · Entry level',
    image: 'public/assets/images/ormoc/11-real-st.jpg',
  },
  {
    id: 'j3',
    title: 'Tour guide helper',
    company: 'Lake Danao area',
    meta: 'Weekend · Seasonal',
    image: 'public/assets/images/ormoc/02-lake-danao-park.jpg',
  },
];

function communityTypeLabel(type) {
  if (type === 'alert') return 'Alert';
  if (type === 'event') return 'Event';
  if (type === 'tip') return 'Tip';
  if (type === 'place') return 'Place';
  return 'Update';
}

function renderCommunityPost(post) {
  const media = post.image
    ? `<img class="community-post-img" src="${escapeHtml(post.image)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `
    <article class="community-post${post.image ? ' has-media' : ''}" data-community-type="${escapeHtml(post.type)}">
      ${media}
      <div class="community-post-content">
        <div class="community-post-top">
          <span class="community-tag community-tag--${escapeHtml(post.type)}">${escapeHtml(communityTypeLabel(post.type))}</span>
          <span class="community-when">${escapeHtml(post.when)}</span>
        </div>
        <h3 class="community-post-title">${escapeHtml(post.title)}</h3>
        <p class="community-post-body">${escapeHtml(post.body)}</p>
        <div class="community-post-meta">
          <span>${escapeHtml(post.author)}</span>
          <span aria-hidden="true">·</span>
          <span>${escapeHtml(post.place)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCommunityJob(job) {
  const media = job.image
    ? `<img class="community-job-img" src="${escapeHtml(job.image)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `
    <article class="community-job is-soon${job.image ? ' has-media' : ''}" aria-disabled="true">
      ${media}
      <div class="community-job-content">
        <div class="community-job-top">
          <h3 class="community-job-title">${escapeHtml(job.title)}</h3>
          <span class="community-soon-pill">Coming soon</span>
        </div>
        <p class="community-job-company">${escapeHtml(job.company)}</p>
        <p class="community-job-meta">${escapeHtml(job.meta)}</p>
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
            <div>
              <h1 class="community-title">Community</h1>
              <p class="community-copy">Local updates, tips, place notes, and jobs for Ormoc.</p>
            </div>
            <button type="button" class="community-compose" id="community-compose" disabled title="Coming soon">
              Post
              <span class="community-soon-pill">Soon</span>
            </button>
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
              <strong>Jobs board</strong>
              <span>Listings are preview only — hiring tools are coming soon.</span>
            </div>
            ${COMMUNITY_JOBS.map(renderCommunityJob).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderMorePanel(user) {
  const rawName = displayName(user);
  const name = escapeHtml(rawName);
  const email = escapeHtml(user?.email || '');
  const appName = escapeHtml(getAppName());
  const version = escapeHtml(getEnv().APP_VERSION || '0.1.0');
  const photo = profilePhotoUrl(user);
  const avatar = photo
    ? `<img class="more-avatar-img" src="${escapeHtml(photo)}" alt="" width="64" height="64" referrerpolicy="no-referrer" decoding="async">`
    : `<span class="more-avatar-initials">${escapeHtml(initials(rawName))}</span>`;
  return `
    <section class="dash-panel dash-panel--more" data-panel="more" aria-label="More" hidden>
      <div class="more-screen">
        <header class="more-hero">
          <p class="more-kicker">${appName}</p>
          <div class="more-profile">
            <div class="more-avatar${photo ? ' more-avatar--photo' : ''}" aria-hidden="true">${avatar}</div>
            <div class="more-profile-copy">
              <h1 class="more-title">${name}</h1>
              <p class="more-email">${email || `Signed in to ${appName}`}</p>
            </div>
          </div>
        </header>

        <div class="more-body">
          <section class="more-group" aria-label="About">
            <h2 class="more-group-title">About</h2>
            <div class="more-list">
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
                  <strong>Terms &amp; Condition</strong>
                  <span>Community project guidelines</span>
                </span>
                <span class="more-row-chevron" aria-hidden="true">›</span>
              </button>
            </div>
          </section>

          <section class="more-group" aria-label="App">
            <h2 class="more-group-title">App</h2>
            <div class="more-list">
              <div class="more-row more-row--static">
                <span class="more-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 17h4"/></svg>
                </span>
                <span class="more-row-copy">
                  <strong>Version</strong>
                  <span>${appName} mobile guide</span>
                </span>
                <span class="more-row-meta">${version}</span>
              </div>
            </div>
          </section>

          <button type="button" class="more-signout" id="dashboard-signout">Sign out</button>
          <p class="more-footnote">Non-profit · Ad-free · Made for Ormoc</p>
        </div>
      </div>
    </section>
  `;
}

function renderSavedPlaceItem(place) {
  const rating = place.rating != null
    ? `<span class="saved-item-rating">${Number(place.rating).toFixed(1)}★</span>`
    : '';
  const thumb = place.image
    ? `<img class="saved-item-thumb" src="${escapeHtml(place.image)}" alt="" loading="lazy">`
    : `<span class="saved-item-thumb saved-item-thumb--empty" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg></span>`;
  return `
    <article class="saved-item" data-saved-place="${escapeHtml(place.id)}">
      ${thumb}
      <button type="button" class="saved-item-main" data-saved-open-place="${escapeHtml(place.id)}">
        <strong>${escapeHtml(place.name)}</strong>
        <span>${escapeHtml(place.display_name || place.category || 'Saved place')}</span>
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
        <span>From ${escapeHtml(route.from?.label || 'Start')}</span>
        <span class="saved-item-rating">${escapeHtml(route.modeLabel || 'Route')} · ${escapeHtml(mins)} · ${escapeHtml(String(km))} km</span>
      </button>
      <button type="button" class="saved-item-remove" data-saved-remove-route="${escapeHtml(route.id)}" aria-label="Remove saved route">
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
              <p class="saved-copy">Your favorite places and routes in Ormoc.</p>
            </div>
          </header>
          <div class="saved-filters" role="toolbar" aria-label="Saved filters">
            <button type="button" class="saved-filter is-active" data-saved-filter="places" aria-pressed="true">Places</button>
            <button type="button" class="saved-filter" data-saved-filter="routes" aria-pressed="false">Routes</button>
          </div>
        </div>
        <div class="saved-feed" id="saved-feed">
          <div class="saved-section" data-saved-section="places"></div>
          <div class="saved-section" data-saved-section="routes" hidden></div>
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

function renderTouristRail() {
  const cards = TOURIST_SPOTS.map((spot) => {
    const saved = isPlaceSaved(spot);
    return `
    <article class="tourist-card${saved ? ' is-saved' : ''}" data-tourist-id="${escapeHtml(spot.id)}">
      <button type="button" class="tourist-card-main" data-tourist-open="${escapeHtml(spot.id)}" aria-label="${escapeHtml(spot.name)}, ${spot.rating} stars">
        <img class="tourist-card-img" src="${escapeHtml(spot.image)}" alt="" loading="lazy" decoding="async">
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
    <div class="tourist-stack">
      <div class="tourist-welcome" aria-hidden="true">
        <img
          class="tourist-welcome-mascot"
          src="public/assets/icons/welcome-chibi.png?v=3"
          alt=""
          width="140"
          height="140"
          decoding="async"
        >
      </div>
      <div class="tourist-rail" id="tourist-rail" aria-label="Tourist spots">
        <div class="tourist-rail-head">
          <p class="tourist-rail-title">Tourist spots</p>
          <p class="tourist-rail-sub">Top-rated places in Ormoc</p>
        </div>
        <div class="tourist-rail-scroller" role="list">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

export function renderDashboard(user) {
  const nav = TABS.map((tab, index) => `
    <button
      type="button"
      class="bottom-nav-item${index === 0 ? ' is-active' : ''}"
      data-tab="${tab.id}"
      aria-current="${index === 0 ? 'page' : 'false'}"
    >
      <span class="bottom-nav-icon">${tab.icon()}</span>
      <span class="bottom-nav-label">${tab.label}</span>
    </button>
  `).join('');

  return `
    <section class="dash-shell" aria-label="OrmocGo app" data-active-tab="map">
      <div class="dash-body">
        ${renderMapPanel()}
        ${renderRoutesPanel()}
        ${renderCommunityPanel()}
        ${renderSavedPanel()}
        ${renderMorePanel(user)}
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
  const status = shell.querySelector('#map-status');
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
  let activeMapType = 'google';
  let searchTimer = null;

  function setLayersOpen(open) {
    if (!layersSheet || !layersBtn) return;
    layersSheet.hidden = !open;
    layersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    layersWrap?.classList.toggle('is-open', open);
  }

  let statusTimer = null;
  function setStatus(text, { sticky = false } = {}) {
    if (!status) return;
    status.textContent = text || '';
    const show = Boolean(text);
    status.classList.toggle('is-visible', show);
    clearTimeout(statusTimer);
    if (show && !sticky) {
      statusTimer = setTimeout(() => {
        status.classList.remove('is-visible');
      }, 2600);
    }
  }

  function setTab(tabId) {
    tabs.forEach((tab) => {
      const active = tab.getAttribute('data-tab') === tabId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-current', active ? 'page' : 'false');
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute('data-panel') === tabId;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    shell.dataset.activeTab = tabId;

    if (tabId === 'map' && mapApi) {
      mapApi.invalidate();
    }
    if (tabId === 'routes') {
      ensureRoutesMap().then((api) => {
        api?.invalidate();
        if (routePlan && isLiveFollowMode(routePlan.selectedId)) {
          startRouteTracking(routePlan.selectedId);
        }
      });
    } else {
      stopRouteTracking();
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
      setStatus(err.message || 'Search failed');
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
      mapApi.setStatusMarkers(places);
      setStatus(`${places.length} ${selected.label.toLowerCase()} · tap a pin`);
    } catch (err) {
      setStatus(err.message || 'Category search failed');
    }
  }

  function setMapType(type) {
    const known = MAP_LAYERS.some((layer) => layer.id === type);
    activeMapType = known ? type : 'google';
    mapTypeBtns.forEach((btn) => {
      const active = btn.getAttribute('data-map-type') === activeMapType;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (mapApi) mapApi.setMapType(activeMapType);
    setLayersOpen(false);
  }

  async function initMap() {
    if (!mapEl) return;
    try {
      mapApi = await createOrmocMap(mapEl, { mapType: activeMapType });
      setStatus('');
      await runCategory('home');
    } catch (err) {
      setStatus(err.message || 'Could not load map', { sticky: true });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setTab(tab.getAttribute('data-tab')));
  });

  if (layersBtn) {
    layersBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setLayersOpen(Boolean(layersSheet?.hidden));
    });
  }

  mapTypeBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      setMapType(btn.getAttribute('data-map-type'));
    });
  });

  document.addEventListener('click', (event) => {
    if (!layersWrap?.classList.contains('is-open')) return;
    if (layersWrap.contains(event.target)) return;
    setLayersOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setLayersOpen(false);
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      runCategory(chip.getAttribute('data-map-category'));
    });
  });

  const touristRail = shell.querySelector('#tourist-rail');

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
        setStatus(saved ? `Saved ${spot.name}` : `Removed ${spot.name}`);
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

  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch(searchInput?.value || '');
      searchInput?.blur();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = searchInput.value.trim();
        if (q.length >= 3) runSearch(q);
        if (!q) runCategory(activeCategory);
      }, 450);
    });
  }

  const routesModes = shell.querySelector('#routes-modes');
  const routesModesGrid = shell.querySelector('#routes-modes-grid');
  const routesIdle = shell.querySelector('#routes-idle');
  const routesResult = shell.querySelector('#routes-result');
  const routesResultTime = shell.querySelector('#routes-result-time');
  const routesResultDest = shell.querySelector('#routes-result-dest');
  const routesMapEl = shell.querySelector('#routes-map');
  const routesSuggest = shell.querySelector('#routes-suggest');
  const routeLocateBtn = shell.querySelector('#route-use-location');
  const routeSwapBtn = shell.querySelector('#route-swap');
  const routesSaveBtn = shell.querySelector('#routes-save-btn');
  let routePlan = null;

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
  let routeFollowFitted = false;

  function isLiveFollowMode(modeId) {
    return modeId === 'walk' || modeId === 'run';
  }

  function stopRouteTracking() {
    if (routeWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(routeWatchId);
    }
    routeWatchId = null;
    routeFollowFitted = false;
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
          follow: true,
          moveStart: false,
        });

        // Keep walker centered after the first route fit.
        if (!routeFollowFitted) {
          routeFollowFitted = true;
          api.map.setZoom(Math.max(api.map.getZoom() || 16, 17));
        }
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

  function setRoutesEmpty(empty) {
    if (routesIdle) routesIdle.hidden = !empty;
    if (routesModes) routesModes.hidden = empty;
    if (routesResult) routesResult.hidden = empty;
    shell.querySelector('#routes-sheet')?.classList.toggle('has-route', !empty);
    if (empty) stopRouteTracking();
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

      if (live) {
        // Seed current position immediately, then keep watching as the user walks.
        try {
          const here = await getCurrentPosition();
          api.setUserLocation(
            { lat: here.lat, lng: here.lon },
            { follow: true, accuracy: 25 },
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
      setStatus(saved ? 'Route saved' : 'Route removed from saved');
    });
  }

  async function runDirections() {
    if (!routesForm) return;
    if (routesError) routesError.hidden = true;
    hideSuggestions();
    setRoutesEmpty(true);
    if (routesIdle) {
      routesIdle.hidden = true;
      routesIdle.querySelector('.routes-idle-title').textContent = 'Finding routes…';
      routesIdle.querySelector('.routes-idle-copy').textContent = 'Comparing walk, run, bike, motor, and car.';
      routesIdle.hidden = false;
    }
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

      if (routesIdle) {
        routesIdle.querySelector('.routes-idle-title').textContent = 'Where to?';
        routesIdle.querySelector('.routes-idle-copy').textContent = 'Pick a destination to compare travel times.';
      }
      await applySelectedMode(routePlan.selectedId);
      sheet?.classList.add('has-route');
    } catch (err) {
      setRoutesEmpty(true);
      sheet?.classList.remove('has-route');
      if (routesIdle) {
        routesIdle.querySelector('.routes-idle-title').textContent = 'Where to?';
        routesIdle.querySelector('.routes-idle-copy').textContent = 'Pick a destination to compare travel times.';
      }
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
      hideSuggestions();
      if (suggestTarget === routesForm?.to && (routesForm.from.value.trim() || routesForm.from.dataset.lat)) {
        await runDirections();
      } else if (suggestTarget === routesForm?.from) {
        routesForm?.to?.focus();
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
        const api = await ensureRoutesMap();
        api?.setUserLocation({ lat: here.lat, lng: here.lon });
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

  ensureRoutesMap().catch(() => {});

  shell.querySelectorAll('[data-more-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openAuthSheet(btn.getAttribute('data-more-sheet'));
    });
  });

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      signOutBtn.disabled = true;
      signOutBtn.textContent = 'Signing out…';
      try {
        const supabase = await getSupabase();
        if (supabase) await supabase.auth.signOut();
        goToPage('home');
      } catch (_) {
        signOutBtn.disabled = false;
        signOutBtn.textContent = 'Sign out';
      }
    });
  }

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

    if (!showJobs) {
      communityPosts.forEach((post) => {
        const type = post.getAttribute('data-community-type');
        post.hidden = next !== 'all' && type !== next;
      });
    }
  }

  communityFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      setCommunityFilter(btn.getAttribute('data-community-filter'));
    });
  });

  const savedFilters = Array.from(shell.querySelectorAll('[data-saved-filter]'));
  const savedPlacesSection = shell.querySelector('[data-saved-section="places"]');
  const savedRoutesSection = shell.querySelector('[data-saved-section="routes"]');

  function setSavedFilter(filterId) {
    const next = filterId === 'routes' ? 'routes' : 'places';
    savedFilters.forEach((btn) => {
      const active = btn.getAttribute('data-saved-filter') === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (savedPlacesSection) savedPlacesSection.hidden = next !== 'places';
    if (savedRoutesSection) savedRoutesSection.hidden = next !== 'routes';
  }

  function refreshSavedLists() {
    const places = listSavedPlaces();
    const routes = listSavedRoutes();

    if (savedPlacesSection) {
      savedPlacesSection.innerHTML = places.length
        ? places.map(renderSavedPlaceItem).join('')
        : `<div class="saved-empty">
            <strong>No saved places yet</strong>
            <p>Tap the star on a tourist spot card to save it here.</p>
          </div>`;
    }

    if (savedRoutesSection) {
      savedRoutesSection.innerHTML = routes.length
        ? routes.map(renderSavedRouteItem).join('')
        : `<div class="saved-empty">
            <strong>No saved routes yet</strong>
            <p>Get directions, then tap the star on the route card.</p>
          </div>`;
    }

    syncTouristSaveButtons();
    syncRouteSaveButton();
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
        setStatus('Place removed');
        return;
      }

      const removeRoute = event.target.closest('[data-saved-remove-route]');
      if (removeRoute) {
        removeSavedRoute(removeRoute.dataset.savedRemoveRoute);
        refreshSavedLists();
        setStatus('Route removed');
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
        await runDirections();
        if (route.modeId) await applySelectedMode(route.modeId);
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('data-tab') === 'saved') refreshSavedLists();
    });
  });

  refreshSavedLists();
  setSavedFilter('places');
  setTab('map');
  initMap();
}
