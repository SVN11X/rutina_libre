import {
  loadData,
  search,
  facetCounts,
  filtersFromParams,
  filtersToParams,
  activeCount,
} from "./data.js";
import {
  ZONES,
  MUSCLES,
  EQUIPMENT,
  CATEGORIES,
  LEVELS,
  MUSCLE_HINT,
  EQUIPMENT_HINT,
  muscleList,
  label,
} from "./i18n.js";
import {
  esc,
  icon,
  img,
  plate,
  placeholder,
  debounce,
  setTitle,
  toast,
  $,
  $$,
} from "./ui.js";
import { saved } from "./store.js";
import { motionSVG } from "./motions.js";
import { rankDescription } from "./intelligence.js";

const PAGE = 24;
const MEM_KEY = "rl:catalogo";
const MUSCLE_ORDER = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "middle back",
  "lower back",
  "traps",
  "abdominals",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
  "adductors",
  "abductors",
  "neck",
];

export function card(ex) {
  const isSaved = saved.has(ex.id);
  const first = ex.images[0] || ex.gif;
  const second = ex.images[1];
  const media = first
    ? `${img(first, "", { cls: "card__img" })}${second ? `<img class="card__img card__img--alt" alt="" data-hover="${esc(second)}" width="450" height="300" decoding="async"${/^https:\/\/(raw\.githubusercontent|cdn\.jsdelivr)/.test(second) ? ' crossorigin="anonymous"' : ""}>` : ""}`
    : placeholder(ex);
  const badge = ex.gif
    ? '<span class="card__badge">Video + GIF</span>'
    : ex.videos?.length
      ? '<span class="card__badge">Video de la fuente</span>'
      : ex.illustration
        ? '<span class="card__badge">Esquema</span>'
        : "";
  return `<li class="card">
    <div class="card__media">${media}${badge}</div>
    <div class="card__body">
      ${plate(ex.level)}
      <h3 class="card__title"><a class="card__link" href="#/ejercicio/${encodeURIComponent(ex.id)}">${esc(ex.title)}</a></h3>
      <p class="card__category">${esc(label(CATEGORIES, ex.category))}</p>
      ${ex.summary ? `<p class="card__description">${esc(ex.summary)}</p>` : ""}
      <p class="card__meta">${esc(muscleList(ex.primary) || label(CATEGORIES, ex.category))}</p>
      <p class="card__meta card__meta--soft">${esc(label(EQUIPMENT, ex.equipment, "Sin equipo"))}</p>
    </div>
    <button type="button" class="save" data-save="${esc(ex.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Quitar de guardados" : "Guardar"}: ${esc(ex.title)}">${icon("bookmark")}</button>
  </li>`;
}

// Al pasar el cursor o enfocar la tarjeta se muestra la posición final del ejercicio.
export function wireCardHover(root) {
  const load = (e) => {
    const c = e.target.closest?.(".card");
    const alt = c?.querySelector("[data-hover]");
    if (alt) {
      alt.src = alt.dataset.hover;
      alt.removeAttribute("data-hover");
    }
  };
  root.addEventListener("pointerover", load);
  root.addEventListener("focusin", load);
}

export function wireSaveButtons(root, onToggle) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-save]");
    if (!b) return;
    const id = b.dataset.save;
    const now = saved.toggle(id);
    const name = b.getAttribute("aria-label").split(": ").slice(1).join(": ");
    b.setAttribute("aria-pressed", String(now));
    b.setAttribute(
      "aria-label",
      `${now ? "Quitar de guardados" : "Guardar"}: ${name}`,
    );
    toast(now ? "Guardado en tu lista" : "Quitado de guardados", {
      action: "Deshacer",
      onAction: () => {
        saved.toggle(id);
        b.setAttribute("aria-pressed", String(!now));
        b.setAttribute(
          "aria-label",
          `${!now ? "Quitar de guardados" : "Guardar"}: ${name}`,
        );
        onToggle?.();
      },
    });
    onToggle?.();
  });
}

