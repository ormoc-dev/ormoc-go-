import { renderHome, mountHome } from './views/home.js';
import { renderNotFound, mountNotFound } from './views/not-found.js';

export { getAppName } from './env.js';

export const APP_BASE = '.';

/** JS view modules — pages are rendered in JS, not HTML view files. */
export const routes = {
  home: {
    title: 'Welcome',
    active: 'home',
    hideChrome: true,
    css: ['public/css/home.css', 'public/css/auth/auth.css'],
    render: renderHome,
    mount: mountHome,
  },
  login: {
    title: 'Sign in',
    active: 'home',
    hideChrome: true,
    css: ['public/css/home.css', 'public/css/auth/auth.css'],
    render: renderHome,
    mount: (root) => mountHome(root, { openSheet: 'login' }),
  },
  signup: {
    title: 'Sign up',
    active: 'home',
    hideChrome: true,
    css: ['public/css/home.css', 'public/css/auth/auth.css'],
    render: renderHome,
    mount: (root) => mountHome(root, { openSheet: 'signup' }),
  },
  '404': {
    title: 'Not found',
    active: '',
    css: [],
    render: renderNotFound,
    mount: mountNotFound,
  },
};

export const defaultPage = 'home';
