import { getAppName } from '../env.js';

export function renderHeader(session = null) {
  const name = getAppName();
  const signedIn = Boolean(session?.user);

  return `
    <header class="topbar">
      <div class="topbar-brand">
        <img src="public/assets/icons/logo.png" alt="${name}" class="brand-logo" width="36" height="36">
        <span>${name}</span>
      </div>
      <nav class="topbar-nav" aria-label="Primary">
        <a href="?page=home" data-page="home" data-nav="home">${signedIn ? 'Dashboard' : 'Home'}</a>
        ${signedIn
          ? '<button type="button" class="btn btn-ghost topbar-signout" data-signout>Sign out</button>'
          : `
            <a href="?page=login" data-page="login" data-nav="login">Sign in</a>
            <a href="?page=signup" data-page="signup" data-nav="signup">Sign up</a>
          `}
      </nav>
    </header>
  `;
}
