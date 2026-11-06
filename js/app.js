import { getAppName, routes, defaultPage } from './config.js';
import { getEnv, loadEnv } from './env.js';
import { applyPwaMeta, registerServiceWorker } from './pwa.js';
import { getSupabase } from './supabase.js';
import { goToPage } from './lib/navigate.js';
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { renderSidebar, bindSidebar } from './components/sidebar.js';

const app = document.getElementById('app');
const headerSlot = document.getElementById('header-slot');
const footerSlot = document.getElementById('footer-slot');
const sidebarSlot = document.getElementById('sidebar-slot');

const loadedStyles = new Set();
let authBound = false;
let renderToken = 0;

function resolvePage() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('page');
  const fromHash = window.location.hash.replace(/^#\/?/, '');
  const page = (fromQuery || fromHash || defaultPage).trim();
  return routes[page] ? page : '404';
}

function waitForStylesheet(link) {
  return new Promise((resolve) => {
    if (link.sheet) {
      resolve();
      return;
    }
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

function ensureStyles(paths = []) {
  const version = encodeURIComponent(getEnv().APP_VERSION || '0.1.1');
  const pending = [];

  paths.forEach((href) => {
    const busted = `${href}?v=${version}`;
    if (loadedStyles.has(busted)) return;

    // Prefer a stylesheet already linked in index.html (avoids FOUC on reload).
    const existing = document.querySelector(`link[rel="stylesheet"][href^="${href}"]`);
    if (existing) {
      loadedStyles.add(busted);
      pending.push(waitForStylesheet(existing));
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = busted;
    document.head.appendChild(link);
    loadedStyles.add(busted);
    pending.push(waitForStylesheet(link));
  });

  return Promise.all(pending);
}

function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  document.body.classList.remove('is-booting');
  if (!splash || splash.hidden) return;
  splash.classList.add('is-done');
  window.setTimeout(() => {
    splash.hidden = true;
  }, 200);
}

function bindChromeSignOut(root) {
  root.querySelectorAll('[data-signout]').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const supabase = await getSupabase();
        if (supabase) await supabase.auth.signOut();
        goToPage('home');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function loadChrome(hideChrome, session = null) {
  if (hideChrome) {
    headerSlot.innerHTML = '';
    footerSlot.innerHTML = '';
    sidebarSlot.innerHTML = '';
    document.body.classList.add('no-chrome');
    return;
  }

  document.body.classList.remove('no-chrome');

  sidebarSlot.innerHTML = renderSidebar(session);
  bindSidebar(sidebarSlot);
  bindChromeSignOut(sidebarSlot);

  headerSlot.innerHTML = renderHeader(session);
  bindChromeSignOut(headerSlot);

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

async function getSession() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function render() {
  const token = ++renderToken;
  const pageKey = resolvePage();
  const route = routes[pageKey] || routes['404'];
  const session = await getSession();
  if (token !== renderToken) return;

  // Signed-in users should land on the home dashboard, not auth sheets.
  if (session && (pageKey === 'login' || pageKey === 'signup')) {
    goToPage('home');
    return;
  }

  const hideChrome = typeof route.hideChrome === 'function'
    ? Boolean(route.hideChrome(session))
    : Boolean(route.hideChrome);

  document.title = `${route.title} · ${getAppName()}`;
  await ensureStyles(route.css || []);
  if (token !== renderToken) return;

  loadChrome(hideChrome, session);
  setActiveNav(route.active || '');

  app.innerHTML = route.render();
  if (typeof route.mount === 'function') {
    await route.mount(app);
  }
  if (token !== renderToken) return;

  if (pageKey === 'home' && session) {
    document.title = `Map · ${getAppName()}`;
  }

  hideBootSplash();
  document.dispatchEvent(new CustomEvent('ormocgo:page', { detail: { page: pageKey, session } }));
}

function bindAuthListener() {
  if (authBound) return;
  authBound = true;

  getSupabase().then((supabase) => {
    if (!supabase) return;
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        render();
      }
    });
  });
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
  try {
    await loadEnv();
    applyPwaMeta();
    registerServiceWorker();
    await getSupabase();
    bindAuthListener();
    await render();
  } catch (err) {
    console.error('[OrmocGo] Boot failed', err);
    hideBootSplash();
    if (app && !app.innerHTML) {
      app.innerHTML = '<div class="page-loading">Could not load OrmocGo. Please refresh.</div>';
    }
  }
}

boot();
