import {
  loginFormHtml,
  signupFormHtml,
  bindLoginForm,
  bindSignupForm,
} from '../lib/auth-forms.js';
import { ORMOC_ARCHIVE, ORMOC_ARCHIVE_SOURCE } from '../data/ormoc-archive.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function heritageArchiveHtml() {
  const cards = ORMOC_ARCHIVE.map((item) => {
    const title = escapeHtml(item.title);
    const caption = escapeHtml(item.caption);
    const src = escapeHtml(item.src);
    return `
      <figure class="archive-card">
        <img class="archive-card-img" src="${src}" alt="${title}" loading="lazy" decoding="async" width="640" height="480">
        <figcaption class="archive-card-caption">
          <strong>${title}</strong>
          ${caption ? `<span>${caption}</span>` : ''}
        </figcaption>
      </figure>
    `;
  }).join('');

  return `
    <p class="sheet-lead">Historical photographs preserving Ormoc City's heritage.</p>
    <div class="archive-grid" role="list">
      ${cards}
    </div>
    <p class="sheet-desc archive-credit">
      Source:
      <a class="sheet-credit-link" href="${escapeHtml(ORMOC_ARCHIVE_SOURCE.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ORMOC_ARCHIVE_SOURCE.label)}</a>
    </p>
  `;
}

export function renderBottomSheets() {
  return `
    <div class="sheet-root" id="sheet-root" hidden>
      <button type="button" class="sheet-backdrop" data-sheet-close aria-label="Close"></button>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="sheet-drag" data-sheet-drag>
          <div class="sheet-handle" aria-hidden="true"></div>
        </div>
        <div class="sheet-header">
          <h2 class="sheet-title" id="sheet-title"></h2>
          <button type="button" class="sheet-close" data-sheet-close aria-label="Close">Close</button>
        </div>
        <div class="sheet-body" id="sheet-body"></div>
      </div>
    </div>
  `;
}

const sheets = {
  inside: {
    title: "What's inside",
    auth: false,
    html: `
      <p class="sheet-lead">OrmocGo is a city guide for Ormocanos and tourists.</p>
      <ul class="sheet-list">
        <li><strong>Discover Ormoc</strong> — Explore places, local shops, and must-try food spots around the city.</li>
        <li><strong>Get Around</strong> — Helpful details for local transport and finding your way in Ormoc.</li>
        <li><strong>Photo Archive</strong> — Historical photographs preserving Ormoc City's heritage.</li>
        <li><strong>Help Center</strong> <span class="sheet-soon">Coming soon</span> — Quick access to emergency hotlines and essential numbers.</li>
        <li><strong>Disaster Assistance</strong> <span class="sheet-soon">Coming soon</span> — Updates and support when calamities hit.</li>
      </ul>
      <p class="sheet-desc">We're sharing an early preview for feedback and contributions — from UI/UX ideas to features every Ormocanon should have.</p>
      <p class="sheet-desc">This is a community project, 100% non-profit and ad-free. No subscriptions, no paywalls — just a genuine effort to make living in Ormoc smarter and easier.</p>
    `,
  },
  heritage: {
    title: 'Photo Archive',
    auth: false,
    tall: true,
    html: () => heritageArchiveHtml(),
  },
  support: {
    title: 'Support',
    auth: false,
    html: `
      <p class="sheet-lead">Need help with OrmocGo?</p>
      <a class="sheet-email" href="mailto:anthony.capuyan23@gmail.com">anthony.capuyan23@gmail.com</a>
      <p class="sheet-tagline">gawang ormocanon</p>
      <p class="sheet-desc">OrmocGo is built by an Ormocanon for Ormoc — a homegrown city guide with useful local details.</p>
      <p class="sheet-desc">Message us for account help, feature ideas, content suggestions, or app feedback. We usually reply through email as soon as we can.</p>
      <p class="sheet-desc">Salamat for supporting a community project made for Ormocanos.</p>
    `,
  },
  terms: {
    title: 'Terms & Condition',
    auth: false,
    html: `
      <p>OrmocGo provides local information and community tools for Ormoc.</p>
      <p>You agree to use the app respectfully and lawfully. You are responsible for the accuracy of your account details.</p>
      <p>Information in the app is for guidance only and may change. Always verify critical details such as emergency numbers and official advisories.</p>
      <p>OrmocGo is a non-profit community project and may update these terms as the service grows. Continued use means you accept the latest version.</p>
      <p>For concerns, contact anthony.capuyan23@gmail.com.</p>
    `,
  },
  login: {
    title: 'Sign in',
    auth: true,
    html: () => loginFormHtml(),
  },
  signup: {
    title: 'Create account',
    auth: true,
    html: () => signupFormHtml(),
  },
};

let openSheetFn = null;

export function openAuthSheet(key) {
  if (typeof openSheetFn === 'function') openSheetFn(key);
}

