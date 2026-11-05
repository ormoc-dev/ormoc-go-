import { renderHome, mountHome } from './views/home.js';
import { renderLogin, mountLogin } from './views/login.js';
import { renderSignup, mountSignup } from './views/signup.js';
import { renderNotFound, mountNotFound } from './views/not-found.js';

export { getAppName } from './env.js';

export const APP_BASE = '.';

/** JS view modules — pages are rendered in JS, not HTML view files. */
export const routes = {
  home: {
    title: 'Welcome',
    active: 'home',
    hideChrome: true,
    css: ['public/css/home.css'],
    render: renderHome,
    mount: mountHome,
  },
  login: {
    title: 'Sign in',
    active: 'login',
    hideChrome: true,
    css: ['public/css/auth/auth.css'],
    render: renderLogin,
    mount: mountLogin,
  },
  signup: {
    title: 'Sign up',
    active: 'signup',
    hideChrome: true,
    css: ['public/css/auth/auth.css'],
    render: renderSignup,
    mount: mountSignup,
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
