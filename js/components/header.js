import { getAppName } from '../env.js';

export function renderHeader() {
  const name = getAppName();
  return `
    <header class="topbar">
      <div class="topbar-brand">
        <img src="public/assets/icons/logo.jpg" alt="${name}" class="brand-logo" width="36" height="36">
        <span>${name}</span>
      </div>
      <nav class="topbar-nav" aria-label="Primary">
        <a href="?page=home" data-page="home" data-nav="home">Home</a>
        <a href="?page=login" data-page="login" data-nav="login">Sign in</a>
        <a href="?page=signup" data-page="signup" data-nav="signup">Sign up</a>
      </nav>
    </header>
  `;
}
