import { loadData } from "./data.js";
import {
  renderCatalog,
  card,
  wireCardHover,
  wireSaveButtons,
} from "./catalog.js";
import { renderDetail } from "./detail.js";
import { renderRoutine } from "./routine.js";
import { renderDetector } from "./detector.js";
import { esc, setTitle, installImageFallback, nav, $ } from "./ui.js";
import { saved, routineStore, onChange } from "./store.js";

const main = document.getElementById("main");
let cleanup = null;
let firstRender = true;
let routeVersion = 0;

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function parse() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(qs || "") };
}

async function renderSaved(view) {
  const data = await loadData();
  setTitle("Guardados");
  const draw=()=>{
  const list = saved
    .all()
    .map((id) => data.byId.get(id))
    .filter(Boolean);
  view.innerHTML = `<div class="wrap page">
    <header class="page__head">
      <h1 tabindex="-1">Guardados</h1>
      <p class="lead">${list.length ? `Tienes ${list.length} ${list.length === 1 ? "ejercicio guardado" : "ejercicios guardados"} en este navegador.` : "Aún no guardas ejercicios."}</p>
    </header>
    ${
      list.length
        ? `<ul class="grid" role="list">${list.map(card).join("")}</ul>`
        : `<div class="empty"><p>Toca el marcador de cualquier ejercicio para tenerlo a mano aquí. Se guarda solo en este navegador.</p><a class="btn btn--primary" href="#/">Explorar ejercicios</a></div>`
    }
  </div>`;
  const g = $(".grid", view);
  if (g) {
    wireCardHover(g);
    wireSaveButtons(g,()=>{draw();view.querySelector('h1')?.focus();});
  }
  };
  draw();
}

