import { getAppName } from '../env.js';

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <p>&copy; ${year} ${getAppName()}</p>
    </footer>
  `;
}
