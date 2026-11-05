export function renderNotFound() {
  return `
    <section class="page page-error">
      <h1>Page not found</h1>
      <p class="lede">That route is not registered yet.</p>
      <a class="btn btn-primary" href="?page=home" data-page="home">Go home</a>
    </section>
  `;
}

export function mountNotFound() {}
