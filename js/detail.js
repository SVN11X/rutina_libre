import { loadData, similar } from './data.js';
import { MUSCLES, MUSCLE_HINT, EQUIPMENT, CATEGORIES, FORCES, MECHANICS, LEVELS, LEVEL_ORDER, label } from './i18n.js';
import { GOALS, GOAL_ORDER, prescribe } from './reps.js';
import { esc, icon, img, plate, placeholder, setTitle, toast, reducedMotion, nav, $, $$ } from './ui.js';
import { saved, prefs, routineStore, translations } from './store.js';
import { card, wireCardHover, wireSaveButtons } from './catalog.js';
import { canTranslateHere, translateSteps, googleTranslateUrl, availability } from './translate.js';
import { emptyRoutine, makeItem } from './generator.js';

function splitRest(rest) {
  const m = /^([\d\s]+(?:a\s[\d\s]+)?)\s(segundos|minutos)$/.exec(rest || '');
  return m ? { num: m[1].trim(), unit: `${m[2]} de descanso` } : { num: rest || 'Sin pausa', unit: rest ? 'de descanso' : 'entre rondas', small: true };
}

function doseBlock(ex, goal, level) {
  const p = prescribe(ex, goal, level);
  const r = splitRest(p.rest);
  const g = GOALS[goal];
  const showTip = !['stretching', 'cardio'].includes(ex.category);
  return `
    <div class="dose__numbers">
      <div class="dose__cell"><span class="num">${p.series}</span><span class="num-label">${esc(p.series === 1 ? (p.seriesLabel === 'vez' ? 'vez' : 'serie') : p.seriesLabel)}</span></div>
      <div class="dose__cell"><span class="num ${p.amount.length > 8 ? 'num--small' : ''}">${esc(p.amount)}</span><span class="num-label">${esc(p.unit)}</span></div>
      ${p.rest || ex.category !== 'cardio' ? `<div class="dose__cell"><span class="num ${r.small || r.num.length > 8 ? 'num--small' : ''}">${esc(r.num)}</span><span class="num-label">${esc(r.unit)}</span></div>` : ''}
    </div>
    ${showTip ? `<p class="dose__tip">${esc(g.tip)}</p>` : ''}`;
}

function mediaBlock(ex) {
  const modes = [];
  if (ex.gif) modes.push(['gif', 'Animación']);
  if (ex.images.length) modes.push(['fotos', ex.images.length > 1 ? 'Fotos paso a paso' : 'Foto']);
  if (ex.videos?.length) modes.push(['video', 'Video']);
  if (!modes.length) {
    return `<div class="media media--empty">${placeholder(ex)}<p>Este ejercicio no tiene imágenes. Puedes buscar un video de referencia con el botón de YouTube.</p></div>`;
  }
  let initial = modes[0][0];
  if (reducedMotion() && modes.some((m) => m[0] === 'fotos')) initial = 'fotos';

  const tabs = modes.length > 1
    ? `<fieldset class="seg seg--media"><legend class="visually-hidden">Tipo de demostración</legend>${modes.map(([k, t]) => `<input type="radio" name="media" id="m-${k}" value="${k}" ${k === initial ? 'checked' : ''}><label for="m-${k}">${esc(t)}</label>`).join('')}</fieldset>`
    : '';

  const fotos = ex.images.length ? `
    <div class="media__panel" data-panel="fotos" ${initial === 'fotos' ? '' : 'hidden'}>
      <div class="flip" data-frame="0">
        <div class="flip__stage">
          ${ex.images.slice(0, 2).map((u, i) => img(u, i === 0 ? `${ex.title}, posición inicial` : `${ex.title}, posición final`, { cls: `flip__frame ${i === 0 ? 'is-on' : ''}`, eager: i === 0, w: 850, h: 567 })).join('')}
          <span class="flip__label" aria-hidden="true">Posición inicial</span>
        </div>
        ${ex.images.length > 1 ? `
        <div class="flip__controls">
          <button type="button" class="btn btn--small" data-flip-toggle aria-pressed="false">${icon('play')}<span>Ver movimiento</span></button>
          <div class="flip__thumbs" role="group" aria-label="Elegir posición">
            <button type="button" data-frame-btn="0" aria-pressed="true">1. Inicio</button>
            <button type="button" data-frame-btn="1" aria-pressed="false">2. Final</button>
          </div>
        </div>` : ''}
      </div>
    </div>` : '';

  const gif = ex.gif ? `
    <div class="media__panel" data-panel="gif" ${initial === 'gif' ? '' : 'hidden'}>
      <div class="gif">${img(ex.gif, `Animación de ${ex.title}`, { eager: initial === 'gif', w: 360, h: 360 })}</div>
    </div>` : '';

  const video = ex.videos?.length ? `
    <div class="media__panel" data-panel="video" ${initial === 'video' ? '' : 'hidden'}>
      <video controls preload="none" playsinline src="${esc(ex.videos[0])}" ${ex.images[0] ? `poster="${esc(ex.images[0])}"` : ''}>Tu navegador no puede reproducir este video.</video>
    </div>` : '';

  return `<div class="media">${tabs}${gif}${fotos}${video}</div>`;
}

