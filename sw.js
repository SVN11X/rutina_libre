// Permite usar la página sin conexión después de la primera visita.
// Archivos propios: primero la red y, si no hay conexión, la copia guardada.
// Imágenes y animaciones: primero la copia guardada, para ahorrar datos.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const MEDIA = `media-${VERSION}`;
const MEDIA_MAX = 400;

const FILES = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/catalog.js',
  'js/data.js',
  'js/detail.js',
  'js/generator.js',
  'js/i18n.js',
  'js/pdf.js',
  'js/reps.js',
  'js/routine.js',
  'js/store.js',
  'js/translate.js',
  'js/ui.js',
  'data/exercises.json',
  'manifest.webmanifest',
  'assets/icon.svg',
];

const MEDIA_HOSTS = ['raw.githubusercontent.com', 'cdn.jsdelivr.net', 'wger.de', 'static.exercisedb.dev', 'cdn.exercisedb.dev', 'fonts.gstatic.com', 'fonts.googleapis.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
    );
    return;
  }

  const isMedia = MEDIA_HOSTS.includes(url.hostname) && (req.destination === 'image' || req.destination === 'font' || req.destination === 'style' || /\.(jpe?g|png|gif|webp|svg|woff2?)$/i.test(url.pathname) || url.hostname === 'cdnjs.cloudflare.com');
  if (isMedia) {
    e.respondWith(
      caches.open(MEDIA).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        // Solo se guardan respuestas legibles. Las opacas ocupan mucho espacio en el navegador.
        if (res.ok) { c.put(req, res.clone()); trim(MEDIA, MEDIA_MAX); }
        return res;
      }),
    );
  }
});
