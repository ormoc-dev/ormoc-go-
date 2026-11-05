const eyeOpen = `
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="currentColor" d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-2.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z"/>
  </svg>
`;

const eyeOff = `
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="currentColor" d="M3.1 2.3 1.9 3.5l3.1 3.1C3.2 8 1.7 9.8 1 12c1.7 3.9 6 7 11 7 1.7 0 3.3-.4 4.7-1l3.2 3.2 1.2-1.2L3.1 2.3zM12 17c-3.7 0-6.9-2-8.6-5 .7-1.3 1.8-2.5 3.1-3.3l1.7 1.7A4.5 4.5 0 0 0 12 16.5V17zm2.8-2.8-1.5-1.5-.1.3a2.3 2.3 0 0 1-2.7 1.7l-.4.1 1.6 1.6c1 .0 1.9-.4 2.6-.9l.5-.3zM8.7 6.5l1.6 1.6A4.5 4.5 0 0 1 16.5 12l.1-.4 1.8 1.8c1-.7 1.9-1.6 2.5-2.4C19 9 15.7 7 12 7c-1.1 0-2.2.2-3.3.5z"/>
  </svg>
`;

export function passwordFieldHtml({
  label,
  name,
  placeholder,
  autocomplete = 'current-password',
  required = true,
  minlength = null,
}) {
  const req = required ? 'required' : '';
  const min = minlength ? `minlength="${minlength}"` : '';
  return `
    <label class="field field-password">
      <span>${label}</span>
      <span class="password-wrap">
        <input
          type="password"
          name="${name}"
          autocomplete="${autocomplete}"
          placeholder="${placeholder}"
          ${req}
          ${min}
        >
        <button
          type="button"
          class="password-toggle"
          aria-label="Show password"
          aria-pressed="false"
          data-password-toggle
        >
          ${eyeOpen}
        </button>
      </span>
    </label>
  `;
}

export function bindPasswordToggles(root = document) {
  const buttons = root.querySelectorAll('[data-password-toggle]');
  buttons.forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const wrap = btn.closest('.password-wrap');
      const input = wrap ? wrap.querySelector('input') : null;
      if (!input) return;

      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      btn.innerHTML = showing ? eyeOpen : eyeOff;
      input.focus();
    });
  });
}
