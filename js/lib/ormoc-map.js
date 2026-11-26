/**
 * MapLibre + OSM/Carto/Esri tiles + Nominatim search + OSRM routing for Ormoc.
 */

import { ORMOC_BARANGAYS } from '../data/ormoc-barangays.js';

/** Downtown Ormoc (Real St / city proper) — inland of Ormoc Bay waterfront. */
export const ORMOC_CENTER = { lat: 11.0105, lng: 124.6085 };
export const ORMOC_ZOOM = 14;

/** Rough bounding box around Ormoc City (includes outer stations) */
export const ORMOC_BOUNDS = {
  south: 10.94,
  north: 11.12,
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
    // Public elementary
    'Alta Vista Elementary School Ormoc',
    'Bagong Elementary School Ormoc',
    'Biliboy Elementary School Ormoc',
    'Camp Downes Elementary School Ormoc',
    'Can-adieng Elementary School Ormoc',
    'Dolores Elementary School Ormoc',
    'Ipil Central School Ormoc',
    'Mahayahay Elementary School Ormoc',
    'Patag Elementary School Ormoc',
    'Ormoc City Central School',
    'San Jose Elementary School Ormoc',
    'Tongonan Elementary School Ormoc',
    'Valencia Central School Ormoc',
    // Public high schools
    'Dolores National High School Ormoc',
    'Ipil National High School Ormoc',
    'Linao National High School Ormoc',
    'Margen National High School Ormoc',
    'New Ormoc City National High School',
    'Rustico Capahi Sr Memorial National High School Ormoc',
    'Genaro B Lurenana National High School Ormoc',
    'Salvacion National High School Ormoc',
    'Liloan National High School Ormoc',
    'Pedro G Banez National High School Ormoc',
    'Cabintan National High School Ormoc',
    'Matica-a National High School Ormoc',
    'Ormoc City Night High School',
    'Julian C Gantuangco National High School Ormoc',
    'Ormoc City Senior High School',
    // Integrated / specialized
    'Mas-in Integrated School Ormoc',
    'Gaas Integrated School Ormoc',
    'Donghol Integrated School Ormoc',
    'San Antonio Integrated School Ormoc',
    'Ormoc City SPED Center',
    'San Isidro Integrated School Ormoc',
    'Liberty Integrated School Ormoc',
    'Lao Integrated School Ormoc',
    'Lake Danao Elementary School Ormoc',
    'Monterico Integrated School Ormoc',
    'Nueva Vista Integrated School Ormoc',
    'Ormoc City Regional Sports Academy',
    // Private colleges
    "Saint Peter's College Ormoc",
    'San Lorenzo Ruiz College Ormoc',
    'Western Leyte College Ormoc',
    'ACLC College Ormoc',
    'STI College Ormoc',
    'Ormoc City Institute of Technology',
    'Sto Nino College Ormoc',
    // Other private schools
    'School of the Morning Star Ormoc',
    'Ormoc Adventist Multigrade School',
    "Saint Paul's School Ormoc",
    'Ormoc Immaculate Conception School',
    'Ormoc Holy Trinity Montessori Academy',
    'school Ormoc City',
    'college Ormoc City',
  ],
  hospitals: [
    'Ormoc Doctors Hospital',
    'OSPA Farmers Medical Center Ormoc',
    'Clinica Gatchalian Hospital Ormoc',
    'Ormoc District Hospital',
    'hospital Ormoc City',
  ],
  police: [
    'Ormoc City Police Office Camp Downes',
    'Ormoc City Police Station Cogon',
    'Cagbuhangin Police Station Ormoc',
    'Police Station Liloan Ormoc',
    'Police Station Linao Ormoc',
    'Police Station Dolores Ormoc',
    'Police Station Ipil Ormoc',
  ],
  parks: [
    'park Ormoc City',
    'Ormoc City Plaza',
    'Lake Danao Ormoc',
    'Lake Janagdan Ormoc',
    'Sulfatara Ormoc',
    'Alto Peak Ormoc',
    "Sal's Pineapple Plantation Ormoc",
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
    'Ormoc City Transport Terminal',
    'Ormoc City Bus Terminal',
    'Ormoc Port',
  ],
};

