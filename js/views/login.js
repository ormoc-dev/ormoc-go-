import { getSupabase } from '../supabase.js';
import { goToPage } from '../lib/navigate.js';
import { googleIconSvg, bindGoogleButton } from '../lib/google-button.js';
import { passwordFieldHtml, bindPasswordToggles } from '../lib/password-field.js';

export function renderLogin() {
  return `
    <section class="auth" aria-label="Sign in">
      <div class="auth-sky" aria-hidden="true">
        <div class="auth-orb auth-orb--a"></div>
        <div class="auth-orb auth-orb--b"></div>
      </div>

      <div class="auth-panel">
        <div class="auth-panel-inner">
          <a class="auth-back" href="?page=home" data-page="home" aria-label="Back to welcome">
            <span class="auth-back-icon" aria-hidden="true">←</span>
            <span>Back</span>
          </a>

          <p class="auth-eyebrow">Sign in</p>
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-copy">Continue exploring Ormoc details and local guides.</p>

          <form class="auth-form" id="login-form" novalidate>
            <label class="field">
              <span>Email</span>
              <input type="email" name="email" autocomplete="username" placeholder="you@email.com" required>
            </label>

            ${passwordFieldHtml({
              label: 'Password',
              name: 'password',
              placeholder: 'Your password',
              autocomplete: 'current-password',
            })}

            <p class="form-error" id="login-error" hidden></p>

            <button class="btn btn-primary auth-submit" type="submit">Sign in</button>
          </form>

          <div class="auth-divider" aria-hidden="true"><span>or</span></div>

          <button type="button" class="btn btn-google" id="login-google">
            ${googleIconSvg}
            <span>Continue with Google</span>
          </button>

          <p class="auth-switch">
            New here?
            <a href="?page=signup" data-page="signup">Create an account</a>
          </p>
        </div>
      </div>
    </section>
  `;
}

export function mountLogin(root = document) {
  const section = root.querySelector('.auth') || document.querySelector('.auth');
  if (section) requestAnimationFrame(() => section.classList.add('is-ready'));

  bindPasswordToggles(root);
  bindGoogleButton(root, 'login-google', 'login-error');

  const form = root.querySelector('#login-form') || document.getElementById('login-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('login-error');
    const submit = form.querySelector('[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Email and password are required.';
      }
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Signing in…';
    }

    try {
      const supabase = await getSupabase();
      if (!supabase) {
        if (error) {
          error.hidden = false;
          error.textContent = 'Supabase is not configured yet. Update .env / .env.production.';
        }
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (error) {
          error.hidden = false;
          error.textContent = authError.message;
        }
        return;
      }

      goToPage('home');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Sign in';
      }
    }
  });
}
