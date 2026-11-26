/**
 * Loads env for local (.env / .env.production) or Vercel (/api/config).
 * Only browser-safe values (Supabase URL + anon/publishable key).
 */

const defaults = {
  APP_NAME: 'OrmocGo',
  APP_ENV: 'local',
  APP_URL: 'https://ormoc-go.vercel.app',
  APP_VERSION: '0.1.33',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  PWA_NAME: 'OrmocGo',
  PWA_SHORT_NAME: 'OrmocGo',
  PWA_DESCRIPTION: 'Community city guide for Ormoc — local details, places, and helpful tools.',
  PWA_THEME_COLOR: '#ffffff',
  PWA_BACKGROUND_COLOR: '#ffffff',
  PWA_START_URL: './index.html',
  PWA_SCOPE: './',
};

let cache = null;
const ENV_STORAGE_KEY = 'ormocgo.env.cache';

function readStoredEnv() {
  try {
    const raw = localStorage.getItem(ENV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeStoredEnv(env) {
  try {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify({
      APP_NAME: env.APP_NAME,
      APP_ENV: env.APP_ENV,
      APP_URL: env.APP_URL,
      APP_VERSION: env.APP_VERSION,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
      PWA_NAME: env.PWA_NAME,
      PWA_SHORT_NAME: env.PWA_SHORT_NAME,
      PWA_DESCRIPTION: env.PWA_DESCRIPTION,
      PWA_THEME_COLOR: env.PWA_THEME_COLOR,
      PWA_BACKGROUND_COLOR: env.PWA_BACKGROUND_COLOR,
      PWA_START_URL: env.PWA_START_URL,
      PWA_SCOPE: env.PWA_SCOPE,
    }));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function isLocalHost(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.local');
}

function envFileForHost() {
  return isLocalHost(window.location.hostname) ? '.env' : '.env.production';
}

function parseEnv(text) {
  const out = { ...defaults };
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq < 1) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    });
  return out;
}

async function loadFromApi() {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { ...defaults, ...data };
}

async function loadFromEnvFile(file = envFileForHost()) {
  const res = await fetch(file, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseEnv(await res.text());
}

function missingCriticalKeys(env) {
  return !String(env?.SUPABASE_URL || '').trim()
    || !String(env?.SUPABASE_ANON_KEY || '').trim();
}

/** Prefer non-empty values from `primary`, fill gaps from `fallback`. */
function mergeEnv(primary, fallback) {
  const out = { ...defaults, ...fallback, ...primary };
  Object.keys(defaults).forEach((key) => {
    const a = String(primary?.[key] ?? '').trim();
    const b = String(fallback?.[key] ?? '').trim();
    out[key] = a || b || defaults[key];
  });
  return out;
}

export async function loadEnv() {
  if (cache) return cache;

  try {
    if (!isLocalHost(window.location.hostname)) {
      const apiEnv = await loadFromApi();
      if (missingCriticalKeys(apiEnv)) {
        try {
          const fileEnv = await loadFromEnvFile('.env.production');
          cache = mergeEnv(apiEnv, fileEnv);
        } catch (_) {
          cache = apiEnv;
        }
      } else {
        cache = apiEnv;
      }
    } else {
      cache = await loadFromEnvFile();
    }
  } catch (err) {
    try {
      cache = await loadFromEnvFile();
    } catch (fileErr) {
      const stored = readStoredEnv();
      if (stored) {
        console.warn('[OrmocGo] Offline env fallback (stored).', err, fileErr);
        cache = mergeEnv(stored, defaults);
      } else {
        console.warn('[OrmocGo] Could not load env, using defaults.', err, fileErr);
        cache = { ...defaults };
      }
    }
  }

  // Keep a local copy so limited offline features can boot without /api/config or .env.
  if (!missingCriticalKeys(cache) || cache.APP_VERSION) {
    writeStoredEnv(cache);
  }

  cache.APP_URL = cache.APP_URL
    || (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/'));
  window.__ORMOCGO_ENV__ = cache;
  return cache;
}

export function getEnv() {
  return cache || { ...defaults };
}

export function getAppName() {
  return getEnv().APP_NAME || 'OrmocGo';
}
