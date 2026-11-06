import { getAppName, routes, defaultPage } from './config.js';
import { getEnv, loadEnv } from './env.js';
import { applyPwaMeta, registerServiceWorker } from './pwa.js';
import { getSupabase } from './supabase.js';
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { renderSidebar, bindSidebar } from './components/sidebar.js';

const app = document.getElementById('app');
const headerSlot = document.getElementById('header-slot');
const footerSlot = document.getElementById('footer-slot');
const sidebarSlot = document.getElementById('sidebar-slot');

const loadedStyles = new Set();

function resolvePage() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('page');
  const fromHash = window.location.hash.replace(/^#\/?/, '');
  const page = (fromQuery || fromHash || defaultPage).trim();
  return routes[page] ? page : '404';
}

function ensureStyles(paths = []) {
  const version = encodeURIComponent(getEnv().APP_VERSION || '0.1.1');
  paths.forEach((href) => {
    const busted = `${href}?v=${version}`;
    if (loadedStyles.has(busted)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = busted;
    document.head.appendChild(link);
    loadedStyles.add(busted);
  });
}

function loadChrome(hideChrome) {
  if (hideChrome) {
    headerSlot.innerHTML = '';
    footerSlot.innerHTML = '';
    sidebarSlot.innerHTML = '';
    document.body.classList.add('no-chrome');
    return;
  }

  document.body.classList.remove('no-chrome');

  if (!sidebarSlot.dataset.loaded) {
    sidebarSlot.innerHTML = renderSidebar();
    sidebarSlot.dataset.loaded = '1';
    bindSidebar(sidebarSlot);
  }

  if (!headerSlot.dataset.loaded) {
    headerSlot.innerHTML = renderHeader();
    headerSlot.dataset.loaded = '1';
  }

  if (!footerSlot.dataset.loaded) {
    footerSlot.innerHTML = renderFooter();
    footerSlot.dataset.loaded = '1';
  }
}

function setActiveNav(active) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('is-active', el.getAttribute('data-nav') === active);
  });
}

function render() {
  const pageKey = resolvePage();
  const route = routes[pageKey] || routes['404'];

  document.title = `${route.title} · ${getAppName()}`;
  ensureStyles(route.css || []);
  loadChrome(Boolean(route.hideChrome));
  setActiveNav(route.active || '');

  app.innerHTML = route.render();
  if (typeof route.mount === 'function') {
    route.mount(app);
  }

  document.dispatchEvent(new CustomEvent('ormocgo:page', { detail: { page: pageKey } }));
}

window.addEventListener('popstate', render);
window.addEventListener('hashchange', render);

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-page]');
  if (!link) return;
  e.preventDefault();
  const page = link.getAttribute('data-page');
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  url.hash = '';
  history.pushState({ page }, '', url);
  render();
});

async function boot() {
  await loadEnv();
  applyPwaMeta();
  registerServiceWorker();
  await getSupabase();
  render();
}

boot();