/** Known Ormoc landmarks as reliable fallbacks when search is incomplete. */
const CATEGORY_LANDMARKS = {
  schools: [
    // Public elementary
    {
      lat: 11.067672,
      lon: 124.6418648,
      name: 'Bagong Elementary School',
      display_name: 'Bagong Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 10.9960181,
      lon: 124.6185099,
      name: 'Camp Downes Elementary School',
      display_name: 'Camp Downes Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.001542,
      lon: 124.6150133,
      name: 'Can-adieng Elementary School',
      display_name: 'Can-adieng Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.073474,
      lon: 124.6246085,
      name: 'Dolores Elementary School',
      display_name: 'Dolores Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 10.9761046,
      lon: 124.6343255,
      name: 'Ipil Central School',
      display_name: 'Ipil Central School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 10.9942129,
      lon: 124.6785897,
      name: 'Mahayahay Elementary School',
      display_name: 'Mahayahay Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.0224625,
      lon: 124.6298203,
      name: 'Patag Elementary School',
      display_name: 'Patag Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.0088111,
      lon: 124.6109634,
      name: 'Ormoc City Central School',
      display_name: 'Ormoc City Central School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.0992679,
      lon: 124.5518626,
      name: 'San Jose Elementary School',
      display_name: 'San Jose Elementary School, Ormoc City, Leyte',
      note: 'Public elementary',
    },
    {
      lat: 11.0714789,
      lon: 124.7014768,
      name: 'Lake Danao Elementary School',
      display_name: 'Lake Danao Elementary School, Ormoc City, Leyte',
      note: 'Integrated / elementary',
    },
    // Public high schools
    {
      lat: 11.0110394,
      lon: 124.6040691,
      name: 'New Ormoc City National High School',
      display_name: 'New Ormoc City National High School, Ormoc City, Leyte',
      note: 'Public high school',
    },
    {
      lat: 11.0109159,
      lon: 124.6052057,
      name: 'Ormoc City Senior High School',
      display_name: 'Ormoc City Senior High School, Ormoc City, Leyte',
      note: 'Public senior high school',
    },
    // Private colleges
    {
      lat: 11.0091853,
      lon: 124.6098772,
      name: 'Western Leyte College',
      display_name: 'Western Leyte College, Ormoc City, Leyte',
      note: 'Private college',
    },
    {
      lat: 11.0312306,
      lon: 124.6035143,
      name: 'San Lorenzo Ruiz College',
      display_name: 'San Lorenzo Ruiz College, Ormoc City, Leyte',
      note: 'Private college',
    },
    {
      lat: 11.0233227,
      lon: 124.604787,
      name: 'ACLC College',
      display_name: 'ACLC College, Ormoc City, Leyte',
      note: 'Private college',
    },
    {
      lat: 11.0049718,
      lon: 124.6100296,
      name: 'STI College Ormoc',
      display_name: 'Systems Technology Institute (STI), Ormoc City, Leyte',
      note: 'Private college',
    },
  ],
  police: [
    {
      lat: 10.9987846,
      lon: 124.6168889,
      name: 'OCPO Headquarters (Oscar Base)',
      display_name: 'Ormoc City Police Office, Camp Downes, Ormoc City, Leyte',
      phones: ['0998-598-6690'],
    },
    {
      lat: 11.014122,
      lon: 124.60351,
      name: 'Police Station 1 (Cogon)',
      display_name: 'Police Station 1, Aunubing Street, Brgy. Cogon, Ormoc City, Leyte',
      phones: ['0998-598-6691'],
    },
    {
      lat: 11.1014901,
      lon: 124.5842942,
      name: 'Police Station 2 (Cagbuhangin)',
      display_name: 'Police Station 2, Kananga–Ormoc Road, Brgy. Cagbuhangin, Ormoc City, Leyte',
      phones: ['0998-598-6693'],
    },
    {
      lat: 11.040191,
      lon: 124.549735,
      name: 'Police Station 3 (Liloan)',
      display_name: 'Police Station 3, Brgy. Liloan, Ormoc City, Leyte',
      phones: ['0998-967-4958'],
    },
    {
      lat: 11.015168,
      lon: 124.59178,
      name: 'Police Station 4 (Linao)',
      display_name: 'Police Station 4, Brgy. Linao, Ormoc City, Leyte',
      phones: ['0970-925-0336'],
    },
    {
      lat: 11.0759007,
      lon: 124.6296792,
      name: 'Police Station 5 (Dolores)',
      display_name: 'Police Station 5, San Pablo–Tongonan Road, Brgy. Dolores, Ormoc City, Leyte',
      phones: ['0970-061-3278'],
    },
    {
      lat: 10.977421,
      lon: 124.632237,
      name: 'Police Station 6 (Ipil)',
      display_name: 'Police Station 6, Brgy. Ipil, Ormoc City, Leyte',
      phones: ['0970-056-4173'],
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
      lat: 11.0049913,
      lon: 124.6118102,
      name: 'Ormoc Doctors’ Hospital',
      display_name: 'Ormoc Doctors’ Hospital, Aviles Street, Ormoc City, Leyte',
      phones: ['0938-037-0876', '0998-581-9610'],
    },
    {
      lat: 11.0040679,
      lon: 124.6144815,
      name: 'OSP A Farmers’ Medical Center',
      display_name: 'OSPA Farmers’ Medical Center, Concepcion Street, Brgy. Can-adieng, Ormoc City, Leyte',
      phones: ['0945-433-1306', '0905-296-6894'],
    },
    {
      lat: 11.0110983,
      lon: 124.6095434,
      name: 'Clinica Gatchalian & Hospital',
      display_name: 'Clinica Gatchalian Hospital, Juanito T. Kangleon Street, Brgy. West, Ormoc City, Leyte',
      phones: ['0949-151-2014', '(053) 561-17937'],
    },
    {
      lat: 11.0226196,
      lon: 124.6031503,
      name: 'Ormoc District Hospital',
      display_name: 'Ormoc District Hospital, Merida–Ormoc Road, Ormoc City, Leyte',
      phones: ['0985-351-7379'],
    },
  ],
  terminals: [
    {
      lat: 11.00485,
      lon: 124.6071,
      name: 'Ormoc City Transport Terminal',
      display_name: 'Ormoc City Bus & Jeepney Terminal, Ebony St, Ormoc City, Leyte',
      note: 'Main city bus and jeepney terminal',
    },
    {
      lat: 11.0065,
      lon: 124.6072,
      name: 'Ormoc Port',
      display_name: 'Ormoc Port / Pier, Ormoc City, Leyte',
      note: 'Ferry and shipping terminal',
    },
  ],
  parks: [
    {
      lat: 11.00417,
      lon: 124.60806,
      name: 'Ormoc City Plaza',
      display_name: 'Ormoc City Plaza, Ormoc City, Leyte',
    },
    {
      lat: 11.03902,
      lon: 124.61327,
      name: "Sal's Pineapple Plantation",
      display_name: "Sal's Pineapple Plantation, Hibunawon, Ormoc City, Leyte",
    },
    {
      lat: 11.071,
      lon: 124.7,
      name: 'Lake Danao',
      display_name: 'Lake Danao, Ormoc City, Leyte',
    },
    {
      lat: 11.10202,
      lon: 124.71576,
      name: 'Lake Janagdan',
      display_name: 'Lake Janagdan, Cabintan, Ormoc City, Leyte',
    },
    {
      lat: 11.10352,
      lon: 124.74262,
      name: 'Alto Peak',
      display_name: 'Alto Peak (Mt. Aminduen), Leyte',
    },
    {
      lat: 11.09596,
      lon: 124.73713,
      name: 'Sulfatara',
      display_name: 'Sulfatara, Cabintan, Ormoc City, Leyte',
    },
    {
      lat: 11.09441,
      lon: 124.66488,
      name: 'Supremacy Camp',
      display_name: 'Supremacy Camp, Brgy. Milagro, Ormoc City, Leyte',
    },
  ],
  /** Suggest/search only — not a map chip category */
  tourist: [
    {
      lat: 11.00503,
      lon: 124.60904,
      name: 'Ormoc City Museum',
      display_name: "People's Museum, Molave St, Ormoc City, Leyte",
    },
    {
      lat: 10.99049,
      lon: 124.62113,
      name: 'Sabin Resort Hotel',
      display_name: 'Sabin Resort Hotel, Ormoc City, Leyte',
    },
    {
      lat: 11.09371,
      lon: 124.65205,
      name: '88 Café',
      display_name: '88 Café, Milagro - Welcome Rd, Ormoc City, Leyte',
    },
    {
      lat: 10.98831,
      lon: 124.62067,
      name: "Marta's",
      display_name: "Marta's Restaurant, Bantigue, Ormoc City, Leyte",
    },
  ],
};

