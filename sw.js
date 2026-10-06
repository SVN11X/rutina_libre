// Permite usar la página sin conexión después de la primera visita.
// Archivos propios: primero la red y, si no hay conexión, la copia guardada.
// Imágenes y animaciones: primero la copia guardada, para ahorrar datos.
const VERSION = "v2";
const PREFIX = "rutina-libre-";
const SHELL = `${PREFIX}shell-${VERSION}`;
const MEDIA = `${PREFIX}media-${VERSION}`;
const MEDIA_MAX = 400;

const FILES = [
  "./",
  "index.html",
  "css/styles.css",
  "css/enhancements.css",
  "js/app.js",
  "js/catalog.js",
  "js/data.js",
  "js/detail.js",
  "js/detector.js",
  "js/intelligence.js",
  "js/motions.js",
  "js/generator.js",
  "js/i18n.js",
  "js/pdf.js",
  "js/reps.js",
  "js/routine.js",
  "js/store.js",
  "js/translate.js",
  "js/ui.js",
  "data/exercises.json",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/vendor/jspdf.umd.min.js",
  ...[
    "squat",
    "pushup",
    "plank",
    "lunge",
    "curl",
    "press",
    "pullup",
    "bridge",
    "deadlift",
    "row",
    "walk",
    "run",
    "balance",
    "treadmill",
    "cycle",
    "mobility",
    "mountain",
    "jump",
  ].map((f) => `assets/illustrations/${f}.svg`),
];

const MEDIA_HOSTS = [
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
  "wger.de",
  "static.exercisedb.dev",
  "cdn.exercisedb.dev",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "cdnjs.cloudflare.com",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(PREFIX) && k !== SHELL && k !== MEDIA)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (/\/assets\/media\//.test(url.pathname)) {
      e.respondWith(
        caches
          .open(MEDIA)
          .then(async (c) => {
            const hit = await c.match(req.url);
            if (hit) {
              const range = req.headers.get("range");
              if (range) {
                const bytes = await hit.arrayBuffer(),
                  m = /bytes=(\d+)-(\d*)/.exec(range);
                if (m) {
                  const start = Number(m[1]),
                    end = Math.min(
                      m[2] ? Number(m[2]) : bytes.byteLength - 1,
                      bytes.byteLength - 1,
                    );
                  if (start > end)
                    return new Response(null, {
                      status: 416,
                      headers: {
                        "Content-Range": `bytes */${bytes.byteLength}`,
                      },
                    });
                  return new Response(bytes.slice(start, end + 1), {
                    status: 206,
                    headers: {
                      "Content-Type":
                        hit.headers.get("Content-Type") || "video/mp4",
                      "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}`,
                      "Content-Length": String(end - start + 1),
                      "Accept-Ranges": "bytes",
                    },
                  });
                }
              }
              return hit;
            }
            const res = await fetch(req);
            if (res.status === 200) {
              e.waitUntil(
                c
                  .put(req.url, res.clone())
                  .then(() => trim(MEDIA, MEDIA_MAX))
                  .catch(() => {}),
              );
            }
            return res;
          })
          .catch(
            () =>
              new Response("Recurso no disponible sin conexión", {
                status: 503,
              }),
          ),
      );
      return;
    }
    e.respondWith(
      fetch(req, { signal: AbortSignal.timeout(6000) })
        .then((res) => {
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            e.waitUntil(
              caches
                .open(SHELL)
                .then((c) => c.put(req, copy))
                .catch(() => {}),
            );
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then(
              async (r) =>
                r ||
                (req.mode === "navigate"
                  ? await caches.match("index.html")
                  : new Response("Archivo no disponible sin conexión", {
                      status: 503,
                    })),
            ),
        ),
    );
    return;
  }

  const isMedia =
    MEDIA_HOSTS.includes(url.hostname) &&
    (req.destination === "image" ||
      req.destination === "font" ||
      req.destination === "style" ||
      /\.(jpe?g|png|gif|webp|svg|woff2?)$/i.test(url.pathname) ||
      url.hostname === "cdnjs.cloudflare.com");
  if (isMedia) {
    e.respondWith(
      caches.open(MEDIA).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        // Solo se guardan respuestas legibles. Las opacas ocupan mucho espacio en el navegador.
        if (res.ok) {
          e.waitUntil(
            c
              .put(req, res.clone())
              .then(() => trim(MEDIA, MEDIA_MAX))
              .catch(() => {}),
          );
        }
        return res;
      }),
    );
  }
});