function optionList(name, keys, dict, selected, { hints = {}, prefix } = {}) {
  return keys
    .map((k) => {
      const id = `f-${name}-${k.replace(/\W+/g, "-")}`;
      return `<li class="opt">
        <input type="checkbox" id="${id}" name="${name}" value="${esc(k)}" ${selected.includes(k) ? "checked" : ""}>
        <label for="${id}">${prefix ? prefix(k) : ""}<span class="opt__text">${esc(dict[k] ?? k)}${hints[k] ? `<small>${esc(hints[k])}</small>` : ""}</span><span class="opt__count" data-count="${name}:${esc(k)}"></span></label>
      </li>`;
    })
    .join("");
}

function filtersPanel(f, hasNoLevel) {
  const levels = {
    ...LEVELS,
    ...(hasNoLevel ? { none: "Nivel no indicado" } : {}),
  };
  return `
    <div class="filters__head">
      <h2 class="filters__title">Filtros</h2>
      <button type="button" class="icon-btn filters__close" data-close-filters aria-label="Cerrar filtros">${icon("close")}</button>
    </div>
    <form class="filters__form" id="filter-form">
      <fieldset class="fgroup">
        <legend>Nivel</legend>
        <ul class="opts">${optionList("nivel", Object.keys(levels), levels, f.nivel, { prefix: (k) => `<span class="plate plate--${k}" aria-hidden="true"></span>` })}</ul>
      </fieldset>
      <fieldset class="fgroup">
        <legend>Equipo</legend>
        <ul class="opts">${optionList("equipo", Object.keys(EQUIPMENT), EQUIPMENT, f.equipo, { hints: EQUIPMENT_HINT })}</ul>
      </fieldset>
      <fieldset class="fgroup">
        <legend>Músculo principal</legend>
        <ul class="opts">${optionList("musculo", MUSCLE_ORDER, MUSCLES, f.musculo, { hints: MUSCLE_HINT })}</ul>
      </fieldset>
      <fieldset class="fgroup">
        <legend>Tipo de ejercicio</legend>
        <ul class="opts">${optionList("tipo", Object.keys(CATEGORIES), CATEGORIES, f.tipo)}</ul>
      </fieldset>
      <fieldset class="fgroup">
        <legend>Demostración</legend>
        <ul class="opts"><li class="opt">
          <input type="checkbox" id="f-media" name="media" value="1" ${f.media ? "checked" : ""}>
          <label for="f-media"><span class="opt__text">Solo con animación o video</span><span class="opt__count" data-count="media:1"></span></label>
        </li></ul>
      </fieldset>
    </form>
    <div class="filters__foot">
      <button type="button" class="btn btn--ghost" data-clear>Limpiar filtros</button>
      <button type="button" class="btn btn--primary" data-close-filters data-show-results>Ver resultados</button>
    </div>`;
}