const SUGGEST_LANDMARKS = [
  ...Object.values(CATEGORY_LANDMARKS).flat(),
  ...ORMOC_BARANGAYS,
];

const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';

const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const ESRI_ATTR = 'Tiles © Esri';
const GOOGLE_ATTR = 'Imagery © Google';
const TOPO_ATTR = `${OSM_ATTR} © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a>`;

/** Layer ids used by the Map layers picker. */
export const MAP_LAYERS = [
  { id: 'streets', label: 'Streets' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
];

/**
 * Basemap configs for MapLibre (no API key).
 * Streets/light/dark use free OpenFreeMap vector styles for sharper labels.
 */
const LAYER_CONFIG = {
  streets: {
    kind: 'style-url',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  },
  light: {
    kind: 'style-url',
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
  },
  dark: {
    kind: 'style-url',
    styleUrl: 'https://tiles.openfreemap.org/styles/dark',
  },
  satellite: {
    kind: 'raster',
    // Google satellite tiles stay sharp at city zoom; Esri World Imagery blurs in Ormoc past ~z16.
    tiles: [
      'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    ],
    overlays: [
      {
        id: 'labels',
        tiles: [
          'https://mt0.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
        ],
        attribution: GOOGLE_ATTR,
      },
    ],
    attribution: GOOGLE_ATTR,
    maxzoom: 21,
    mapMaxZoom: 20,
  },
  terrain: {
    kind: 'raster',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: TOPO_ATTR,
    maxzoom: 17,
  },
  google: null,
  roadmap: null,
};

LAYER_CONFIG.google = LAYER_CONFIG.streets;
LAYER_CONFIG.roadmap = LAYER_CONFIG.streets;

function buildRasterStyle(cfg) {
  const maxzoom = cfg.maxzoom || 19;
  const sources = {
    basemap: {
      type: 'raster',
      tiles: cfg.tiles,
      tileSize: 256,
      attribution: cfg.attribution,
      maxzoom,
    },
  };
  const layers = [{
    id: 'basemap',
    type: 'raster',
    source: 'basemap',
    paint: {
      'raster-fade-duration': 0,
      'raster-resampling': 'linear',
      'raster-opacity': 1,
    },
  }];

  (cfg.overlays || []).forEach((overlay) => {
    const sourceId = `overlay-${overlay.id}`;
    sources[sourceId] = {
      type: 'raster',
      tiles: overlay.tiles,
      tileSize: 256,
      attribution: overlay.attribution || cfg.attribution,
      maxzoom: overlay.maxzoom || maxzoom,
    };
    layers.push({
      id: sourceId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-fade-duration': 0,
        'raster-resampling': 'linear',
      },
    });
  });

  return { version: 8, sources, layers };
}

function resolveMapStyle(layerId) {
  const cfg = LAYER_CONFIG[layerId] || LAYER_CONFIG.streets;
  if (cfg.kind === 'style-url') return cfg.styleUrl;
  return buildRasterStyle(cfg);
}

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
export function getLayerPreviewUrl(layerId, { zoom = 13 } = {}) {
  // Slightly inland sample so thumbs show city streets, not Ormoc Bay water.
  const { tileX, tileY } = latLngToTile(ORMOC_CENTER.lat, ORMOC_CENTER.lng, zoom);
  // ArcGIS street tiles (OSM CDN often blocks hotlinked browser previews).
  const streets = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${tileY}/${tileX}`;
  const imagery = `https://mt1.google.com/vt/lyrs=s&x=${tileX}&y=${tileY}&z=${zoom}`;
  const labels = `https://mt1.google.com/vt/lyrs=h&x=${tileX}&y=${tileY}&z=${zoom}`;

  const previews = {
    streets,
    light: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${tileY}/${tileX}`,
    dark: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${tileY}/${tileX}`,
    satellite: [labels, imagery],
    terrain: `https://a.tile.opentopomap.org/${zoom}/${tileX}/${tileY}.png`,
    google: streets,
    roadmap: streets,
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
 * Street View iframe embed (opens Google's public svembed — no Maps JS key).
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

/** @deprecated Google Static Street View removed — returns empty. */
export function getStreetViewStaticUrl() {
  return '';
}

/** @deprecated Google Places photos removed — keep local tourist images. */
export async function fetchGooglePlacePhotoUrl() {
  return '';
}

let mapLibrePromise = null;

export function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;

  mapLibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-ormoc-maplibre]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS;
      link.dataset.ormocMaplibre = '1';
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-ormoc-maplibre]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.maplibregl) resolve(window.maplibregl);
        else reject(new Error('MapLibre failed to initialize'));
      });
      existing.addEventListener('error', () => {
        mapLibrePromise = null;
        reject(new Error('Could not load MapLibre'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.dataset.ormocMaplibre = '1';
    script.onload = () => {
      if (window.maplibregl) resolve(window.maplibregl);
      else reject(new Error('MapLibre failed to initialize'));
    };
    script.onerror = () => {
      mapLibrePromise = null;
      reject(new Error('Could not load MapLibre'));
    };
    document.head.appendChild(script);
  });

  return mapLibrePromise;
}

/** Compat alias — map no longer uses Google Maps JS. */
export function loadGoogleMaps() {
  return loadMapLibre();
}

function toLngLat(input) {
  if (Array.isArray(input)) {
    return { lat: Number(input[0]), lng: Number(input[1]) };
  }
  return {
    lat: Number(input?.lat),
    lng: Number(input?.lng ?? input?.lon),
  };
}

function circlePolygon(lng, lat, radiusM, steps = 64) {
  const coords = [];
  const latRad = (lat * Math.PI) / 180;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = radiusM * Math.cos(angle);
    const dy = radiusM * Math.sin(angle);
    const dLat = dy / 111320;
    const dLng = dx / (111320 * Math.cos(latRad));
    coords.push([lng + dLng, lat + dLat]);
  }
  return coords;
}

