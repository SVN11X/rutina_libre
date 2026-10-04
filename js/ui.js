import { altImage } from './data.js';
import { LEVELS } from './i18n.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Íconos simples en línea. Todos llevan aria-hidden porque el botón ya tiene texto o etiqueta.
const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  video: '<path d="M3 6h12v12H3zM15 10l6-3v10l-6-3"/>',
  translate: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-7 9M13 21l4-9 4 9M14.5 18h5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] ?? ''}</svg>`;
}

export function plate(level, withText = true) {
  const key = level || 'none';
  const text = LEVELS[level] ?? 'Nivel no indicado';
  return `<span class="plate-tag plate-tag--${key}"><span class="plate" aria-hidden="true"></span>${withText ? esc(text) : `<span class="visually-hidden">${esc(text)}</span>`}</span>`;
}

export function img(url, alt, { cls = '', eager = false, w = 450, h = 300 } = {}) {
  if (!url) return '';
  const fb = altImage(url);
  // Las imágenes de GitHub permiten CORS. Así se pueden guardar para uso sin conexión y usar en el PDF.
  const cors = /^https:\/\/(raw\.githubusercontent\.com|cdn\.jsdelivr\.net)\//.test(url) ? ' crossorigin="anonymous"' : '';
  return `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${cors}${fb ? ` data-fallback="${esc(fb)}"` : ''}>`;
}

// Primera imagen disponible de un ejercicio, o el GIF si no tiene fotos.
export function thumbOf(ex) {
  return ex.images?.[0] || ex.gif || '';
}

export function placeholder(ex) {
  const letter = (ex.title || '?').trim().charAt(0).toUpperCase();
  return `<div class="ph" aria-hidden="true"><span>${esc(letter)}</span></div>`;
}

// Si una imagen falla se intenta el respaldo. Si también falla se oculta con elegancia.
export function installImageFallback() {
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLImageElement)) return;
      if (el.dataset.fallback && el.src !== el.dataset.fallback) {
        el.src = el.dataset.fallback;
        delete el.dataset.fallback;
      } else {
        el.classList.add('is-broken');
      }
    },
    true,
  );
}

let toastTimer;
export function toast(msg, { action, onAction, duration = 5000 } = {}) {
  const region = document.getElementById('toast');
  if (!region) return;
  region.innerHTML = `<div class="toast__inner"><span>${esc(msg)}</span>${action ? `<button type="button" class="toast__btn">${esc(action)}</button>` : ''}</div>`;
  region.classList.add('is-visible');
  if (action) {
    region.querySelector('.toast__btn').addEventListener('click', () => {
      onAction?.();
      hideToast();
    });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, duration);
}

function hideToast() {
  const region = document.getElementById('toast');
  region?.classList.remove('is-visible');
}

// Navega a una ruta. Si ya estamos en ella, la vuelve a dibujar.
export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

// Ruta anterior, para que "Volver" mantenga la búsqueda y la posición.
export const nav = { prev: null, current: null };

export function setTitle(t) {
  document.title = t ? `${t} | Rutina Libre` : 'Rutina Libre';
}
