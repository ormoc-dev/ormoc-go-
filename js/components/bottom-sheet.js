import {
  loginFormHtml,
  signupFormHtml,
  bindLoginForm,
  bindSignupForm,
} from '../lib/auth-forms.js';

export function renderBottomSheets() {
  return `
    <div class="sheet-root" id="sheet-root" hidden>
      <button type="button" class="sheet-backdrop" data-sheet-close aria-label="Close"></button>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="sheet-handle" aria-hidden="true"></div>
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
        <li><strong>Help Center</strong> <span class="sheet-soon">Coming soon</span> — Quick access to emergency hotlines and essential numbers.</li>
        <li><strong>Disaster Assistance</strong> <span class="sheet-soon">Coming soon</span> — Updates and support when calamities hit.</li>
      </ul>
      <p class="sheet-desc">We're sharing an early preview for feedback and contributions — from UI/UX ideas to features every Ormocanon should have.</p>
      <p class="sheet-desc">This is a community project, 100% non-profit and ad-free. No subscriptions, no paywalls — just a genuine effort to make living in Ormoc smarter and easier.</p>
    `,
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

  function openSheet(key) {
    const sheet = sheets[key];
    if (!sheet) return;
    titleEl.textContent = sheet.title;
    bodyEl.innerHTML = typeof sheet.html === 'function' ? sheet.html() : sheet.html;
    sheetRoot.classList.toggle('is-auth', Boolean(sheet.auth));
    if (panelEl) panelEl.classList.toggle('is-auth', Boolean(sheet.auth));
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
    if (panelEl) panelEl.classList.remove('is-auth');
    document.body.classList.remove('sheet-open');
    window.setTimeout(() => {
      if (!sheetRoot.classList.contains('is-open')) {
        sheetRoot.hidden = true;
        bodyEl.innerHTML = '';
      }
    }, 220);
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
  }

  if (initialSheet) {
    requestAnimationFrame(() => openSheet(initialSheet));
  }
}
