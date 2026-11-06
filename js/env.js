/**
 * Loads env for local (.env / .env.production) or Vercel (/api/config).
 * Only browser-safe values (Supabase URL + anon/publishable key).
 */

const defaults = {
  APP_NAME: 'OrmocGo',
  APP_ENV: 'local',
  APP_URL: 'https://ormocgo.vercel.app',
  APP_VERSION: '0.1.18',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  PWA_NAME: 'OrmocGo',
  PWA_SHORT_NAME: 'OrmocGo',
  PWA_DESCRIPTION: 'Community city guide for Ormoc — local details, places, and helpful tools.',
  PWA_THEME_COLOR: '#2563eb',
  PWA_BACKGROUND_COLOR: '#ffffff',
  PWA_START_URL: './index.html',
  PWA_SCOPE: './',
};

let cache = null;

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

async function loadFromEnvFile() {
  const file = envFileForHost();
  const res = await fetch(file, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseEnv(await res.text());
}

export async function loadEnv() {
  if (cache) return cache;

  try {
    if (!isLocalHost(window.location.hostname)) {
      cache = await loadFromApi();
    } else {
      cache = await loadFromEnvFile();
    }
  } catch (err) {
    try {
      cache = await loadFromEnvFile();
    } catch (fileErr) {
      console.warn('[OrmocGo] Could not load env, using defaults.', err, fileErr);
      cache = { ...defaults };
    }
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