async function renderAbout(view) {
  const data = await loadData();
  setTitle("Fuentes y licencias");
  const date = data.meta.generated
    ? new Date(data.meta.generated).toLocaleDateString("es-CL", {
        dateStyle: "long",
      })
    : null;
  const count = {
    total: data.items.length,
    spanish: data.items.filter((x) => x.stepsEs?.length).length,
    videos: data.items.filter((x) => x.videos?.some(v=>v.startsWith("assets/media/"))).length,
    gifs: data.items.filter((x) => x.gif).length,
  };
  view.innerHTML = `<div class="wrap page prose">
    <span class="eyebrow">INFORMACIÓN QUE PUEDES CONSULTAR</span>
    <h1 tabindex="-1">De dónde viene la información</h1>
    <p class="lead">Cada ficha enlaza su registro original y, cuando corresponde, guías de técnica o contexto. Los recursos conservan su autoría y licencia.${date ? ` Esta edición se preparó el ${esc(date)}.` : ""}</p>
    <div class="quality-grid"><div><strong>${count.total.toLocaleString("es-CL")}</strong>ejercicios</div><div><strong>${count.spanish.toLocaleString("es-CL")}</strong>con pasos en español</div><div><strong>${count.videos}</strong>con MP4 locales</div><div><strong>${count.gifs}</strong>con GIF derivados reales</div></div>
    <h2>Fuentes de esta edición</h2>
    <div class="source-table-wrap"><table class="source-table"><thead><tr><th scope="col">Fuente</th><th scope="col">Qué aporta</th><th scope="col">Uso</th></tr></thead><tbody>
      <tr><td><a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">Free Exercise DB ↗</a></td><td>Datos, instrucciones y fotos del catálogo original</td><td>Unlicense declarada por el proyecto. Las fotos se sirven desde su fuente.</td></tr>
      <tr><td><a href="https://wger.de" target="_blank" rel="noopener">wger ↗</a></td><td>Textos comunitarios en español, imágenes y videos</td><td>Licencia y autoría por recurso; se muestran en cada ficha. Los videos incluidos usan CC BY-SA 4.0.</td></tr>
      <tr><td><a href="https://www.dvidshub.net" target="_blank" rel="noopener">DVIDS ↗</a></td><td>Demostraciones de sentadilla corporal, flexiones y plancha</td><td>Dominio público por recurso; créditos, modificaciones y aviso de no respaldo institucional en cada ficha.</td></tr><tr><td><a href="https://commons.wikimedia.org/wiki/File:Fit_walking.webmhd.webm" target="_blank" rel="noopener">Wikimedia Commons ↗</a></td><td>Fragmento real de caminata en terreno plano</td><td>Msrmesa · CC BY-SA 3.0; origen y modificaciones en la ficha.</td></tr><tr><td><a href="https://www.nhs.uk/live-well/exercise/" target="_blank" rel="noopener">NHS ↗</a></td><td>Referencias sobre caminata, progresión de carrera, equilibrio y movilidad</td><td>Enlaces a las guías oficiales.</td></tr>
      <tr><td><a href="https://www.southtees.nhs.uk/resources/combined-cardiovascular/" target="_blank" rel="noopener">NHS South Tees ↗</a></td><td>Técnica específica de caminadora y bicicleta; el remo requiere otra fuente</td><td>Guía original de ejercicios; adapta las indicaciones a tu situación.</td></tr>
      <tr><td><a href="https://worldathletics.org/personal-best/performance/jereem-richards-games-drills-develop-speed" target="_blank" rel="noopener">World Athletics ↗</a></td><td>Técnica de carrera, coordinación y velocidad</td><td>Referencias técnicas originales.</td></tr>
      <tr><td><a href="https://www.mayoclinic.org/health/strength-training/MY00033" target="_blank" rel="noopener">Mayo Clinic ↗</a> · <a href="https://www.acefitness.org/resources/everyone/exercise-library/" target="_blank" rel="noopener">ACE ↗</a></td><td>Guías y demostraciones de ejercicios de fuerza</td><td>Enlaces externos; no se copian sus videos.</td></tr>
    </tbody></table></div>
    <p>La cobertura sigue siendo parcial: hay instrucciones sin traducir y datos sin nivel, músculos o equipo confirmado. Un enlace externo no significa reproducción validada. Los datos desconocidos se muestran como tales y no se usan como nivel principiante en planes automáticos.</p><h2>Qué se revisa</h2><p>La app comprueba que los registros tienen datos y conserva los enlaces, autores y licencias. Los recursos comunitarios no tienen una validación clínica individual. Las fichas nuevas son síntesis educativas en español: un enlace de contexto no significa que la fuente prescriba exactamente el ejemplo mostrado.</p><p>Algunos ejercicios similares aparecen con los nombres de distintas fuentes. Solo se unen coincidencias de nombre o equivalencias explícitas para evitar asociar videos de movimientos diferentes.</p>
    <h2>Dosis orientativas</h2><p>Los ejemplos de series, tiempo, distancia y descanso se adaptan al tipo de ejercicio. Caminar, hacer un sprint y levantar pesas tienen necesidades diferentes. No se convierten automáticamente las caminatas en intervalos intensos al elegir un objetivo de pérdida de grasa. Los rangos de la app requieren adaptación y no reemplazan un plan profesional.</p>
    <h2>Identificación por texto y dibujo</h2><p>La descripción usa BM25, sinónimos y pistas del movimiento. El dibujo usa un clasificador por vecinos más cercanos de posturas esquemáticas. No necesita cuentas, claves ni un servidor de IA; tu texto y tus trazos permanecen en este navegador. Las coincidencias son posibles ejercicios para comparar, no una identificación garantizada ni una evaluación de técnica.</p>
    <h2>Traducción y recursos visuales</h2><p>Las instrucciones que todavía están en inglés conservan su texto original. Puedes usar el traductor del navegador cuando esté disponible o abrir Google Translate. Los GIF incluidos son fragmentos de videos reales de wger, DVIDS y Wikimedia Commons, con créditos y licencia en cada ficha. Los esquemas de las nuevas fichas son dibujos orientativos y las fotos seleccionables son referencias de postura, no videos del movimiento completo.</p>
    <h2>Gratuidad y disponibilidad</h2><p>La búsqueda, el detector, las rutinas y el PDF no tienen cuotas de uso de la app. Los proveedores externos y GitHub Pages tienen sus propias políticas y disponibilidad. Los datos, los esquemas y los MP4/GIF incluidos funcionan sin consultar una API de ejercicios en cada búsqueda.</p>
    <h2>Tus datos</h2><p>Tu rutina, tus ejercicios guardados y tus preferencias quedan en este navegador. Si borras los datos del sitio o cambias de equipo, se pierden. Descarga el PDF para tener una copia. Las imágenes externas y los enlaces que abras hacen peticiones normales a sus proveedores; los dibujos y descripciones no se envían.</p>
  </div>`;
}

