import { loadData, similar } from "./data.js";
import {
  MUSCLES,
  MUSCLE_HINT,
  EQUIPMENT,
  CATEGORIES,
  FORCES,
  MECHANICS,
  LEVELS,
  LEVEL_ORDER,
  label,
} from "./i18n.js";
import { GOALS, GOAL_ORDER, prescribe } from "./reps.js";
import {
  esc,
  icon,
  img,
  plate,
  placeholder,
  setTitle,
  toast,
  reducedMotion,
  nav,
  $,
  $$,
} from "./ui.js";
import { saved, prefs, routineStore, translations } from "./store.js";
import { card, wireCardHover, wireSaveButtons } from "./catalog.js";
import {
  canTranslateHere,
  translateSteps,
  googleTranslateUrl,
  availability,
} from "./translate.js";
import { emptyRoutine, makeItem } from "./generator.js";
import { motionSVG, POSES } from "./motions.js";
import { playableVideos, wireVideo } from "./media.js";
import { equipmentText,canUseEquipment } from "./equipment.js";

function splitRest(rest) {
  const m = /^([\d\s]+(?:a\s[\d\s]+)?)\s(segundos|minutos)$/.exec(rest || "");
  return m
    ? { num: m[1].trim(), unit: `${m[2]} de descanso` }
    : {
        num: rest || "Sin pausa",
        unit: rest ? "de descanso" : "entre rondas",
        small: true,
      };
}

function doseBlock(ex, goal, level) {
  const p = prescribe(ex, goal, level);
  const r = splitRest(p.rest);
  const g = GOALS[goal] || GOALS.musculo;
  const showTip =
    !ex.prescription &&
    ![
      "stretching",
      "cardio",
      "mobility",
      "balance",
      "speed",
      "warmup",
      "recovery",
    ].includes(ex.category);
  return `
    <div class="dose__numbers">
      <div class="dose__cell"><span class="num">${p.series}</span><span class="num-label">${esc(p.series === 1 ? (p.seriesLabel === "vez" ? "vez" : "serie") : p.seriesLabel)}</span></div>
      <div class="dose__cell"><span class="num ${p.amount.length > 8 ? "num--small" : ""}">${esc(p.amount)}</span><span class="num-label">${esc(p.unit)}</span></div>
      ${p.rest || ex.category !== "cardio" ? `<div class="dose__cell"><span class="num ${r.small || r.num.length > 8 ? "num--small" : ""}">${esc(r.num)}</span><span class="num-label">${esc(r.unit)}</span></div>` : ""}
    </div>
    ${showTip ? `<p class="dose__tip">${esc(g.tip)}</p>` : ""}${p.adaptation?`<p class="dose__tip">${esc(p.adaptation)}</p>`:''}`;
}