const PIN_CATEGORIES = new Set([
  'hospitals', 'police', 'parks', 'food', 'churches', 'terminals', 'malls', 'schools', 'place',
]);

function resolvePinCategory(place = {}, fallback = 'place') {
  const raw = String(place.category || place.type || fallback || 'place').toLowerCase();
  if (PIN_CATEGORIES.has(raw)) return raw;
  if (raw === 'hospital' || raw === 'clinic' || raw === 'doctors') return 'hospitals';
  if (raw === 'police') return 'police';
  if (raw === 'park' || raw === 'garden') return 'parks';
  if (raw === 'restaurant' || raw === 'cafe' || raw === 'fast_food' || raw === 'food_court') return 'food';
  if (raw === 'place_of_worship' || raw === 'church' || raw === 'chapel') return 'churches';
  if (raw === 'bus_station' || raw === 'ferry_terminal' || raw === 'taxi') return 'terminals';
  if (raw === 'mall' || raw === 'department_store' || raw === 'supermarket') return 'malls';
  if (raw === 'school' || raw === 'university' || raw === 'college') return 'schools';
  return 'place';
}

function pinGlyph(category) {
  const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (category) {
    case 'hospitals':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z" ${common}/></svg>`;
    case 'police':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.4 7 9.5 4-1.1 7-5 7-9.5V6l-7-3z" ${common}/><path d="M9.5 12.2 11 13.7l3.8-3.8" ${common}/></svg>`;
    case 'parks':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V11" ${common}/><path d="M7 14c0-3.2 2.2-6 5-6s5 2.8 5 6" ${common}/><path d="M8.5 9.5C7 8 7 5.8 8.8 4.8 10.2 4 11.7 4.7 12 6c.3-1.3 1.8-2 3.2-1.2C17 5.8 17 8 15.5 9.5" ${common}/></svg>`;
    case 'food':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M7 11v10M5 3c0 2.5 1 4.5 2 5M9 3c0 2.5-1 4.5-2 5M17 3v18M15 3h4c0 3-1.5 5-2 5h0c-.5 0-2-2-2-5z" ${common}/></svg>`;
    case 'churches':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v5M10 4h4" ${common}/><path d="M6 10h12v11H6V10z" ${common}/><path d="M10 21v-5h4v5" ${common}/></svg>`;
    case 'terminals':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14M6 17l1-10h10l1 10" ${common}/><path d="M8 7V5h8v2M8 17v2M16 17v2M8.5 11h.01M15.5 11h.01" ${common}/></svg>`;
    case 'malls':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.2 11H5.2L4 9z" ${common}/><path d="M8 9V7a4 4 0 0 1 8 0v2" ${common}/></svg>`;
    case 'schools':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10 12 5l9 5-9 5-9-5z" ${common}/><path d="M7 12.5V17c0 .8 2.2 2 5 2s5-1.2 5-2v-4.5" ${common}/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.4-7-11a7 7 0 1 1 14 0c0 5.6-7 11-7 11z" ${common}/><circle cx="12" cy="10" r="2.4" ${common}/></svg>`;
  }
}

function makePinElement({ label = '', tone = 'place', category = '' } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  const pinCategory = resolvePinCategory({ category }, tone === 'place' ? 'place' : tone);

  if (tone === 'route') {
    el.className = 'ormoc-map-pin ormoc-map-pin--route';
    el.setAttribute('aria-label', label || 'Route point');
    el.innerHTML = `<span>${escapeHtml(label)}</span>`;
    return el;
  }

  el.className = `ormoc-map-pin ormoc-map-pin--place ormoc-map-pin--${pinCategory}`;
  el.setAttribute('aria-label', label || pinCategory);
  el.dataset.category = pinCategory;
  el.innerHTML = `<span class="ormoc-map-pin-body"><span class="ormoc-map-pin-glyph">${pinGlyph(pinCategory)}</span></span>`;
  return el;
}

function makeUserElement(headingDeg = null) {
  const el = document.createElement('div');
  el.className = 'ormoc-map-user';
  el.title = 'You are here';
  el.innerHTML = headingDeg == null
    ? '<span class="ormoc-map-user-dot"></span>'
    : `<span class="ormoc-map-user-arrow" style="transform:rotate(${Number(headingDeg)}deg)"></span>`;
  return el;
}

export function createOrmocMap(container, { locate = true, mapType = 'streets' } = {}) {
  return loadMapLibre().then((maplibregl) => {
    const initialType = LAYER_CONFIG[mapType] ? mapType : 'streets';
    const initialCfg = LAYER_CONFIG[initialType] || LAYER_CONFIG.streets;
    const map = new maplibregl.Map({
      container,
      style: resolveMapStyle(initialType),
      center: [ORMOC_CENTER.lng, ORMOC_CENTER.lat],
      zoom: ORMOC_ZOOM,
      maxZoom: initialCfg.mapMaxZoom || 22,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });

    const markers = [];
    const routeMarkers = [];
    let userMarker = null;
    let routeStartMarker = null;
    let popup = null;
    let accuracyReady = false;

    const mapFacade = {
      setCenter(center) {
        const { lat, lng } = toLngLat(center);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        map.setCenter([lng, lat]);
      },
      setZoom(zoom) {
        if (Number.isFinite(zoom)) map.setZoom(zoom);
      },
      panTo(center) {
        const { lat, lng } = toLngLat(center);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        map.easeTo({ center: [lng, lat] });
      },
      getCenter() {
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      },
      fitBounds(bounds, padding = 64) {
        map.fitBounds(bounds, {
          padding: typeof padding === 'number' ? padding : 64,
          maxZoom: 17,
        });
      },
      _gl: map,
    };

    let streetViewFs = document.getElementById('streetview-fs');
    if (!streetViewFs) {
      streetViewFs = document.createElement('div');
      streetViewFs.id = 'streetview-fs';
      streetViewFs.className = 'streetview-fs';
      streetViewFs.hidden = true;
      streetViewFs.innerHTML = `
        <div class="streetview-fs-bar">
          <p class="streetview-fs-title" id="streetview-fs-title">Street View</p>
          <button type="button" class="streetview-fs-close" data-streetview-close aria-label="Close Street View">Close</button>
        </div>
        <iframe
          class="streetview-fs-frame"
          id="streetview-fs-frame"
          title="Street View"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      `;
      document.body.appendChild(streetViewFs);
    }

    const streetViewTitle = streetViewFs.querySelector('#streetview-fs-title');
    const streetViewFrame = streetViewFs.querySelector('#streetview-fs-frame');

    function closeStreetViewFs() {
      streetViewFs.classList.remove('is-open');
      document.body.classList.remove('streetview-fs-open');
      window.setTimeout(() => {
        if (!streetViewFs.classList.contains('is-open')) {
          streetViewFs.hidden = true;
          if (streetViewFrame) streetViewFrame.src = 'about:blank';
        }
      }, 200);
    }

    function openStreetViewFs(embedUrl, titleText) {
      if (!embedUrl || !streetViewFrame) return;
      if (streetViewTitle) streetViewTitle.textContent = titleText || 'Street View';
      streetViewFrame.src = embedUrl;
      streetViewFs.hidden = false;
      document.body.classList.add('streetview-fs-open');
      requestAnimationFrame(() => streetViewFs.classList.add('is-open'));
    }

    if (streetViewFs.dataset.bound !== '1') {
      streetViewFs.dataset.bound = '1';
      streetViewFs.querySelectorAll('[data-streetview-close]').forEach((btn) => {
        btn.addEventListener('click', closeStreetViewFs);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && streetViewFs.classList.contains('is-open')) {
          closeStreetViewFs();
        }
      });
    }

    function closePopup() {
      if (popup) {
        popup.remove();
        popup = null;
      }
    }

    function openPlaceCard(place, anchorLngLat = null) {
      const rawTitle = place.name || 'Place';
      const title = escapeHtml(rawTitle);
      const subtitle = escapeHtml(place.display_name || '');
      const phones = Array.isArray(place.phones)
        ? place.phones.filter(Boolean)
        : (place.phone ? [place.phone] : []);
      const phoneHtml = phones.length
        ? `<div class="place-iw-phones">
            ${phones.map((phone) => {
              const label = escapeHtml(String(phone));
              const href = escapeHtml(`tel:${String(phone).replace(/[^\d+]/g, '')}`);
              return `
                <a class="place-iw-phone" href="${href}">
                  <span class="place-iw-phone-num">${label}</span>
                  <span class="place-iw-phone-call">Call</span>
                </a>
              `;
            }).join('')}
          </div>`
        : '';
      const embedUrl = getStreetViewEmbedUrl(place);
      const lat = Number(place.lat);
      const lon = Number(place.lon);
      const lngLat = anchorLngLat || (
        Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null
      );
      if (!lngLat) return;

      closePopup();
      popup = new maplibregl.Popup({
        offset: 18,
        maxWidth: '280px',
        className: 'ormoc-map-popup',
        closeButton: true,
        closeOnClick: true,
      })
        .setLngLat(lngLat)
        .setHTML(`
          <div class="place-iw">
            <div class="place-iw-copy">
              <strong>${title}</strong>
              <div class="place-iw-sub">${subtitle}</div>
            </div>
            ${phoneHtml}
            <div class="place-iw-actions">
              <button type="button" class="place-iw-route-btn" data-route-to>
                Route here
              </button>
              ${embedUrl ? `
                <button
                  type="button"
                  class="place-iw-street-btn"
                  data-open-streetview
                  data-streetview-url="${escapeHtml(embedUrl)}"
                  data-streetview-title="${title}"
                >
                  Open Street View
                </button>
              ` : '<div class="place-iw-street-empty">No Street View nearby</div>'}
            </div>
          </div>
        `)
        .addTo(map);

      const root = popup.getElement();
      const streetBtn = root?.querySelector('[data-open-streetview]');
      if (streetBtn && streetBtn.dataset.bound !== '1') {
        streetBtn.dataset.bound = '1';
        streetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openStreetViewFs(streetBtn.dataset.streetviewUrl, streetBtn.dataset.streetviewTitle || rawTitle);
        });
      }

      const routeBtn = root?.querySelector('[data-route-to]');
      if (routeBtn && routeBtn.dataset.bound !== '1') {
        routeBtn.dataset.bound = '1';
        routeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closePopup();
          window.dispatchEvent(new CustomEvent('ormocgo:route-to-place', {
            detail: {
              lat,
              lon,
              name: place.name || rawTitle,
              display_name: place.display_name || '',
            },
          }));
        });
      }
    }

    function ensureAccuracyLayer() {
      if (accuracyReady || !map.getStyle()) return;
      if (!map.getSource('user-accuracy')) {
        map.addSource('user-accuracy', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getLayer('user-accuracy-fill')) {
        map.addLayer({
          id: 'user-accuracy-fill',
          type: 'fill',
          source: 'user-accuracy',
          paint: {
            'fill-color': '#1a73e8',
            'fill-opacity': 0.14,
          },
        });
      }
      if (!map.getLayer('user-accuracy-line')) {
        map.addLayer({
          id: 'user-accuracy-line',
          type: 'line',
          source: 'user-accuracy',
          paint: {
            'line-color': '#1a73e8',
            'line-opacity': 0.28,
            'line-width': 1,
          },
        });
      }
      accuracyReady = true;
    }

    function setAccuracyCircle(position, radiusM) {
      ensureAccuracyLayer();
      const source = map.getSource('user-accuracy');
      if (!source) return;
      const radius = Math.max(12, Math.min(80, Number(radiusM) || 0));
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [circlePolygon(position.lng, position.lat, radius)],
          },
        }],
      });
    }

    function clearAccuracyCircle() {
      const source = map.getSource('user-accuracy');
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    let lastRouteCoords = null;

    function routeFeature(lineCoords) {
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: lineCoords,
        },
      };
    }

    function ensureRouteLayer() {
      if (!map.getStyle()) return false;
      try {
        if (!map.getSource('ormoc-route')) {
          map.addSource('ormoc-route', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }
        if (!map.getLayer('ormoc-route-casing')) {
          map.addLayer({
            id: 'ormoc-route-casing',
            type: 'line',
            source: 'ormoc-route',
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 9,
              'line-opacity': 0.95,
            },
          });
        }
        if (!map.getLayer('ormoc-route-line')) {
          map.addLayer({
            id: 'ormoc-route-line',
            type: 'line',
            source: 'ormoc-route',
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#2563eb',
              'line-width': 5,
              'line-opacity': 1,
            },
          });
        }
        return true;
      } catch (_) {
        return false;
      }
    }

    function paintRouteLine(lineCoords) {
      if (!lineCoords?.length) return false;
      if (!ensureRouteLayer()) return false;
      const source = map.getSource('ormoc-route');
      if (!source) return false;
      source.setData(routeFeature(lineCoords));
      return true;
    }

    function whenStyleReady(fn) {
      const run = () => {
        try {
          fn();
        } catch (_) {
          map.once('style.load', () => requestAnimationFrame(run));
        }
      };
      if (map.isStyleLoaded()) {
        run();
        return;
      }
      // `load` only fires once; style switches need `style.load`.
      map.once('style.load', () => requestAnimationFrame(run));
    }

    const api = {
      maps: maplibregl,
      map: mapFacade,
      clearMarkers() {
        closePopup();
        markers.splice(0).forEach((marker) => marker.remove());
      },
      clearRoute() {
        routeMarkers.splice(0).forEach((marker) => marker.remove());
        routeStartMarker = null;
        lastRouteCoords = null;
        const source = map.getSource('ormoc-route');
        if (source) {
          source.setData({ type: 'FeatureCollection', features: [] });
        }
      },
      setMapType(type) {
        const next = LAYER_CONFIG[type] ? type : 'streets';
        const nextCfg = LAYER_CONFIG[next] || LAYER_CONFIG.streets;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        const maxZoom = nextCfg.mapMaxZoom || 22;
        const savedRoute = lastRouteCoords ? lastRouteCoords.slice() : null;
        accuracyReady = false;
        map.setMaxZoom(maxZoom);
        map.setStyle(resolveMapStyle(next));
        map.once('style.load', () => {
          map.setCenter(center);
          map.setZoom(Math.min(zoom, maxZoom));
          map.setBearing(bearing);
          map.setPitch(pitch);
          ensureRouteLayer();
          ensureAccuracyLayer();
          if (savedRoute?.length) {
            lastRouteCoords = savedRoute;
            paintRouteLine(savedRoute);
          }
        });
      },
      setStatusMarkers(places = [], { category = '' } = {}) {
        api.clearMarkers();
        const bounds = new maplibregl.LngLatBounds();
        let count = 0;

        places.forEach((place) => {
          const lat = Number(place.lat);
          const lon = Number(place.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const pinCategory = resolvePinCategory(place, category || 'place');
          const el = makePinElement({
            label: place.name || 'Place',
            tone: 'place',
            category: pinCategory,
          });
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lon, lat])
            .addTo(map);
          el.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openPlaceCard(place, [lon, lat]);
          });
          markers.push(marker);
          bounds.extend([lon, lat]);
          count += 1;
        });

        if (count === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(16);
        } else if (count > 1) {
          map.fitBounds(bounds, { padding: 64, maxZoom: 16 });
        }
      },
      focusPlace(place, { zoom = 17 } = {}) {
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        map.easeTo({ center: [lon, lat], zoom });
        openPlaceCard(place, [lon, lat]);
      },
      setUserLocation(latlng, {
        accuracy = 0,
        heading = null,
        follow = false,
        moveStart = false,
      } = {}) {
        const position = toLngLat(latlng);
        if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

        const headingDeg = Number.isFinite(heading) ? heading : null;
        const el = makeUserElement(headingDeg);

        if (userMarker) userMarker.remove();
        userMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([position.lng, position.lat])
          .addTo(map);

        whenStyleReady(() => setAccuracyCircle(position, accuracy));

        if (moveStart && routeStartMarker) {
          routeStartMarker.setLngLat([position.lng, position.lat]);
        }

        if (follow) {
          map.easeTo({ center: [position.lng, position.lat] });
        }
      },
      clearUserLocation() {
        if (userMarker) {
          userMarker.remove();
          userMarker = null;
        }
        clearAccuracyCircle();
      },
      drawRoute(coordinates = [], summary = {}) {
        routeMarkers.splice(0).forEach((marker) => marker.remove());
        routeStartMarker = null;
        if (!coordinates.length) {
          lastRouteCoords = null;
          const source = map.getSource('ormoc-route');
          if (source) source.setData({ type: 'FeatureCollection', features: [] });
          return;
        }

        // OSRM returns [lon, lat]
        const lineCoords = coordinates
          .map((point) => {
            const lon = Number(point?.[0]);
            const lat = Number(point?.[1]);
            return (Number.isFinite(lon) && Number.isFinite(lat)) ? [lon, lat] : null;
          })
          .filter(Boolean);
        if (lineCoords.length < 2) return;

        lastRouteCoords = lineCoords;
        whenStyleReady(() => {
          if (!paintRouteLine(lineCoords)) {
            map.once('style.load', () => paintRouteLine(lineCoords));
          }
        });

        const start = lineCoords[0];
        const end = lineCoords[lineCoords.length - 1];
        const liveStart = Boolean(summary.liveStart);

        if (!liveStart && start) {
          const startEl = makePinElement({ label: 'A', tone: 'route' });
          routeStartMarker = new maplibregl.Marker({ element: startEl, anchor: 'bottom' })
            .setLngLat(start)
            .addTo(map);
          routeMarkers.push(routeStartMarker);
        }

        if (end) {
          const endEl = makePinElement({ label: 'B', tone: 'route' });
          routeMarkers.push(
            new maplibregl.Marker({ element: endEl, anchor: 'bottom' })
              .setLngLat(end)
              .addTo(map),
          );
        }

        if (summary.fit !== false) {
          const bounds = lineCoords.reduce(
            (b, coord) => b.extend(coord),
            new maplibregl.LngLatBounds(lineCoords[0], lineCoords[0]),
          );
          if (liveStart && userMarker) {
            bounds.extend(userMarker.getLngLat());
          }
          map.fitBounds(bounds, { padding: 72, maxZoom: 17 });
        }
      },
      invalidate() {
        setTimeout(() => map.resize(), 60);
      },
    };

    map.on('load', () => {
      ensureRouteLayer();
      ensureAccuracyLayer();
      map.resize();
    });

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
            map.setCenter([latlng.lng, latlng.lat]);
            map.setZoom(15);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    setTimeout(() => map.resize(), 120);
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
  const raw = String(query || '').trim().toLowerCase();
  if (!raw) return [];
  const wantsBrgy = /\b(brgy\.?|barangay)\b/i.test(raw);
  const stripped = raw.replace(/^(brgy\.?|barangay)\s+/i, '').trim();
  const tokens = stripped.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const scored = SUGGEST_LANDMARKS.map((place) => {
    const name = String(place.name || '').toLowerCase();
    const display = String(place.display_name || '').toLowerCase();
    const bareName = name.replace(/^(brgy\.?|barangay)\s+/i, '');
    const hay = `${name} ${display} ${bareName}`;
    if (!tokens.every((token) => hay.includes(token))) return null;

    let score = 0;
    if (bareName === stripped || name === raw) score += 24;
    else if (bareName.startsWith(stripped) || name.startsWith(raw)) score += 14;
    else if (bareName.includes(stripped)) score += 8;
    if (place.type === 'barangay' || place.category === 'barangay') score += 6;
    if (wantsBrgy && (place.type === 'barangay' || place.category === 'barangay')) score += 10;
    return { place, score };
  }).filter(Boolean);

  scored.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  return scored.slice(0, limit).map((item) => ({ ...item.place }));
}

export async function searchPlaces(query, { limit = 8, bounded = true } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const local = matchLandmarks(q, limit);

  // Prefer barangay phrasing for Nominatim when user types brgy/barangay.
  const nominatimQ = /\b(brgy\.?|barangay)\b/i.test(q)
    ? (/ormoc/i.test(q) ? q.replace(/\bbrgy\.?\b/i, 'Barangay') : `Barangay ${q.replace(/^(brgy\.?|barangay)\s+/i, '')}, Ormoc City, Leyte, Philippines`)
    : (/ormoc/i.test(q) ? q : `${q}, Ormoc City, Leyte, Philippines`);

  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set('q', nominatimQ);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('viewbox', `${ORMOC_BOUNDS.west},${ORMOC_BOUNDS.north},${ORMOC_BOUNDS.east},${ORMOC_BOUNDS.south}`);
  // Keep soft bias by viewbox; do not force bounded for brand names like SM / Robinsons.
  if (bounded) url.searchParams.set('bounded', '1');

  let remote = [];
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });
    if (res.ok) {
      const data = await res.json();
      remote = (data || []).map(normalizePlace);
    }
  } catch (_) {
    remote = [];
  }

  return mergePlaces(local, remote).slice(0, limit);
}

/** Instant local landmarks/barangays + Nominatim results for map + routes suggest. */
export async function suggestPlaces(query, { limit = 6 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  return searchPlaces(q, { limit, bounded: false });
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

/** Overpass: schools / colleges / universities inside Ormoc bbox. */
function searchSchoolsOverpass() {
  return searchOverpass([
    '["amenity"="school"]',
    '["amenity"="college"]',
    '["amenity"="university"]',
    '["amenity"="kindergarten"]',
  ], { fallbackName: 'School', typeKey: 'amenity' });
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
  const effectiveLimit = categoryId === 'schools'
    ? Math.max(limit, 48)
    : limit;

  // Curated pins only — avoid noisy Nominatim floods (esp. terminals).
  if ((categoryId === 'police' || categoryId === 'hospitals' || categoryId === 'terminals') && landmarkSeed.length) {
    return landmarkSeed
      .slice(0, Math.max(effectiveLimit, landmarkSeed.length))
      .map((place) => ({ ...place, category: categoryId }));
  }

  // Schools: curated pins first, then OSM + named Nominatim lookups.
  const namedQueries = categoryId === 'schools'
    ? queries.filter((q) => !/^(school|college|university)\b/i.test(q)).slice(0, 18)
    : queries;

  const settled = await Promise.allSettled([
    ...(categoryId === 'malls' ? [searchMallsOverpass()] : []),
    ...(categoryId === 'schools' ? [searchSchoolsOverpass()] : []),
    ...namedQueries.map((q) => searchPlaces(q, {
      limit: categoryId === 'schools' ? 2 : 5,
      // Brand lookups should not be strictly boxed or SM/Robinsons can be missed.
      bounded: !/sm|robinsons|gaisano|college|school|sti|aclc/i.test(q),
    })),
  ]);

  const found = settled
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);

  return mergePlaces(landmarkSeed, ...found)
    .slice(0, effectiveLimit)
    .map((place) => ({ ...place, category: categoryId }));
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
