import { getAppName } from '../env.js';
import { getSupabase } from '../supabase.js';
import { goToPage } from '../lib/navigate.js';

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

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function renderDashboard(user) {
  const name = displayName(user);
  const email = user?.email || '';
  const app = getAppName();

  return `
    <section class="dashboard" aria-label="Dashboard">
      <div class="dashboard-hero">
        <div class="dashboard-identity">
          <div class="dashboard-avatar" aria-hidden="true">${initials(name)}</div>
          <div>
            <p class="dashboard-eyebrow">Dashboard</p>
            <h1 class="dashboard-title">Welcome back, ${escapeHtml(name)}</h1>
            <p class="dashboard-copy">${email ? escapeHtml(email) : `You're signed in to ${escapeHtml(app)}.`}</p>
          </div>
        </div>
        <button type="button" class="btn btn-ghost dashboard-signout" id="dashboard-signout">Sign out</button>
      </div>

      <div class="dashboard-grid" role="list">
        <article class="dashboard-tile" role="listitem">
          <h2>Places</h2>
          <p>Browse local spots and city landmarks around Ormoc.</p>
          <span class="dashboard-tile-note">Coming soon</span>
        </article>
        <article class="dashboard-tile" role="listitem">
          <h2>Guides</h2>
          <p>Useful tips for residents, visitors, and new arrivals.</p>
          <span class="dashboard-tile-note">Coming soon</span>
        </article>
        <article class="dashboard-tile" role="listitem">
          <h2>Tools</h2>
          <p>City helpers and community resources in one place.</p>
          <span class="dashboard-tile-note">Coming soon</span>
        </article>
      </div>
    </section>
  `;
}

export function mountDashboard(root = document) {
  const btn = root.querySelector('#dashboard-signout') || document.getElementById('dashboard-signout');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Signing out…';
    try {
      const supabase = await getSupabase();
      if (supabase) await supabase.auth.signOut();
      goToPage('home');
    } catch (_) {
      btn.disabled = false;
      btn.textContent = 'Sign out';
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
