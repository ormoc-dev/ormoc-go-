import { getAppName } from '../env.js';

export function renderSidebar(session = null) {
  const name = getAppName();
  const signedIn = Boolean(session?.user);

  return `
    <aside class="sidebar" id="sidebar" aria-label="Sidebar">
      <div class="sidebar-brand">
        <img src="public/assets/icons/logo.png" alt="${name}" class="brand-logo" width="40" height="40">
        <span>${name}</span>
      </div>
      <nav class="sidebar-nav">
        <a href="?page=home" data-page="home" data-nav="home">Dashboard</a>
        ${signedIn
          ? '<button type="button" class="btn btn-ghost sidebar-signout" data-signout>Sign out</button>'
          : `
            <a href="?page=login" data-page="login" data-nav="login">Sign in</a>
            <a href="?page=signup" data-page="signup" data-nav="signup">Sign up</a>
          `}
      </nav>
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">Menu</button>
    </aside>
  `;
}

export function bindSidebar(root = document) {
  const sidebar = root.querySelector('#sidebar') || document.getElementById('sidebar');
  const toggle = root.querySelector('#sidebar-toggle') || document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle || toggle.dataset.bound === '1') return;

  toggle.dataset.bound = '1';
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
  });
}
