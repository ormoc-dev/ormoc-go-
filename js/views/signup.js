import { getAppName } from '../env.js';
import { getSupabase } from '../supabase.js';
import { goToPage } from '../lib/navigate.js';

export function renderSignup() {
  const name = getAppName();
  return `
    <section class="auth" aria-label="Sign up">
      <div class="auth-sky" aria-hidden="true">
        <div class="auth-orb auth-orb--a"></div>
        <div class="auth-orb auth-orb--b"></div>
        <div class="auth-glow"></div>
      </div>

      <div class="auth-panel">
        <a class="auth-back" href="?page=home" data-page="home">Back</a>

        <h1 class="auth-title">Create your account</h1>
        <p class="auth-copy">Join ${name} and start moving around Ormoc in minutes.</p>

        <form class="auth-form" id="signup-form" novalidate>
          <label class="field">
            <span>Full name</span>
            <input type="text" name="full_name" autocomplete="name" placeholder="Juan Dela Cruz" required>
          </label>

          <label class="field">
            <span>Email</span>
            <input type="email" name="email" autocomplete="email" placeholder="you@email.com" required>
          </label>

          <label class="field">
            <span>Password</span>
            <input type="password" name="password" autocomplete="new-password" placeholder="At least 6 characters" minlength="6" required>
          </label>

          <label class="field">
            <span>Confirm password</span>
            <input type="password" name="confirm_password" autocomplete="new-password" placeholder="Repeat password" minlength="6" required>
          </label>

          <p class="form-error" id="signup-error" hidden></p>
          <p class="form-success" id="signup-success" hidden></p>

          <button class="btn btn-primary auth-submit" type="submit">Create account</button>
        </form>

        <p class="auth-switch">
          Already have an account?
          <a href="?page=login" data-page="login">Sign in</a>
        </p>
      </div>
    </section>
  `;
}

export function mountSignup(root = document) {
  const section = root.querySelector('.auth') || document.querySelector('.auth');
  if (section) requestAnimationFrame(() => section.classList.add('is-ready'));

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
