import { getEnv } from './env.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const env = getEnv();
  const version = encodeURIComponent(env.APP_VERSION || '0.1.0');

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`./sw.js?v=${version}`)
      .catch((err) => console.warn('[OrmocGo] SW register failed', err));
  });
}

export function applyPwaMeta() {
  const env = getEnv();
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', env.PWA_THEME_COLOR || '#2563eb');

  if (document.title === 'OrmocGo' || !document.title) {
    document.title = env.PWA_NAME || env.APP_NAME || 'OrmocGo';
  }
}
