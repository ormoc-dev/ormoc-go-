import { ormocSlides } from '../data/ormoc-slides.js';

export function renderOrmocSlider() {
  const slides = ormocSlides
    .map(
      (slide, index) => `
        <div class="ormoc-slide${index === 0 ? ' is-active' : ''}" data-slide="${index}">
          <img src="${slide.src}" alt="${slide.alt}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
        </div>
      `
    )
    .join('');

  const dots = ormocSlides
    .map(
      (_, index) => `
        <button
          type="button"
          class="ormoc-dot${index === 0 ? ' is-active' : ''}"
          data-dot="${index}"
          aria-label="Show Ormoc photo ${index + 1}"
        ></button>
      `
    )
    .join('');

  return `
    <div class="ormoc-slider" id="ormoc-slider" aria-roledescription="carousel" aria-label="Photos of Ormoc">
      <div class="ormoc-slider-track">
        ${slides}
      </div>
      <div class="ormoc-slider-fade" aria-hidden="true"></div>

      <div class="ormoc-slider-brand" style="position:absolute;top:auto;left:1.15rem;right:auto;bottom:2.15rem;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:0;pointer-events:none;">
        <div class="welcome-brand" aria-label="OrmocGo" style="display:flex;flex-direction:row;align-items:center;gap:0.15rem;margin:0;">
          <img
            src="public/assets/icons/ormoc_banner.png"
            alt=""
            class="welcome-brand-img"
            width="112"
            height="26"
            style="width:112px;max-width:38vw;height:auto;display:block;background:transparent;border:0;box-shadow:none;"
          >
          <span class="welcome-brand-go" style="color:#fff;font-weight:700;font-size:1.55rem;line-height:1;letter-spacing:-0.05em;">Go</span>
        </div>
      </div>

      <div class="ormoc-dots" role="tablist" aria-label="Slide controls">
        ${dots}
      </div>
    </div>
  `;
}

export function mountOrmocSlider(root = document) {
  const slider = root.querySelector('#ormoc-slider') || document.getElementById('ormoc-slider');
  if (!slider || slider.dataset.bound === '1') return;
  slider.dataset.bound = '1';

  const slides = [...slider.querySelectorAll('.ormoc-slide')];
  const dots = [...slider.querySelectorAll('.ormoc-dot')];
  if (!slides.length) return;

  let index = 0;
  let timer = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  }

  function start() {
    if (reduceMotion || slides.length < 2) return;
    stop();
    timer = window.setInterval(() => show(index + 1), 4200);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      show(Number(dot.dataset.dot));
      start();
    });
  });

  let touchStartX = 0;
  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    stop();
  }, { passive: true });

  slider.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    start();
  }, { passive: true });

  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);

  start();
}