function setActiveNav(path) {
  const key = path.startsWith("/identificar")
    ? "identificar"
    : path.startsWith("/rutina")
      ? "rutina"
      : path.startsWith("/guardados")
        ? "guardados"
        : path.startsWith("/acerca")
          ? "acerca"
          : "ejercicios";
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function skeleton() {
  return `<div class="wrap page" aria-busy="true"><p class="loading">Cargando ejercicios…</p><ul class="grid" role="list" aria-hidden="true">${'<li class="card card--skeleton"><div class="card__media"></div><div class="card__body"><span></span><span></span></div></li>'.repeat(8)}</ul></div>`;
}

async function route() {
  const version = ++routeVersion;
  const { path, params } = parse();
  nav.prev = nav.current;
  nav.current = location.hash;
  cleanup?.();
  cleanup = null;
  setActiveNav(path);

  // Cada vista recibe un contenedor nuevo, así sus eventos no se mezclan con la vista anterior.
  const view = document.createElement("div");
  view.className = "view";
  main.replaceChildren(view);
  view.innerHTML = skeleton();
  if (!firstRender) window.scrollTo(0, 0);

  try {
    let nextCleanup;
    if (path === "/" || path === "")
      nextCleanup = await renderCatalog(view, params);
    else if (path.startsWith("/ejercicio/"))
      nextCleanup = await renderDetail(view, path.slice("/ejercicio/".length));
    else if (path === "/rutina")
      nextCleanup = await renderRoutine(view, params);
    else if (path === "/identificar") nextCleanup = await renderDetector(view);
    else if (path === "/guardados") await renderSaved(view);
    else if (path === "/acerca") await renderAbout(view);
    else {
      setTitle("Página no encontrada");
      view.innerHTML =
        '<div class="wrap page"><h1 tabindex="-1">Esta página no existe</h1><p>Revisa el enlace o vuelve al inicio.</p><a class="btn btn--primary" href="#/">Ir a los ejercicios</a></div>';
    }
    if (version !== routeVersion) {
      nextCleanup?.();
      return;
    }
    cleanup = nextCleanup;
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="wrap page"><h1 tabindex="-1">No se pudieron cargar los ejercicios</h1><p>${esc(err.message || "Error desconocido")}. Revisa tu conexión y vuelve a intentarlo.</p><button type="button" class="btn btn--primary" onclick="location.reload()">Reintentar</button></div>`;
  }

  // Lleva el foco al título para lectores de pantalla, menos en la primera carga.
  if (version !== routeVersion) return;
  if (!firstRender) view.querySelector("h1")?.focus({ preventScroll: true });
  firstRender = false;
  updateRoutineBadge();
}

function updateRoutineBadge() {
  const r = routineStore.get();
  const n = r ? r.days.reduce((a, d) => a + d.items.length, 0) : 0;
  const b = document.querySelector("[data-routine-count]");
  if (b) {
    b.textContent = n;
    b.hidden = !n;
  }
  const s = document.querySelector("[data-saved-count]");
  const k = saved.all().length;
  if (s) {
    s.textContent = k;
    s.hidden = !k;
  }
}

window.addEventListener("hashchange", route);
document.querySelector('.skip')?.addEventListener('click',event=>{
  event.preventDefault();main.focus();main.scrollIntoView({block:'start',behavior:'instant'});
});
window.addEventListener("storage", updateRoutineBadge);
onChange(updateRoutineBadge);
installImageFallback();
route();

if ("serviceWorker" in navigator && (location.protocol === "https:" || ['localhost','127.0.0.1'].includes(location.hostname))) {
  const hadController=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("message",event=>{
    if(event.data?.type==="RELEASE_READY"){
      if(hadController)import("./ui.js").then(({toast})=>toast("Versión nueva disponible. Recarga para actualizar; tus guardados y rutinas se conservan.",{action:"Recargar",onAction:()=>location.reload()}));
    }
  });
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js",{updateViaCache:'none'}).then(reg=>reg.update()).catch(() => {}),
  );
}