function youtubeUrl(ex) {
  const q = ex.nameEs ? `cómo hacer ${ex.nameEs} ejercicio` : `${ex.name} exercise proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function addForm(r) {
  if (!r || !r.days.length) {
    return `<button type="button" class="btn btn--primary" data-add-new>${icon('plus')}Agregar a mi rutina</button>`;
  }
  return `<form class="add-form" data-add-form>
      <label for="add-day">Agregar a</label>
      <select id="add-day">${r.days.map((d, i) => `<option value="${i}">${esc(d.title)}</option>`).join('')}</select>
      <button type="submit" class="btn btn--primary">${icon('plus')}Agregar</button>
    </form>`;
}

function stepsBlock(ex) {
  const cached = !ex.stepsEs?.length ? translations.get(ex.id) : null;
  const es = ex.stepsEs?.length ? ex.stepsEs : cached;
  const list = es || ex.steps;
  if (!list?.length) return '<p class="muted">Este ejercicio no trae instrucciones escritas. Revisa las imágenes o busca un video de referencia.</p>';
  const isEn = !es;
  return `
    <ol class="steps" lang="${isEn ? 'en' : 'es'}">${list.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="lang-note" data-lang-note>
      ${isEn
        ? `<p>Las instrucciones originales están en inglés.</p>
           <div class="lang-note__actions">
             ${canTranslateHere() ? `<button type="button" class="btn btn--small" data-translate>${icon('translate')}Traducir al español</button>` : ''}
             <a class="btn btn--small btn--ghost" href="${esc(googleTranslateUrl(ex.steps.join('\n')))}" target="_blank" rel="noopener">Abrir en Google Translate</a>
           </div>
           <p class="status" aria-live="polite"></p>`
        : `<p>${ex.stepsEs?.length ? 'Traducción hecha por la comunidad de wger.' : 'Traducción automática hecha en tu navegador.'}${ex.steps?.length ? ' <button type="button" class="link-btn" data-show-original>Ver original en inglés</button>' : ''}</p>`}
    </div>`;
}

export async function renderDetail(main, rawId) {
  const data = await loadData();
  const id = decodeURIComponent(rawId);
  const ex = data.byId.get(id);
  if (!ex) {
    setTitle('No encontrado');
    main.innerHTML = `<div class="wrap page"><h1 tabindex="-1">No encontramos ese ejercicio</h1><p>Puede que el enlace esté incompleto o que el ejercicio haya cambiado de nombre.</p><a class="btn btn--primary" href="#/">Ver todos los ejercicios</a></div>`;
    return;
  }
  setTitle(ex.title);
  let goal = prefs.goal();
  let level = prefs.level();
  const isSaved = saved.has(ex.id);
  const orig = ex.nameEs && ex.nameEs !== ex.name ? `<p class="detail__orig">Nombre en inglés: <span lang="en">${esc(ex.name)}</span></p>` : '';
  const facts = [
    ['Nivel', plate(ex.level)],
    ['Tipo', esc(label(CATEGORIES, ex.category))],
    ['Equipo', esc(label(EQUIPMENT, ex.equipment, 'Sin equipo'))],
    ex.force ? ['Movimiento', esc(label(FORCES, ex.force))] : null,
    ex.mechanic ? ['Mecánica', esc(label(MECHANICS, ex.mechanic))] : null,
  ].filter(Boolean);
  const mus = (keys) => keys.map((m) => `<li><strong>${esc(MUSCLES[m] ?? m)}</strong>${MUSCLE_HINT[m] ? `<span>${esc(MUSCLE_HINT[m])}</span>` : ''}</li>`).join('');
  const sim = similar(data.items, ex);
  const credit = ex.credit || (ex.source === 'fedb' ? 'Free Exercise DB, dominio público' : '');

  main.innerHTML = `
  <article class="wrap detail">
    <a class="back" href="#/" data-back>${icon('back')}Volver a ejercicios</a>
    <header class="detail__head">
      <h1 tabindex="-1">${esc(ex.title)}</h1>
      ${orig}
    </header>
    <div class="detail__grid">
      <section class="detail__media" aria-label="Demostración">${mediaBlock(ex)}</section>
      <div class="detail__info">
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>

        <section class="dose" aria-labelledby="dose-h">
          <h2 id="dose-h">Cuánto hacer</h2>
          <fieldset class="seg" data-goal>
            <legend>Tu objetivo</legend>
            ${GOAL_ORDER.map((g) => `<input type="radio" name="goal" id="g-${g}" value="${g}" ${g === goal ? 'checked' : ''}><label for="g-${g}">${esc(GOALS[g].label)}</label>`).join('')}
          </fieldset>
          <fieldset class="seg seg--quiet" data-level>
            <legend>Tu nivel</legend>
            ${LEVEL_ORDER.map((l) => `<input type="radio" name="level" id="l-${l}" value="${l}" ${l === level ? 'checked' : ''}><label for="l-${l}">${esc(LEVELS[l])}</label>`).join('')}
          </fieldset>
          <div class="dose__out" aria-live="polite">${doseBlock(ex, goal, level)}</div>
        </section>

        <div class="actions">
          <div data-add-slot>${addForm(routineStore.get())}</div>
          <button type="button" class="btn" data-save-detail aria-pressed="${isSaved}">${icon('bookmark')}<span>${isSaved ? 'Guardado' : 'Guardar'}</span></button>
          <a class="btn btn--ghost" href="${esc(youtubeUrl(ex))}" target="_blank" rel="noopener">${icon('video')}Buscar video en YouTube</a>
        </div>

        <section class="howto" aria-labelledby="how-h">
          <h2 id="how-h">Cómo hacerlo</h2>
          <div data-steps>${stepsBlock(ex)}</div>
        </section>

        ${ex.primary.length || ex.secondary.length ? `
        <section class="muscles" aria-labelledby="mus-h">
          <h2 id="mus-h">Músculos que trabaja</h2>
          ${ex.primary.length ? `<h3>Principal</h3><ul class="mlist">${mus(ex.primary)}</ul>` : ''}
          ${ex.secondary.length ? `<h3>También ayudan</h3><ul class="mlist mlist--soft">${mus(ex.secondary)}</ul>` : ''}
        </section>` : ''}

        ${credit ? `<p class="credit">Fuente: ${esc(credit)}</p>` : ''}
      </div>
    </div>
    ${sim.length ? `<section class="similar" aria-labelledby="sim-h"><h2 id="sim-h">Ejercicios parecidos</h2><ul class="grid grid--4" role="list">${sim.map(card).join('')}</ul></section>` : ''}
  </article>`;

  // Volver respetando la búsqueda anterior cuando venimos del catálogo.
  $('[data-back]', main).addEventListener('click', (e) => {
    if (nav.prev !== null && /^(#\/?)?(\?.*)?$/.test(nav.prev)) { e.preventDefault(); history.back(); }
  });

  // Cambio de objetivo y nivel
  const out = $('.dose__out', main);
  $('[data-goal]', main).addEventListener('change', (e) => { goal = e.target.value; prefs.setGoal(goal); out.innerHTML = doseBlock(ex, goal, level); });
  $('[data-level]', main).addEventListener('change', (e) => { level = e.target.value; prefs.setLevel(level); out.innerHTML = doseBlock(ex, goal, level); });

  // Selector de tipo de demostración
  const mediaSeg = $('.seg--media', main);
  mediaSeg?.addEventListener('change', (e) => {
    $$('.media__panel', main).forEach((p) => { p.hidden = p.dataset.panel !== e.target.value; });
    if (e.target.value !== 'fotos') stop();
    $$('video', main).forEach((v) => { if (e.target.value !== 'video') v.pause(); });
  });

  // Animación con las dos fotos: alterna entre la posición inicial y la final.
  const flip = $('.flip', main);
  let timer = null;
  const setFrame = (i) => {
    if (!flip) return;
    $$('.flip__frame', flip).forEach((im, k) => im.classList.toggle('is-on', k === i));
    $$('[data-frame-btn]', flip).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.frameBtn) === i)));
    $('.flip__label', flip).textContent = i === 0 ? 'Posición inicial' : 'Posición final';
    flip.dataset.frame = String(i);
  };
  const toggleBtn = flip && $('[data-flip-toggle]', flip);
  const stop = () => {
    clearInterval(timer);
    timer = null;
    if (toggleBtn) { toggleBtn.setAttribute('aria-pressed', 'false'); toggleBtn.innerHTML = `${icon('play')}<span>Ver movimiento</span>`; }
  };
  const play = () => {
    stop();
    timer = setInterval(() => setFrame(flip.dataset.frame === '0' ? 1 : 0), 1100);
    toggleBtn.setAttribute('aria-pressed', 'true');
    toggleBtn.innerHTML = `${icon('pause')}<span>Pausar</span>`;
  };
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => (timer ? stop() : play()));
    $$('[data-frame-btn]', flip).forEach((b) => b.addEventListener('click', () => { stop(); setFrame(Number(b.dataset.frameBtn)); }));
    if (!reducedMotion() && !ex.gif) play();
  }

  // Guardar
  const saveBtn = $('[data-save-detail]', main);
  saveBtn.addEventListener('click', () => {
    const now = saved.toggle(ex.id);
    saveBtn.setAttribute('aria-pressed', String(now));
    saveBtn.querySelector('span').textContent = now ? 'Guardado' : 'Guardar';
    toast(now ? 'Guardado en tu lista' : 'Quitado de guardados');
  });

  // Agregar a la rutina
  const addTo = (dayIndex, r) => {
    const p = r.prefs ?? { goal, level };
    r.days[dayIndex].items.push(makeItem(ex, { ...p, goal: p.goal ?? goal, level: p.level ?? level }));
    routineStore.set(r);
    toast(`Agregado a ${r.days[dayIndex].title}`, { action: 'Ver rutina', onAction: () => { location.hash = '#/rutina'; } });
  };
  const addSlot = $('[data-add-slot]', main);
  addSlot.addEventListener('click', (e) => {
    if (!e.target.closest('[data-add-new]')) return;
    const r = emptyRoutine({ goal, level, days: 1, minutes: 45, equipment: [], focus: [] });
    r.prefs = null;
    addTo(0, r);
    addSlot.innerHTML = addForm(r);
  });
  addSlot.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = routineStore.get();
    if (!r) return;
    addTo(Number($('#add-day', main).value), r);
  });

  // Traducción
  const stepsBox = $('[data-steps]', main);
  stepsBox.addEventListener('click', async (e) => {
    if (e.target.closest('[data-show-original]')) {
      stepsBox.innerHTML = `<ol class="steps" lang="en">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <p class="lang-note"><button type="button" class="link-btn" data-show-es>Volver al español</button></p>`;
      return;
    }
    if (e.target.closest('[data-show-es]')) { stepsBox.innerHTML = stepsBlock(ex); return; }
    const btn = e.target.closest('[data-translate]');
    if (!btn) return;
    const status = $('.status', stepsBox);
    btn.disabled = true;
    try {
      const av = await availability();
      if (av === 'unavailable') throw new Error('no disponible');
      if (av !== 'available') status.textContent = 'Descargando el traductor del navegador. Solo pasa la primera vez.';
      else status.textContent = 'Traduciendo…';
      const es = await translateSteps(ex.steps, (p) => { status.textContent = `Descargando traductor ${Math.round(p * 100)}%`; });
      translations.set(ex.id, es);
      stepsBox.innerHTML = stepsBlock(ex);
    } catch {
      btn.disabled = false;
      status.textContent = 'Tu navegador no pudo traducir este texto. Usa el enlace a Google Translate.';
    }
  });

  if (sim.length) {
    const g = $('.similar .grid', main);
    wireCardHover(g);
    wireSaveButtons(g);
  }

  return () => stop();
}
