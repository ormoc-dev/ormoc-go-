import { getAppName } from '../env.js';
import { getSupabase } from '../supabase.js';
import { goToPage } from '../lib/navigate.js';
import { googleIconSvg, bindGoogleButton } from '../lib/google-button.js';
import { passwordFieldHtml, bindPasswordToggles } from '../lib/password-field.js';

export function renderSignup() {
  const name = getAppName();
  return `
    <section class="auth" aria-label="Sign up">
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

          <p class="auth-eyebrow">Join ${name}</p>
          <h1 class="auth-title">Create account</h1>
          <p class="auth-copy">Join the OrmocGo community city guide.</p>

          <form class="auth-form" id="signup-form" novalidate>
            <label class="field">
              <span>Full name</span>
              <input type="text" name="full_name" autocomplete="name" placeholder="Juan Dela Cruz" required>
            </label>

            <label class="field">
              <span>Email</span>
              <input type="email" name="email" autocomplete="email" placeholder="you@email.com" required>
            </label>

            <div class="field-row">
              ${passwordFieldHtml({
                label: 'Password',
                name: 'password',
                placeholder: 'Min. 6 chars',
                autocomplete: 'new-password',
                minlength: 6,
              })}
              ${passwordFieldHtml({
                label: 'Confirm',
                name: 'confirm_password',
                placeholder: 'Repeat',
                autocomplete: 'new-password',
                minlength: 6,
              })}
            </div>

            <p class="form-error" id="signup-error" hidden></p>
            <p class="form-success" id="signup-success" hidden></p>

            <button class="btn btn-primary auth-submit" type="submit">Create account</button>
          </form>

          <div class="auth-divider" aria-hidden="true"><span>or</span></div>

          <button type="button" class="btn btn-google" id="signup-google">
            ${googleIconSvg}
            <span>Continue with Google</span>
          </button>

          <p class="auth-switch">
            Already have an account?
            <a href="?page=login" data-page="login">Sign in</a>
          </p>
        </div>
      </div>
    </section>
  `;
}

export function mountSignup(root = document) {
  const section = root.querySelector('.auth') || document.querySelector('.auth');
  if (section) requestAnimationFrame(() => section.classList.add('is-ready'));

  bindPasswordToggles(root);
  bindGoogleButton(root, 'signup-google', 'signup-error');

  const form = root.querySelector('#signup-form') || document.getElementById('signup-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.getElementById('signup-error');
    const success = document.getElementById('signup-success');
    const submit = form.querySelector('[type="submit"]');

    const fullName = form.full_name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirm_password.value;

    if (error) error.hidden = true;
    if (success) success.hidden = true;

    if (!fullName || !email || !password || !confirmPassword) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Please fill in all fields.';
      }
      return;
    }

    if (password.length < 6) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Password must be at least 6 characters.';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Passwords do not match.';
      }
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Creating account…';
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

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) {
        if (error) {
          error.hidden = false;
          error.textContent = authError.message;
        }
        return;
      }

      if (data.session) {
        goToPage('home');
        return;
      }

      if (success) {
        success.hidden = false;
        success.textContent = 'Account created. Check your email to confirm, then sign in.';
      }
      form.reset();
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Create account';
      }
    }
  });
}
