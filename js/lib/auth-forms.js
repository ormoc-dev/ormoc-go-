import { getAppName } from '../env.js';
import { getSupabase } from '../supabase.js';
import { goToPage } from './navigate.js';
import { googleIconSvg, bindGoogleButton } from './google-button.js';
import { passwordFieldHtml, bindPasswordToggles } from './password-field.js';

export function loginFormHtml() {
  return `
    <div class="auth-sheet is-ready">
      <p class="auth-eyebrow">Sign in</p>
      <h3 class="auth-title">Welcome back</h3>
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
        <button type="button" class="auth-switch-link" data-sheet="signup">Create an account</button>
      </p>
    </div>
  `;
}

export function signupFormHtml() {
  const name = getAppName();
  return `
    <div class="auth-sheet is-ready">
      <p class="auth-eyebrow">Join ${name}</p>
      <h3 class="auth-title">Create account</h3>
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
        <button type="button" class="auth-switch-link" data-sheet="login">Sign in</button>
      </p>
    </div>
  `;
}

export function bindLoginForm(root = document) {
  bindPasswordToggles(root);
  bindGoogleButton(root, 'login-google', 'login-error');

  const form = root.querySelector('#login-form') || document.getElementById('login-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = root.querySelector('#login-error') || document.getElementById('login-error');
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

export function bindSignupForm(root = document) {
  bindPasswordToggles(root);
  bindGoogleButton(root, 'signup-google', 'signup-error');

  const form = root.querySelector('#signup-form') || document.getElementById('signup-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = root.querySelector('#signup-error') || document.getElementById('signup-error');
    const success = root.querySelector('#signup-success') || document.getElementById('signup-success');
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