function mediaBlock(ex) {
  const playable=playableVideos(ex), videoUrl=playable[0], demos=ex.demonstrations||[];
  const photos=ex.images.filter(u=>!u.endsWith('.svg'));
  const modes=[];
  if(videoUrl)modes.push(['video','Video']);
  if(ex.gif)modes.push(['gif','GIF']);
  if(demos.length)modes.push(['externo','Video externo']);
  if(photos.length)modes.push(['fotos','Fotos']);
  if(ex.illustration)modes.push(['esquema','Esquema']);
  if(!modes.length)return `<div class="media media--empty">${placeholder(ex)}<p>No hay una demostración válida de este ejercicio. Consulta el registro y las fuentes específicas al final.</p></div>`;
  const initial=modes[0][0];
  const tabs=modes.length>1?`<fieldset class="seg seg--media"><legend>Tipo de recurso</legend>${modes.map(([key,title])=>`<input type="radio" name="media" id="m-${key}" value="${key}" ${key===initial?'checked':''}><label for="m-${key}">${title}</label>`).join('')}</fieldset>`:'';
  const video=videoUrl?`<div class="media__panel" data-panel="video" ${initial==='video'?'':'hidden'}>
    <video controls preload="none" playsinline aria-label="Demostración de ${esc(ex.title)}" src="${esc(videoUrl)}" ${ex.poster || photos[0]?`poster="${esc(ex.poster||photos[0])}"`:''}>Tu navegador no puede reproducir este video.</video>
    <div class="media-actions"><button class="btn btn--small" type="button" data-video-play aria-pressed="false">Reproducir video</button><button class="btn btn--small" type="button" data-video-retry hidden>Reintentar video</button>${videoUrl.startsWith('assets/')?'<button class="btn btn--small btn--ghost" type="button" data-cache-video>Guardar video sin conexión</button>':''}</div>
    <p class="media-note" data-video-status role="status" aria-live="polite"></p>
    ${playable.length>1?`<label class="video-option">Otra grabación del mismo ejercicio<select data-video-source>${playable.map((u,i)=>`<option value="${esc(u)}">Grabación ${i+1}${u.startsWith('assets/')?' · MP4 incluido':' · fuente externa'}</option>`).join('')}</select></label>`:''}
    <p class="media-note"><a href="${esc(videoUrl)}" target="_blank" rel="noopener">Abrir el archivo de video</a>. Comprueba la técnica con los pasos; el recurso puede mostrar más de una repetición.</p>
  </div>`:'';
  const gif=ex.gif?`<div class="media__panel" data-panel="gif" ${initial==='gif'?'':'hidden'}><div class="gif"><img data-gif-src="${esc(ex.gif)}" data-gif-poster="${esc(ex.poster||photos[0]||'')}" ${ex.poster||photos[0]?`src="${esc(ex.poster||photos[0])}"`:''} alt="Fragmento de demostración de ${esc(ex.title)}" width="640" height="360"></div><button class="btn btn--small" type="button" data-gif-toggle aria-pressed="false">Reproducir GIF</button><p class="media-note">Fragmento de una demostración real, sin sonido. <a href="${esc(ex.gif)}" target="_blank" rel="noopener">Abrir GIF</a></p></div>`:'';
  const fotos=photos.length?`<div class="media__panel" data-panel="fotos" ${initial==='fotos'?'':'hidden'}><div class="flip" data-frame="0"><div class="flip__stage">${photos.slice(0,2).map((u,i)=>img(u,`${ex.title}, referencia ${i+1}`,{cls:`flip__frame ${i===0?'is-on':''}`,eager:i===0&&initial==='fotos',w:850,h:567})).join('')}<span class="flip__label" aria-hidden="true">Referencia 1</span></div>${photos.length>1?`<div class="flip__controls"><div class="flip__thumbs" role="group" aria-label="Elegir fotografía"><button type="button" data-frame-btn="0" aria-pressed="true">Foto 1</button><button type="button" data-frame-btn="1" aria-pressed="false">Foto 2</button></div></div>`:''}</div><p class="media-note">Fotografías de referencia; no muestran el movimiento continuo.</p></div>`:'';
  const external=demos.length?`<div class="media__panel" data-panel="externo" ${initial==='externo'?'':'hidden'}>${demos.map((d,i)=>`<div class="external-demo"><p><strong>${esc(d.title)}</strong> · ${esc(d.author)}</p><p class="media-note">${esc(d.note||'Demostración en la fuente externa. Su disponibilidad depende del proveedor.')}</p>${d.embed?`<button class="btn btn--small" type="button" data-load-demo="${i}">Cargar reproductor externo</button><div data-demo-slot="${i}"></div>`:''}<a class="btn btn--small btn--ghost" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Ver video en la fuente</a><p class="media-note" data-external-status="${i}" role="status"></p></div>`).join('')}</div>`:'';
  const schema=ex.illustration?`<div class="media__panel" data-panel="esquema" ${initial==='esquema'?'':'hidden'}><div class="motion-schema">${motionSVG(ex.family)}</div><p class="media-note">Esquema de apoyo secundario; no es una demostración de técnica.</p>${POSES[ex.family]?.length>1?'<button class="btn btn--small" type="button" data-schema-toggle aria-pressed="false">Ver otra postura</button>':''}</div>`:'';
  return `<div class="media">${tabs}${video}${gif}${external}${fotos}${schema}${!videoUrl&&!ex.gif&&!demos.length?'<p class="media-note">No hay video o GIF válido para esta variante. Consulta las fotografías y las fuentes; el esquema, si existe, es solo apoyo secundario.</p>':''}${ex.videos?.length&&!videoUrl?`<p class="media-note">${ex.videoInfo?.some(v=>v.variantRestricted)?'La grabación original muestra otra variante y se excluyó de esta demostración.':'El formato original no es compatible con este reproductor.'} <a href="${esc(ex.videos[0])}" target="_blank" rel="noopener">Consultar archivo original</a></p>`:''}</div>`;
}

