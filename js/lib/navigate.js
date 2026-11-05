export function goToPage(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  url.hash = '';
  history.pushState({ page }, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