function layout(data, f) {
  const total = data.items.length.toLocaleString("es-CL");
  const zoneChips = [{ id: "", label: "Todo el cuerpo" }, ...ZONES]
    .map(
      (z) =>
        `<button type="button" class="chip" data-zone="${z.id}" aria-pressed="${f.zona === z.id}">${esc(z.label)}</button>`,
    )
    .join("");
  return `
  <section class="hero hero--new">
    <div class="wrap hero__layout"><div class="hero__content">
      <span class="eyebrow">TU PRÓXIMO MOVIMIENTO EMPIEZA AQUÍ</span>
      <h1 class="hero__title" tabindex="-1">Muévete a<br><span>tu manera.</span></h1>
      <p class="hero__lead">Fuerza, caminata, velocidad y mucho más. Encuentra cómo hacerlo, consulta las fuentes y arma una rutina que vaya contigo.</p>
      <div class="hero__actions"><a class="btn btn--primary" href="#/rutina">Crear mi rutina ${icon("plus")}</a><a class="btn btn--ghost" href="#/identificar">Identificar un ejercicio ${icon("search")}</a></div>
      <div class="hero__stats"><span><strong>${total}</strong> ejercicios</span><span><strong>${data.items.filter((x) => x.videos?.length).length}</strong> con video</span><span><strong>100%</strong> gratuito</span></div>
      </div><div class="hero__art"><span class="hero__art-label">CADA PASO CUENTA</span>${motionSVG("run", 1)}<div class="hero__art-note"><span class="hero__art-dot"></span><span>Empieza suave.<br><strong>Avanza a tu ritmo.</strong></span></div></div>
    </div>
    <div class="wrap discovery">
      <div class="discovery__head"><h2>Encuentra tu ejercicio</h2><a href="#/identificar">¿No recuerdas su nombre? ↗</a></div>
      <form class="search" role="search" id="search-form">
        <label for="q" class="visually-hidden">Buscar ejercicio</label>
        ${icon("search", "search__icon")}
        <input id="q" name="q" type="search" value="${esc(f.q)}" placeholder="Busca caminata, sprint, sentadilla, caminadora…" autocomplete="off" enterkeyhint="search" spellcheck="false">
        <button type="button" class="search__clear icon-btn" aria-label="Borrar búsqueda" ${f.q ? "" : "hidden"}>${icon("close")}</button>
      </form>
      <div class="category-shortcuts" role="group" aria-label="Tipo de ejercicio">${["", "strength", "cardio", "speed", "agility", "mobility", "balance"].map((type) => `<button class="chip category-chip" type="button" data-type="${type}" aria-pressed="${type ? f.tipo.includes(type) : !f.tipo.length}">${type ? esc(CATEGORIES[type]) : "Todos"}</button>`).join("")}<button class="chip category-chip" type="button" data-treadmill aria-pressed="${f.equipo.includes("treadmill")}">Caminadora</button></div>
      <div class="zones" role="group" aria-label="Zona del cuerpo">${zoneChips}</div>
    </div>
  </section>
  <div class="wrap catalog">
    <aside class="filters" id="filtros" aria-label="Filtros">${filtersPanel(
      f,
      data.items.some((x) => !x.level),
    )}</aside>
    <div class="filters__backdrop" data-close-filters hidden></div>
    <section class="results" aria-labelledby="res-count">
      <div class="results__bar">
        <h2 id="res-count" class="results__count" aria-live="polite" aria-atomic="true"></h2>
        <div class="results__tools">
          <button type="button" class="btn btn--ghost filters-toggle" aria-expanded="false" aria-controls="filtros">${icon("filter")}Filtros <span class="count-badge" hidden></span></button>
          <label class="sort"><span>Ordenar</span>
            <select id="orden">
              <option value="relevancia" ${f.orden === "relevancia" ? "selected" : ""}>Más relevantes</option>
              <option value="az" ${f.orden === "az" ? "selected" : ""}>Nombre A a Z</option>
              <option value="nivel" ${f.orden === "nivel" ? "selected" : ""}>Nivel, de fácil a difícil</option>
            </select>
          </label>
        </div>
      </div>
      <div class="pills" aria-label="Filtros activos"></div>
      <p class="search-hint" hidden></p>
      <ul class="grid" role="list"></ul>
      <div class="empty" hidden>
        <h3>No hay ejercicios con esta combinación</h3>
        <p>Prueba con otra palabra o quita algún filtro.</p>
        <button type="button" class="btn btn--primary" data-clear>Limpiar búsqueda y filtros</button>
      </div>
      <div class="more" hidden>
        <p class="more__status"></p>
        <button type="button" class="btn" data-more>Mostrar más ejercicios</button>
      </div>
    </section>
  </div>`;
}

