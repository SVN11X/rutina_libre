import { loadData } from './data.js';
import { renderCatalog, card, wireCardHover, wireSaveButtons } from './catalog.js';
import { renderDetail } from './detail.js';
import { renderRoutine } from './routine.js';
import { esc, setTitle, installImageFallback, nav, $ } from './ui.js';
import { saved, routineStore, onChange } from './store.js';

const main = document.getElementById('main');
let cleanup = null;
let firstRender = true;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(qs || '') };
}

async function renderSaved(view) {
  const data = await loadData();
  setTitle('Guardados');
  const list = saved.all().map((id) => data.byId.get(id)).filter(Boolean);
  view.innerHTML = `<div class="wrap page">
    <header class="page__head">
      <h1 tabindex="-1">Guardados</h1>
      <p class="lead">${list.length ? `Tienes ${list.length} ${list.length === 1 ? 'ejercicio guardado' : 'ejercicios guardados'} en este navegador.` : 'Aún no guardas ejercicios.'}</p>
    </header>
    ${list.length
      ? `<ul class="grid" role="list">${list.map(card).join('')}</ul>`
      : `<div class="empty"><p>Toca el marcador de cualquier ejercicio para tenerlo a mano aquí. Se guarda solo en este navegador.</p><a class="btn btn--primary" href="#/">Explorar ejercicios</a></div>`}
  </div>`;
  const g = $('.grid', view);
  if (g) { wireCardHover(g); wireSaveButtons(g); }
}

async function renderAbout(view) {
  const data = await loadData();
  setTitle('Fuentes y licencias');
  const src = Object.fromEntries((data.meta.sources || []).map((s) => [s.id, s]));
  const n = (id) => (src[id]?.count ? `${src[id].count.toLocaleString('es-CL')} ejercicios` : 'no incluida en esta versión');
  const date = data.meta.generated ? new Date(data.meta.generated).toLocaleDateString('es-CL', { dateStyle: 'long' }) : null;
  view.innerHTML = `<div class="wrap page prose">
    <h1 tabindex="-1">De dónde viene la información</h1>
    <p class="lead">Rutina Libre junta datos abiertos y gratuitos. No usa cuentas ni guarda nada fuera de tu navegador.${date ? ` Los datos se actualizaron el ${esc(date)}.` : ''}</p>

    <h2>Free Exercise DB</h2>
    <p>La base principal. Trae nombre, nivel, equipo, músculos, instrucciones y dos fotos por ejercicio, una en la posición inicial y otra en la final. Es de dominio público. En esta versión: ${n('fedb')}.</p>
    <p><a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">github.com/yuhonas/free-exercise-db</a></p>

    <h2>wger</h2>
    <p>Proyecto libre de entrenamiento con una API pública. Aporta nombres y descripciones en español escritas por la comunidad, videos y ejercicios extra. Sus textos e imágenes usan licencias Creative Commons y se muestra el autor cuando está disponible. En esta versión: ${n('wger')}.</p>
    <p><a href="https://wger.de" target="_blank" rel="noopener">wger.de</a></p>

    <h2>ExerciseDB</h2>
    <p>API gratuita con animaciones en GIF de cada movimiento. Las animaciones se muestran directo desde sus servidores. En esta versión: ${n('edb')}.</p>
    <p><a href="https://oss.exercisedb.dev" target="_blank" rel="noopener">oss.exercisedb.dev</a></p>

    <h2>Cómo se sugieren las series y repeticiones</h2>
    <p>Se usan los rangos generales que recomiendan las guías de entrenamiento más usadas. Para fuerza, pocas repeticiones con más peso y descanso largo. Para ganar músculo, entre 8 y 12 repeticiones. Para resistencia, 15 o más con descanso corto. Los estiramientos se mantienen entre 20 y 30 segundos. Es una guía para empezar, no una indicación médica.</p>

    <h2>Traducción</h2>
    <p>Muchas instrucciones vienen en inglés. Si tu navegador es Chrome o Edge reciente, el botón Traducir usa el traductor integrado del propio navegador, gratis y sin enviar el texto a internet. En otros navegadores puedes abrir el texto en Google Translate.</p>

    <h2>Tus datos</h2>
    <p>Tu rutina, tus ejercicios guardados y tus preferencias quedan solo en este navegador. Si borras los datos del sitio o cambias de equipo, se pierden. Descarga el PDF para tener una copia.</p>
  </div>`;
}

function setActiveNav(path) {
  const key = path.startsWith('/rutina') ? 'rutina' : path.startsWith('/guardados') ? 'guardados' : path.startsWith('/acerca') ? 'acerca' : 'ejercicios';
  document.querySelectorAll('.nav a').forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function skeleton() {
  return `<div class="wrap page" aria-busy="true"><p class="loading">Cargando ejercicios…</p><ul class="grid" role="list" aria-hidden="true">${'<li class="card card--skeleton"><div class="card__media"></div><div class="card__body"><span></span><span></span></div></li>'.repeat(8)}</ul></div>`;
}

async function route() {
  const { path, params } = parse();
  nav.prev = nav.current;
  nav.current = location.hash;
  cleanup?.();
  cleanup = null;
  setActiveNav(path);

  // Cada vista recibe un contenedor nuevo, así sus eventos no se mezclan con la vista anterior.
  const view = document.createElement('div');
  view.className = 'view';
  main.replaceChildren(view);
  view.innerHTML = skeleton();
  if (!firstRender) window.scrollTo(0, 0);

  try {
    if (path === '/' || path === '') cleanup = await renderCatalog(view, params);
    else if (path.startsWith('/ejercicio/')) cleanup = await renderDetail(view, path.slice('/ejercicio/'.length));
    else if (path === '/rutina') cleanup = await renderRoutine(view, params);
    else if (path === '/guardados') await renderSaved(view);
    else if (path === '/acerca') await renderAbout(view);
    else {
      setTitle('Página no encontrada');
      view.innerHTML = '<div class="wrap page"><h1 tabindex="-1">Esta página no existe</h1><p>Revisa el enlace o vuelve al inicio.</p><a class="btn btn--primary" href="#/">Ir a los ejercicios</a></div>';
    }
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="wrap page"><h1 tabindex="-1">No se pudieron cargar los ejercicios</h1><p>${esc(err.message || 'Error desconocido')}. Revisa tu conexión y vuelve a intentarlo.</p><button type="button" class="btn btn--primary" onclick="location.reload()">Reintentar</button></div>`;
  }

  // Lleva el foco al título para lectores de pantalla, menos en la primera carga.
  if (!firstRender) view.querySelector('h1')?.focus({ preventScroll: true });
  firstRender = false;
  updateRoutineBadge();
}

function updateRoutineBadge() {
  const r = routineStore.get();
  const n = r ? r.days.reduce((a, d) => a + d.items.length, 0) : 0;
  const b = document.querySelector('[data-routine-count]');
  if (b) { b.textContent = n; b.hidden = !n; }
  const s = document.querySelector('[data-saved-count]');
  const k = saved.all().length;
  if (s) { s.textContent = k; s.hidden = !k; }
}

window.addEventListener('hashchange', route);
window.addEventListener('storage', updateRoutineBadge);
onChange(updateRoutineBadge);
installImageFallback();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