function youtubeUrl(ex) {
  const q = ex.nameEs
    ? `cómo hacer ${ex.nameEs} ejercicio`
    : `${ex.name} exercise proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function addForm(r,ex) {
  if(r?.prefs && ex && !canUseEquipment(ex,r.prefs.equipment))return '<p class="safety-note">Este ejercicio necesita equipo adicional o sin confirmar. Cambia el equipo disponible en tus respuestas antes de agregarlo.</p><a class="btn btn--ghost" href="#/rutina?editar=1">Cambiar mis respuestas</a>';
  if (!r || !r.days.length) {
    return `<button type="button" class="btn btn--primary" data-add-new>${icon("plus")}Agregar a mi rutina</button>`;
  }
  return `<form class="add-form" data-add-form>
      <label for="add-day">Agregar a</label>
      <select id="add-day">${r.days.map((d, i) => `<option value="${i}">${esc(d.title)}</option>`).join("")}</select>
      <button type="submit" class="btn btn--primary">${icon("plus")}Agregar</button>
    </form>`;
}

function stepsBlock(ex) {
  const cached = !ex.stepsEs?.length ? translations.get(ex.id) : null;
  const es = ex.stepsEs?.length ? ex.stepsEs : cached;
  const list = es || ex.steps;
  if (!list?.length)
    return '<p class="muted">Este ejercicio no trae instrucciones escritas. Revisa las imágenes o busca un video de referencia.</p>';
  const isEn = !es;
  return `
    <ol class="steps" lang="${isEn ? "en" : "es"}">${list.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="lang-note" data-lang-note>
      ${
        isEn
          ? `<p>Las instrucciones originales están en inglés.</p>
           <div class="lang-note__actions">
             ${canTranslateHere() ? `<button type="button" class="btn btn--small" data-translate>${icon("translate")}Traducir al español</button>` : ""}
             <a class="btn btn--small btn--ghost" href="${esc(googleTranslateUrl(ex.steps.join("\n")))}" target="_blank" rel="noopener">Abrir en Google Translate</a>
           </div>
           <p class="status" aria-live="polite"></p>`
          : `<p>${esc(ex.stepsEs?.length ? ex.instructionCredit || "Texto en español; consulta su fuente al final." : "Traducción automática hecha en tu navegador. Verifica la técnica con la fuente original.")}${ex.steps?.length ? ' <button type="button" class="link-btn" data-show-original>Ver original en inglés</button>' : ""}</p>`
      }
    </div>`;
}

export async function renderDetail(main, rawId) {
  const data = await loadData();
  const id = decodeURIComponent(rawId);
  const ex = data.byId.get(id);
  if (!ex) {
    setTitle("No encontrado");
    main.innerHTML = `<div class="wrap page"><h1 tabindex="-1">No encontramos ese ejercicio</h1><p>Puede que el enlace esté incompleto o que el ejercicio haya cambiado de nombre.</p><a class="btn btn--primary" href="#/">Ver todos los ejercicios</a></div>`;
    return;
  }
  setTitle(ex.title);
  let goal = prefs.goal();
  let level = prefs.level();
  const isSaved = saved.has(ex.id);
  const orig =
    ex.nameEs && ex.nameEs !== ex.name
      ? `<p class="detail__orig">Nombre en inglés: <span lang="en">${esc(ex.name)}</span></p>`
      : "";
  const facts = [
    ["Nivel", plate(ex.level)],
    ["Tipo", esc(label(CATEGORIES, ex.category))],
    ["Equipo", esc(equipmentText(ex,EQUIPMENT))],
    ex.force ? ["Movimiento", esc(label(FORCES, ex.force))] : null,
    ex.mechanic ? ["Mecánica", esc(label(MECHANICS, ex.mechanic))] : null,
  ].filter(Boolean);
  const mus = (keys) =>
    keys
      .map(
        (m) =>
          `<li><strong>${esc(MUSCLES[m] ?? m)}</strong>${MUSCLE_HINT[m] ? `<span>${esc(MUSCLE_HINT[m])}</span>` : ""}</li>`,
      )
      .join("");
  const sim = similar(data.items, ex);
  const credit =
    ex.credit ||
    (ex.source === "fedb" ? "Free Exercise DB, dominio público" : "");

  main.innerHTML = `
  <article class="wrap detail">
    <a class="back" href="#/" data-back>${icon("back")}Volver a ejercicios</a>
    <header class="detail__head">
      <h1 tabindex="-1">${esc(ex.title)}</h1>
      ${orig}
      ${ex.summary ? `<p class="detail__summary">${esc(ex.summary)}</p>` : ""}
    </header>
    <div class="detail__grid">
      <section class="detail__media" aria-label="Demostración">${mediaBlock(ex)}</section>
      <div class="detail__info">
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>

        <section class="dose" aria-labelledby="dose-h">
          <h2 id="dose-h">Ejemplo orientativo de sesión</h2>
          <p class="dose-note">Ajusta el volumen a tu capacidad. Estos rangos son ejemplos de la app y no prescripciones de las fuentes.</p>
          <fieldset class="seg" data-goal>
            <legend>Tu objetivo</legend>
            ${GOAL_ORDER.map((g) => `<input type="radio" name="goal" id="g-${g}" value="${g}" ${g === goal ? "checked" : ""}><label for="g-${g}">${esc(GOALS[g].label)}</label>`).join("")}
          </fieldset>
          <fieldset class="seg seg--quiet" data-level>
            <legend>Tu nivel</legend>
            ${LEVEL_ORDER.map((l) => `<input type="radio" name="level" id="l-${l}" value="${l}" ${l === level ? "checked" : ""}><label for="l-${l}">${esc(LEVELS[l])}</label>`).join("")}
          </fieldset>
          <div class="dose__out" aria-live="polite">${doseBlock(ex, goal, level)}</div>
        </section>

        <div class="actions">
          <div data-add-slot>${addForm(routineStore.get(),ex)}</div>
          <button type="button" class="btn" data-save-detail aria-pressed="${isSaved}">${icon("bookmark")}<span>${isSaved ? "Guardado" : "Guardar"}</span></button>
          <a class="btn btn--ghost" href="${esc(youtubeUrl(ex))}" target="_blank" rel="noopener">${icon("video")}Buscar video en YouTube</a>
        </div>

        <section class="howto" aria-labelledby="how-h">
          <h2 id="how-h">Cómo hacerlo</h2>
          <div data-steps>${stepsBlock(ex)}</div>
        </section>
        ${ex.safety ? `<aside class="safety-note"><strong>Para practicar con control</strong><p>${esc(ex.safety)}</p></aside>` : ""}
        <section class="source-links" aria-labelledby="refs-h"><h2 id="refs-h">Fuentes y recursos</h2><ul>${(ex.sourceLinks || []).map((ref) => `<li><a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a><small>${ref.kind === "original" ? "Registro original" : ref.kind === "tecnica" ? "Guía específica de técnica" : ref.kind === "video" ? "Demostración de este ejercicio" : "Contexto general; no valida la técnica ni la dosis de esta ficha"}</small></li>`).join("")}<li><a href="${esc(youtubeUrl(ex))}" target="_blank" rel="noopener noreferrer">Buscar demostraciones en YouTube ↗</a><small>Resultados de búsqueda, sin revisión individual</small></li>${ex.videos?.length ? `<li><a href="${esc(ex.videos[0])}" target="_blank" rel="noopener">Abrir video de la demostración ↗</a></li>` : ""}${ex.gif ? `<li><a href="${esc(ex.gif)}" target="_blank" rel="noopener">Abrir GIF ↗</a></li>` : ""}</ul></section>
        ${ex.attributions?.length ? `<details class="attribution"><summary>Autoría y licencias de los recursos</summary><ul>${[...new Map(ex.attributions.map((a) => [`${a.kind}:${a.author}:${a.name}:${a.original || a.mediaUrl || ""}`, a])).values()].map((a) => `<li><strong>${esc(a.kind)}</strong>: ${esc(a.author)} · ${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : esc(a.name)}${a.source ? ` · <a href="${esc(a.source)}" target="_blank" rel="noopener">Fuente</a>` : ""}${a.changes ? `<p>${esc(a.changes)}</p>` : ""}${a.notice?`<p>${esc(a.notice)}</p>`:""}</li>`).join("")}</ul></details>` : ""}

        ${
          ex.primary.length || ex.secondary.length
            ? `
        <section class="muscles" aria-labelledby="mus-h">
          <h2 id="mus-h">Músculos que trabaja</h2>
          ${ex.primary.length ? `<h3>Principal</h3><ul class="mlist">${mus(ex.primary)}</ul>` : ""}
          ${ex.secondary.length ? `<h3>También ayudan</h3><ul class="mlist mlist--soft">${mus(ex.secondary)}</ul>` : ""}
        </section>`
            : ""
        }

        ${credit ? `<p class="credit">Fuente: ${esc(credit)}</p>` : ""}
      </div>
    </div>
    ${sim.length ? `<section class="similar" aria-labelledby="sim-h"><h2 id="sim-h">Ejercicios parecidos</h2><ul class="grid grid--4" role="list">${sim.map(card).join("")}</ul></section>` : ""}
  </article>`;

  // Volver respetando la búsqueda anterior cuando venimos del catálogo.
  $("[data-back]", main).addEventListener("click", (e) => {
    if (nav.prev !== null && /^(#\/?)?(\?.*)?$/.test(nav.prev)) {
      e.preventDefault();
      history.back();
    }
  });

  // Cambio de objetivo y nivel
  const out = $(".dose__out", main);
  $("[data-goal]", main).addEventListener("change", (e) => {
    goal = e.target.value;
    prefs.setGoal(goal);
    out.innerHTML = doseBlock(ex, goal, level);
  });
  $("[data-level]", main).addEventListener("change", (e) => {
    level = e.target.value;
    prefs.setLevel(level);
    out.innerHTML = doseBlock(ex, goal, level);
  });

  // Selector de tipo de demostración
  const mediaSeg = $(".seg--media", main);
  mediaSeg?.addEventListener("change", (e) => {
    $$(".media__panel", main).forEach((p) => {
      p.hidden = p.dataset.panel !== e.target.value;
    });
    if (e.target.value !== "fotos") stop();
    stopSchema();
    const gifImg = $("[data-gif-src]", main);
    if (gifImg) {
      gifImg.src = gifImg.dataset.gifPoster;
      const gifButton = $("[data-gif-toggle]",main);
      if(gifButton){gifButton.setAttribute("aria-pressed","false");gifButton.textContent="Reproducir GIF";}
    }
    $$("video", main).forEach((v) => {
      if (e.target.value !== "video") v.pause();
    });
  });

  // Animación con las dos fotos: alterna entre la posición inicial y la final.
  const flip = $(".flip", main);
  let timer = null;
  const setFrame = (i) => {
    if (!flip) return;
    $$(".flip__frame", flip).forEach((im, k) =>
      im.classList.toggle("is-on", k === i),
    );
    $$("[data-frame-btn]", flip).forEach((b) =>
      b.setAttribute("aria-pressed", String(Number(b.dataset.frameBtn) === i)),
    );
    $(".flip__label", flip).textContent = `Referencia ${i + 1}`;
    flip.dataset.frame = String(i);
  };
  const toggleBtn = flip && $("[data-flip-toggle]", flip);
  const stop = () => {
    clearInterval(timer);
    timer = null;
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.innerHTML = `${icon("play")}<span>Alternar fotos</span>`;
    }
  };
  const play = () => {
    stop();
    timer = setInterval(
      () => setFrame(flip.dataset.frame === "0" ? 1 : 0),
      1100,
    );
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.innerHTML = `${icon("pause")}<span>Pausar</span>`;
  };
  if (flip) {
    toggleBtn?.addEventListener("click", () => (timer ? stop() : play()));
    $$("[data-frame-btn]", flip).forEach((b) =>
      b.addEventListener("click", () => {
        stop();
        setFrame(Number(b.dataset.frameBtn));
      }),
    );
    // No animar por defecto: dos fotos no reproducen el movimiento completo.
  }

  // Guardar
  const saveBtn = $("[data-save-detail]", main);
  saveBtn.addEventListener("click", () => {
    let now;try{now=saved.toggle(ex.id);}catch(err){toast(err.message);return;}
    saveBtn.setAttribute("aria-pressed", String(now));
    saveBtn.querySelector("span").textContent = now ? "Guardado" : "Guardar";
    toast(now ? "Guardado en tu lista" : "Quitado de guardados");
  });

  // Agregar a la rutina
  const addTo = (dayIndex, r) => {
    if(r.prefs && !canUseEquipment(ex,r.prefs.equipment)){toast('Falta equipo obligatorio para agregar este ejercicio.');return;}
    const p = r.prefs ?? { goal, level };
    r.days[dayIndex].items.push(
      makeItem(ex, { ...p, goal: p.goal ?? goal, level: p.level ?? level }),
    );
    routineStore.set(r);
    toast(`Agregado a ${r.days[dayIndex].title}`, {
      action: "Ver rutina",
      onAction: () => {
        location.hash = "#/rutina";
      },
    });
  };
  const addSlot = $("[data-add-slot]", main);
  addSlot.addEventListener("click", (e) => {
    if (!e.target.closest("[data-add-new]")) return;
    const r = emptyRoutine({
      goal,
      level,
      days: 1,
      minutes: 45,
      equipment: [],
      focus: [],
    });
    r.prefs = null;
    addTo(0, r);
    addSlot.innerHTML = addForm(r,ex);
  });
  addSlot.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = routineStore.get();
    if (!r) return;
    addTo(Number($("#add-day", main).value), r);
  });

  // Traducción
  const stepsBox = $("[data-steps]", main);
  stepsBox.addEventListener("click", async (e) => {
    if (e.target.closest("[data-show-original]")) {
      stepsBox.innerHTML = `<ol class="steps" lang="en">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <p class="lang-note"><button type="button" class="link-btn" data-show-es>Volver al español</button></p>`;
      return;
    }
    if (e.target.closest("[data-show-es]")) {
      stepsBox.innerHTML = stepsBlock(ex);
      return;
    }
    const btn = e.target.closest("[data-translate]");
    if (!btn) return;
    const status = $(".status", stepsBox);
    btn.disabled = true;
    try {
      const av = await availability();
      if (av === "unavailable") throw new Error("no disponible");
      if (av !== "available")
        status.textContent =
          "Descargando el traductor del navegador. Solo pasa la primera vez.";
      else status.textContent = "Traduciendo…";
      const es = await translateSteps(ex.steps, (p) => {
        status.textContent = `Descargando traductor ${Math.round(p * 100)}%`;
      });
      translations.set(ex.id, es);
      stepsBox.innerHTML = stepsBlock(ex);
    } catch {
      btn.disabled = false;
      status.textContent =
        "Tu navegador no pudo traducir este texto. Usa el enlace a Google Translate.";
    }
  });

  let schemaTimer = null,
    schemaFrame = 0;
  const schemaButton = $("[data-schema-toggle]", main);
  function stopSchema() {
    clearInterval(schemaTimer);
    schemaTimer = null;
    if (schemaButton) {
      schemaButton.setAttribute("aria-pressed", "false");
      schemaButton.textContent = "Alternar posturas";
    }
  }
  schemaButton?.addEventListener("click", () => {
    if (schemaTimer) {
      stopSchema();
      return;
    }
    const change = () => {
      schemaFrame = (schemaFrame + 1) % POSES[ex.family].length;
      $(".motion-schema", main).innerHTML = motionSVG(ex.family, schemaFrame);
    };
    change();
  });
  const disposeVideo=wireVideo(main,ex);
  $("[data-gif-toggle]",main)?.addEventListener('click',event=>{
    const button=event.currentTarget, gif=$("[data-gif-src]",main);
    const playing=button.getAttribute('aria-pressed')!=='true';
    gif.src=playing?gif.dataset.gifSrc:gif.dataset.gifPoster;
    button.setAttribute('aria-pressed',String(playing));button.textContent=playing?'Pausar GIF':'Reproducir GIF';
  });
  const externalTimers=[];
  $$("[data-load-demo]",main).forEach(button=>button.addEventListener('click',()=>{
    const i=Number(button.dataset.loadDemo),d=ex.demonstrations[i],slot=$(`[data-demo-slot="${i}"]`,main),status=$(`[data-external-status="${i}"]`,main);
    const iframe=document.createElement('iframe');iframe.title=d.title;iframe.allow='fullscreen; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=d.embed;
    status.textContent='Cargando el reproductor externo. Si no muestra imagen, abre el video en la fuente.';
    iframe.addEventListener('load',()=>{status.textContent='El proveedor controla la reproducción. Si no ves la demostración, usa el enlace de la fuente.';});
    iframe.addEventListener('error',()=>{status.textContent='No se pudo cargar. Abre el enlace de la fuente.';});
    slot.replaceChildren(iframe);button.hidden=true;
    externalTimers.push(setTimeout(()=>{status.textContent='Si el reproductor sigue sin mostrar imagen, puede haber un bloqueo del proveedor o de la red. Abre el enlace de la fuente.';},12000));
  }));

  if (sim.length) {
    const g = $(".similar .grid", main);
    wireCardHover(g);
    wireSaveButtons(g);
  }

  return () => {
    stop();
    stopSchema();
    disposeVideo();
    externalTimers.forEach(clearTimeout);
    $$("iframe",main).forEach(frame=>frame.remove());
  };
}