export async function renderCatalog(main, params) {
  const data = await loadData();
  let f = filtersFromParams(params);
  setTitle(f.q ? `Buscar ${f.q}` : "Ejercicios");
  const mem = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(MEM_KEY));
    } catch {
      return null;
    }
  })();
  const restoring = mem && mem.hash === location.hash;
  let shown = restoring ? mem.shown : PAGE;
  let results = [];

  main.innerHTML = layout(data, f);
  const grid = $(".grid", main);
  const panel = $("#filtros", main);
  const backdrop = $(".filters__backdrop", main);
  const toggle = $(".filters-toggle", main);
  const q = $("#q", main);

  const syncUrl = () => {
    const qs = filtersToParams(f).toString();
    history.replaceState(history.state, "", `#/${qs ? `?${qs}` : ""}`);
  };

  const drawGrid = () => {
    const slice = results.slice(0, shown);
    grid.innerHTML = slice.map(card).join("");
    const more = $(".more", main);
    more.hidden = results.length <= shown;
    $(".more__status", main).textContent =
      `Mostrando ${slice.length} de ${results.length.toLocaleString("es-CL")}`;
  };

  const drawPills = () => {
    const pills = [];
    const add = (key, val, text) =>
      pills.push(
        `<button type="button" class="pill" data-remove="${key}:${esc(val)}" aria-label="Quitar filtro ${esc(text)}">${esc(text)}${icon("close")}</button>`,
      );
    f.nivel.forEach((v) => add("nivel", v, LEVELS[v] ?? "Nivel no indicado"));
    f.equipo.forEach((v) => add("equipo", v, EQUIPMENT[v] ?? v));
    f.musculo.forEach((v) => add("musculo", v, MUSCLES[v] ?? v));
    f.tipo.forEach((v) => add("tipo", v, CATEGORIES[v] ?? v));
    if (f.media) add("media", "1", "Con animación o video");
    $(".pills", main).innerHTML =
      pills.join("") +
      (pills.length > 1
        ? '<button type="button" class="pill pill--clear" data-clear>Quitar todos</button>'
        : "");
    const n = activeCount(f);
    const badge = $(".count-badge", main);
    badge.hidden = !n;
    badge.textContent = n;
  };

  const drawCounts = () => {
    const c = facetCounts(data.items, f);
    $$("[data-count]", main).forEach((el) => {
      const [k, v] = el.dataset.count.split(":");
      const n = k === "media" ? c.media : (c[k]?.[v] ?? 0);
      el.textContent = n;
      el.closest(".opt")?.classList.toggle("is-zero", !n);
    });
  };

  const update = ({ keepShown = false } = {}) => {
    results = search(data.items, f);
    const hint = $(".search-hint", main);
    hint.hidden = true;
    if (f.q.split(/\s+/).length >= 5) {
      const eligible = search(data.items, { ...f, q: "" });
      const smart = rankDescription(eligible, f.q, 60).map((r) => r.ex);
      if (smart.length) {
        results = smart;
        hint.textContent =
          "Búsqueda por descripción: compara las fichas para confirmar el movimiento.";
        hint.hidden = false;
      }
    }
    if (!keepShown) shown = PAGE;
    const n = results.length;
    $("#res-count", main).textContent =
      `${n.toLocaleString("es-CL")} ${n === 1 ? "ejercicio" : "ejercicios"}`;
    $(".empty", main).hidden = n > 0;
    $("[data-show-results]", main).textContent =
      `Ver ${n.toLocaleString("es-CL")} ${n === 1 ? "ejercicio" : "ejercicios"}`;
    $(".search__clear", main).hidden = !f.q;
    $$(".chip[data-zone]", main).forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.zone === f.zona)),
    );
    $$("[data-type]", main).forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(
          b.dataset.type ? f.tipo.includes(b.dataset.type) : !f.tipo.length,
        ),
      ),
    );
    $("[data-treadmill]", main).setAttribute(
      "aria-pressed",
      String(f.equipo.includes("treadmill")),
    );
    drawGrid();
    drawPills();
    drawCounts();
    syncUrl();
  };

  // Filtros en pantallas pequeñas: panel que se abre sobre el contenido.
  let lastFocus = null;
  const openFilters = () => {
    lastFocus = document.activeElement;
    panel.classList.add("is-open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.querySelector("input")?.focus();
  };
  const closeFilters = () => {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
    (lastFocus || toggle).focus();
  };

  const clearAll = () => {
    f = {
      ...f,
      q: "",
      zona: "",
      musculo: [],
      equipo: [],
      nivel: [],
      tipo: [],
      media: false,
    };
    q.value = "";
    $$("#filter-form input", main).forEach((i) => {
      i.checked = false;
    });
    update();
  };

  toggle.addEventListener("click", () =>
    panel.classList.contains("is-open") ? closeFilters() : openFilters(),
  );
  main.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFilters();
    if (e.key === "Tab" && panel.classList.contains("is-open")) {
      const focusable = $$("button,input,select,a", panel).filter(
          (x) => !x.disabled && x.getClientRects().length,
        ),
        first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });

  const onType = debounce(() => {
    f.q = q.value.trim();
    update();
  }, 180);
  q.addEventListener("input", onType);
  $("#search-form", main).addEventListener("submit", (e) => {
    e.preventDefault();
    f.q = q.value.trim();
    update();
    q.blur();
    $("#res-count", main).scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  $("#filter-form", main).addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "media") f.media = t.checked;
    else {
      const set = new Set(f[t.name]);
      t.checked ? set.add(t.value) : set.delete(t.value);
      f[t.name] = [...set];
    }
    update();
  });

  $("#orden", main).addEventListener("change", (e) => {
    f.orden = e.target.value;
    update();
  });

  main.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.matches(".search__clear")) {
      q.value = "";
      f.q = "";
      update();
      q.focus();
    } else if (t.dataset.zone !== undefined) {
      f.zona = f.zona === t.dataset.zone ? "" : t.dataset.zone;
      update();
    } else if (t.dataset.type !== undefined) {
      f.tipo = t.dataset.type ? [t.dataset.type] : [];
      f.zona = "";
      $$('#filter-form input[name="tipo"]', main).forEach(
        (i) => (i.checked = f.tipo.includes(i.value)),
      );
      update();
    } else if (t.hasAttribute("data-treadmill")) {
      f.equipo = f.equipo.includes("treadmill") ? [] : ["treadmill"];
      f.zona = "";
      $$('#filter-form input[name="equipo"]', main).forEach(
        (i) => (i.checked = f.equipo.includes(i.value)),
      );
      update();
    } else if (t.hasAttribute("data-clear")) clearAll();
    else if (t.hasAttribute("data-close-filters")) closeFilters();
    else if (t.hasAttribute("data-more")) {
      const before = shown;
      shown += PAGE;
      drawGrid();
      grid.children[before]?.querySelector("a")?.focus({ preventScroll: true });
    } else if (t.dataset.remove) {
      const [k, v] = t.dataset.remove.split(":");
      if (k === "media") f.media = false;
      else f[k] = f[k].filter((x) => x !== v);
      const box = $(
        `#filter-form input[name="${k}"][value="${CSS.escape(v)}"]`,
        main,
      );
      if (box) box.checked = false;
      update();
    } else if (t.matches(".card__link")) {
      sessionStorage.setItem(
        MEM_KEY,
        JSON.stringify({ hash: location.hash, y: window.scrollY, shown }),
      );
    }
  });
  backdrop.addEventListener("click", closeFilters);

  wireCardHover(grid);
  wireSaveButtons(grid);

  update({ keepShown: true });
  if (restoring) requestAnimationFrame(() => window.scrollTo(0, mem.y));
  return () => {
    onType.cancel();
    document.body.classList.remove("no-scroll");
  };
}