export function mountBottomSheets(root = document, { openSheet: initialSheet = null } = {}) {
  const sheetRoot = root.querySelector('#sheet-root') || document.getElementById('sheet-root');
  if (!sheetRoot) return;

  const titleEl = sheetRoot.querySelector('#sheet-title');
  const bodyEl = sheetRoot.querySelector('#sheet-body');
  const panelEl = sheetRoot.querySelector('.sheet-panel');
  const dragEl = sheetRoot.querySelector('[data-sheet-drag]');

  function sheetHeights() {
    const vh = window.innerHeight || 700;
    const max = Math.round(Math.min(vh * 0.96, vh - 24));
    const mid = Math.round(Math.min(vh * (panelEl?.classList.contains('is-auth') ? 0.72 : 0.58), 560));
    const min = Math.round(Math.min(vh * 0.34, 280));
    return { min, mid, max };
  }

  function setSheetHeight(px, { expanded = false } = {}) {
    if (!panelEl) return;
    const { max, min } = sheetHeights();
    const next = Math.min(max, Math.max(min, Math.round(px)));
    panelEl.style.setProperty('--sheet-h', `${next}px`);
    panelEl.classList.toggle('is-expanded', expanded || next > sheetHeights().mid + 40);
  }

  function resetSheetHeight() {
    if (!panelEl) return;
    panelEl.classList.remove('is-dragging', 'is-expanded');
    panelEl.style.removeProperty('--sheet-h');
  }

  function openSheet(key) {
    const sheet = sheets[key];
    if (!sheet) return;
    titleEl.textContent = sheet.title;
    bodyEl.innerHTML = typeof sheet.html === 'function' ? sheet.html() : sheet.html;
    sheetRoot.classList.toggle('is-auth', Boolean(sheet.auth));
    if (panelEl) {
      panelEl.classList.toggle('is-auth', Boolean(sheet.auth));
      resetSheetHeight();
      if (sheet.tall) {
        const { max } = sheetHeights();
        setSheetHeight(max, { expanded: true });
      }
    }
    sheetRoot.hidden = false;
    requestAnimationFrame(() => sheetRoot.classList.add('is-open'));
    document.body.classList.add('sheet-open');

    if (key === 'login') bindLoginForm(bodyEl);
    if (key === 'signup') bindSignupForm(bodyEl);

    bodyEl.querySelectorAll('[data-sheet]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openSheet(trigger.getAttribute('data-sheet'));
      });
    });
  }

  function closeSheet() {
    sheetRoot.classList.remove('is-open');
    sheetRoot.classList.remove('is-auth');
    if (panelEl) {
      panelEl.classList.remove('is-auth');
      resetSheetHeight();
    }
    document.body.classList.remove('sheet-open');
    window.setTimeout(() => {
      if (!sheetRoot.classList.contains('is-open')) {
        sheetRoot.hidden = true;
        bodyEl.innerHTML = '';
      }
    }, 220);
  }

  function bindSheetDrag() {
    if (!panelEl || !dragEl || dragEl.dataset.dragBound === '1') return;
    dragEl.dataset.dragBound = '1';

    let dragging = false;
    let startY = 0;
    let startH = 0;
    let pointerId = null;

    const onMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const { max, min } = sheetHeights();
      // Drag up (smaller clientY) grows the sheet
      const nextH = Math.min(max, Math.max(min * 0.55, startH + (startY - event.clientY)));
      setSheetHeight(nextH, { expanded: nextH > sheetHeights().mid + 36 });
    };

    const onUp = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      panelEl.classList.remove('is-dragging');
      try {
        dragEl.releasePointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
      pointerId = null;

      const currentH = panelEl.getBoundingClientRect().height;
      const { mid, max, min } = sheetHeights();
      const dismissAt = Math.min(min * 0.85, startH - 72);

      if (currentH <= dismissAt) {
        closeSheet();
        return;
      }
      if (currentH >= (mid + max) / 2) {
        setSheetHeight(max, { expanded: true });
        return;
      }
      resetSheetHeight();
    };

    dragEl.addEventListener('pointerdown', (event) => {
      if (event.button != null && event.button !== 0) return;
      if (!sheetRoot.classList.contains('is-open')) return;
      dragging = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      startH = panelEl.getBoundingClientRect().height;
      panelEl.classList.add('is-dragging');
      panelEl.style.setProperty('--sheet-h', `${Math.round(startH)}px`);
      dragEl.setPointerCapture(pointerId);
      event.preventDefault();
    });

    dragEl.addEventListener('pointermove', onMove);
    dragEl.addEventListener('pointerup', onUp);
    dragEl.addEventListener('pointercancel', onUp);
  }

  openSheetFn = openSheet;

  if (sheetRoot.dataset.bound !== '1') {
    sheetRoot.dataset.bound = '1';

    root.querySelectorAll('[data-sheet]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openSheet(trigger.getAttribute('data-sheet'));
      });
    });

    sheetRoot.querySelectorAll('[data-sheet-close]').forEach((btn) => {
      btn.addEventListener('click', closeSheet);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheetRoot.classList.contains('is-open')) closeSheet();
    });

    bindSheetDrag();
  }

  if (initialSheet) {
    requestAnimationFrame(() => openSheet(initialSheet));
  }
}
