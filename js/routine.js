import { loadData, search, EMPTY_FILTERS } from './data.js';
import { ZONES, EQUIPMENT, EQUIPMENT_HINT, LEVELS, LEVEL_ORDER, muscleList, label } from './i18n.js';
import { GOALS, GOAL_ORDER } from './reps.js';
import { generateRoutine, emptyRoutine, makeItem, alternatives, summary, poolFilter, EQUIPMENT_PRESETS, EXERCISES_PER_MINUTES } from './generator.js';
import { equipmentText, canUseEquipment } from './equipment.js';
import { dayDuration } from './duration.js';
import { esc, icon, img, thumbOf, placeholder, setTitle, toast, debounce, go, $, $$ } from './ui.js';
import { routineStore, prefs as prefStore } from './store.js';
import { exportRoutinePdf } from './pdf.js';

const LEVEL_HINT = {
  beginner: 'Menos de 6 meses entrenando',
  intermediate: 'Entre 6 meses y 2 años',
  expert: 'Más de 2 años de forma constante',
};

function defaults() {
  return prefStore.wizard() ?? {
    goal: prefStore.goal(),
    level: prefStore.level(),
    days: 3,
    minutes: 45,
    equipment: ['dumbbell'],
    focus: [],
  };
}

function radios(name, options, current) {
  return options
    .map(([v, t, hint]) => `<label class="choice"><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(current) ? 'checked' : ''} required><span class="choice__body"><span class="choice__title">${esc(t)}</span>${hint ? `<span class="choice__hint">${esc(hint)}</span>` : ''}</span></label>`)
    .join('');
}

function wizardHtml(p, hasRoutine) {
  const eqKeys = Object.keys(EQUIPMENT).filter((k) => !['body only','unknown','other'].includes(k));
  return `
  <div class="wrap page routine-wizard">
    <header class="page__head">
      <h1 tabindex="-1">${hasRoutine ? 'Cambiar mi rutina' : 'Crea tu rutina'}</h1>
      <p class="lead">Responde seis preguntas y armamos una rutina semanal con ejercicios que puedes hacer con lo que tienes. Después puedes cambiar cualquier ejercicio y descargarla en PDF.</p>
    </header>
    <form class="wizard" id="wizard" novalidate>
      <fieldset class="q">
        <legend><span class="q__n">1</span>¿Qué quieres lograr?</legend>
        <div class="choices choices--goal">${radios('goal', GOAL_ORDER.map((g) => [g, GOALS[g].label, GOALS[g].desc]), p.goal)}</div>
      </fieldset>
      <fieldset class="q">
        <legend><span class="q__n">2</span>¿Cuánta experiencia tienes?</legend>
        <div class="choices">${radios('level', LEVEL_ORDER.map((l) => [l, LEVELS[l], LEVEL_HINT[l]]), p.level)}</div>
      </fieldset>
      <fieldset class="q">
        <legend><span class="q__n">3</span>¿Cuántos días a la semana puedes entrenar?</legend>
        <div class="choices choices--row">${radios('days', [2, 3, 4, 5, 6].map((d) => [d, `${d} días`]), p.days)}</div>
      </fieldset>
      <fieldset class="q">
        <legend><span class="q__n">4</span>¿Cuánto tiempo tienes por sesión?</legend>
        <div class="choices choices--row">${radios('minutes', Object.keys(EXERCISES_PER_MINUTES).map((m) => [m, `${m} min`]), p.minutes)}</div>
      </fieldset>
      <fieldset class="q">
        <legend><span class="q__n">5</span>¿Con qué equipo cuentas?</legend>
        <p class="q__help">Los ejercicios con tu propio peso siempre se incluyen. Elige un atajo o marca uno por uno.</p>
        <div class="presets" role="group" aria-label="Atajos de equipo">
          ${Object.entries(EQUIPMENT_PRESETS).map(([k, v]) => `<button type="button" class="chip" data-preset="${k}">${esc(v.label)}</button>`).join('')}
        </div>
        <ul class="checks">
          <li><label class="check"><input type="checkbox" checked disabled><span>Peso corporal</span></label></li>
          ${eqKeys.map((k) => `<li><label class="check"><input type="checkbox" name="equipment" value="${esc(k)}" ${p.equipment?.includes(k) ? 'checked' : ''}><span>${esc(EQUIPMENT[k])}${EQUIPMENT_HINT[k] ? `<small>${esc(EQUIPMENT_HINT[k])}</small>` : ''}</span></label></li>`).join('')}
        </ul>
      </fieldset>
      <fieldset class="q">
        <legend><span class="q__n">6</span>¿Quieres darle prioridad a alguna zona? <span class="optional">Opcional</span></legend>
        <ul class="checks checks--chips">
          ${ZONES.filter((z) => z.id !== 'cuello').map((z) => `<li><label class="check check--chip"><input type="checkbox" name="focus" value="${z.id}" ${p.focus?.includes(z.id) ? 'checked' : ''}><span>${esc(z.label)}</span></label></li>`).join('')}
        </ul>
      </fieldset>
      <p class="form-error" role="alert" hidden></p>
      <div class="wizard__actions">
        <button type="submit" class="btn btn--primary btn--large">Crear mi rutina</button>
        ${hasRoutine ? '<a class="btn btn--ghost" href="#/rutina">Volver a mi rutina sin cambios</a>' : '<button type="button" class="btn btn--ghost" data-blank>Prefiero armarla yo desde cero</button>'}
      </div>
    </form>
  </div>`;
}

function readWizard(form) {
  const fd = new FormData(form);
  return {
    goal: fd.get('goal'),
    level: fd.get('level'),
    days: Number(fd.get('days')),
    minutes: Number(fd.get('minutes')),
    equipment: fd.getAll('equipment'),
    focus: fd.getAll('focus'),
  };
}

function renderWizard(main, data, existing) {
  setTitle(existing ? 'Cambiar mi rutina' : 'Crea tu rutina');
  const p = existing?.prefs ?? defaults();
  main.innerHTML = wizardHtml(p, Boolean(existing));
  const form = $('#wizard', main);

  form.addEventListener('click', (e) => {
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      const eq = EQUIPMENT_PRESETS[pre.dataset.preset].equipment;
      $$('input[name="equipment"]', form).forEach((i) => { i.checked = eq.includes(i.value); });
      toast(`Equipo marcado: ${EQUIPMENT_PRESETS[pre.dataset.preset].label.toLowerCase()}`);
    }
    if (e.target.closest('[data-blank]')) {
      const w = readWizard(form);
      const r = emptyRoutine({ ...w, days: w.days || 3 });
      routineStore.set(r);
      go('#/rutina');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = readWizard(form);
    const err = $('.form-error', form);
    const missing = ['goal', 'level', 'days', 'minutes'].filter((k) => !w[k]);
    if (missing.length) {
      err.hidden = false;
      err.textContent = 'Falta responder alguna pregunta. Revisa las preguntas 1 a 4.';
      form.querySelector(`[name="${missing[0]}"]`)?.focus();
      return;
    }
    prefStore.setWizard(w);
    prefStore.setGoal(w.goal);
    prefStore.setLevel(w.level);
    const prev = routineStore.get();
    const r = generateRoutine(data.items, w);
    if (prev) { r.title = prev.title; r.notes = prev.notes; }
    routineStore.set(r);
    go('#/rutina');
    if (prev) toast('Rutina nueva creada', { action: 'Deshacer', onAction: () => { routineStore.set(prev); go('#/rutina'); } });
  });
}

function itemHtml(ex, it, di, ii, total) {
  const t = thumbOf(ex);
  return `<li class="item" data-day="${di}" data-i="${ii}">
    <a class="item__thumb" href="#/ejercicio/${encodeURIComponent(ex.id)}" tabindex="-1" aria-hidden="true">${t ? img(t, '', { w: 150, h: 100 }) : placeholder(ex)}</a>
    <div class="item__main">
      <h3 class="item__title"><span class="item__n">${ii + 1}</span><a href="#/ejercicio/${encodeURIComponent(ex.id)}">${esc(ex.title)}</a></h3>
      <p class="item__meta">${esc([muscleList(ex.primary), equipmentText(ex,EQUIPMENT)].filter(Boolean).join('. '))}</p>
      <div class="item__dose">
        <label class="field field--n"><span>${esc(it.seriesLabel === 'rondas' ? 'Rondas' : 'Series')}</span><input type="number" inputmode="numeric" min="1" max="20" value="${esc(it.series)}" data-field="series"></label>
        <label class="field field--reps"><span>Repeticiones o tiempo</span><input type="text" value="${esc(it.reps)}" data-field="reps"></label>
        <label class="field field--rest"><span>Descanso</span><input type="text" value="${esc(it.rest)}" data-field="rest" placeholder="Sin pausa"></label>
      </div>
    </div>
    <div class="item__tools" role="group" aria-label="Acciones para ${esc(ex.title)}">
      <button type="button" class="icon-btn" data-act="up" aria-label="Subir" ${ii === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button type="button" class="icon-btn" data-act="down" aria-label="Bajar" ${ii === total - 1 ? 'disabled' : ''}>${icon('down')}</button>
      <button type="button" class="btn btn--small btn--ghost" data-act="swap">${icon('swap')}Cambiar</button>
      <button type="button" class="btn btn--small btn--ghost btn--danger" data-act="remove">${icon('trash')}Quitar</button>
    </div>
  </li>`;
}

function editorHtml(r, data) {
  const get = (id) => data.byId.get(id);
  const days = r.days
    .map((d, di) => {
      const entries = d.items.map((it,ii)=>({it,ii})).filter(({it})=>get(it.exId));
      const items = entries.map(({it})=>it);
      const unresolved=d.items.length-items.length;
      const incompatible=r.prefs?items.filter(it=>!canUseEquipment(get(it.exId),r.prefs.equipment)).length:0;
      const cool = (d.cooldown || []).map(get).filter(Boolean);
      return `<section class="day" aria-labelledby="day-${di}">
        <header class="day__head">
          <h2 class="day__title" id="day-${di}"><label class="visually-hidden" for="day-name-${di}">Nombre del día</label><input class="day__name" id="day-name-${di}" value="${esc(d.title)}" data-day-name="${di}"></h2>
          <p class="day__duration" data-day-duration="${di}">${esc(dayDuration(d).label)}</p><span class="day__count">${items.length} ${items.length === 1 ? 'ejercicio' : 'ejercicios'}</span>
          <button type="button" class="btn btn--small btn--ghost btn--danger" data-act="remove-day" data-day="${di}">Quitar día</button>
        </header>
        ${items.length ? `<ol class="items" role="list">${entries.map(({it,ii}) => itemHtml(get(it.exId), it, di, ii, d.items.length)).join('')}</ol>` : '<p class="day__empty">Este día está vacío. Agrega ejercicios desde aquí o desde el catálogo.</p>'}
        ${unresolved?`<p class="safety-note">${unresolved} registros de esta rutina no están disponibles; sus IDs se conservan.</p>`:""}${incompatible?`<p class="safety-note">${incompatible} ejercicios requieren equipo adicional. Revisa tus implementos o utiliza Cambiar.</p>`:""}<div class="day__foot">
          <button type="button" class="btn btn--ghost" data-act="add" data-day="${di}">${icon('plus')}Agregar ejercicio</button>
          ${cool.length ? `<p class="day__cool">Para terminar: ${cool.map((c,i) => `<a href="#/ejercicio/${encodeURIComponent(c.id)}">${esc(c.title)}</a>${d.cooldownItems?.[i]?' · '+esc(d.cooldownItems[i].reps):' · consulta la dosis en la ficha'}`).join('; ')}.</p>` : ''}
        </div>
      </section>`;
    })
    .join('');

  return `
  <div class="wrap page routine">
    <header class="routine__head">
      <div class="routine__title">
        <label class="visually-hidden" for="r-title">Nombre de la rutina</label>
        <h1 tabindex="-1"><input id="r-title" class="routine__name" value="${esc(r.title || 'Mi rutina')}" data-title></h1>
        <p class="lead">${r.prefs ? esc(summary(r.prefs)) : 'Rutina armada por ti'}</p>
      </div>
      <div class="routine__export">
        <div class="pdf-opts">
          <label class="check"><input type="checkbox" id="pdf-photos" checked><span>Incluir fotos</span></label>
          <label class="check"><input type="checkbox" id="pdf-steps" checked><span>Incluir instrucciones breves</span></label>
        </div>
        <div class="routine__btns">
          <button type="button" class="btn btn--primary" data-act="pdf">${icon('download')}Descargar PDF</button>
          <button type="button" class="btn" data-act="print">${icon('print')}Imprimir</button>
        </div>
        <p class="status" aria-live="polite" data-pdf-status></p>
      </div>
    </header>

    <div class="routine__how">
      <p><strong>Cómo usarla.</strong> Sigue los bloques de calentamiento y recuperación incluidos. Si tu rutina anterior no los tiene, añade movimiento suave adecuado antes de entrenar. Consulta la ficha para ver la técnica y sus fuentes. Si un ejercicio no te acomoda, usa Cambiar y te proponemos otro parecido.</p>
    </div>

    <div class="days">${days}</div>

    <div class="routine__more">
      <button type="button" class="btn btn--ghost" data-act="add-day">${icon('plus')}Agregar un día</button>
      ${r.prefs ? `<button type="button" class="btn btn--ghost" data-act="regen">${icon('refresh')}Crear otra versión con las mismas respuestas</button>` : ''}
      <a class="btn btn--ghost" href="#/rutina?editar=1">Cambiar mis respuestas</a>
      <button type="button" class="btn btn--ghost btn--danger" data-act="clear">${icon('trash')}Borrar rutina</button>
    </div>

    <label class="notes"><span>Notas para ti</span><textarea rows="3" data-notes placeholder="Por ejemplo, pesos que usaste o cómo te sentiste">${esc(r.notes || '')}</textarea></label>
    <p class="disclaimer">Las series y repeticiones son una guía general. Si tienes una lesión, dolor o una condición médica, consulta a un profesional antes de empezar.</p>
  </div>

  <dialog class="picker" id="picker" aria-labelledby="picker-h">
    <div class="picker__head">
      <h2 id="picker-h">Agregar ejercicio</h2>
      <button type="button" class="icon-btn" data-close-picker aria-label="Cerrar">${icon('close')}</button>
    </div>
    <div class="picker__search">
      <label for="picker-q" class="visually-hidden">Buscar ejercicio</label>
      <input id="picker-q" type="search" placeholder="Busca por nombre o músculo" autocomplete="off">
      ${r.prefs ? '<p class="muted">Solo se ofrecen ejercicios con todos tus implementos y nivel confirmado. Para usar otro equipo, cambia tus respuestas.</p>' : ''}
    </div>
    <ul class="picker__list" role="list"></ul>
  </dialog>`;
}

function renderEditor(main, data, initial) {
  let r = initial;
  setTitle('Mi rutina');
  const save = () => routineStore.set(r);
  const saveSoon = debounce(save, 300);
  const get = (id) => data.byId.get(id);
  const itemPrefs = () => ({ goal: r.prefs?.goal ?? prefStore.goal(), level: r.prefs?.level ?? prefStore.level() });
  // Limpia ejercicios que ya no existen en los datos
  // Preserve unknown IDs in user storage. The view reports unavailable entries.

  const draw = (focusSel) => {
    main.innerHTML = editorHtml(r, data);
    wire();
    if (focusSel) $(focusSel, main)?.focus();
  };

  const snapshot = () => JSON.parse(JSON.stringify(r));
  const undoable = (msg, before) => toast(msg, { action: 'Deshacer', onAction: () => { r = before; save(); draw(); } });

  let pickerDay = 0;
  const drawPicker = () => {
    const q = $('#picker-q', main).value.trim();
    let list = search(data.items, { ...EMPTY_FILTERS, q });
    if (r.prefs) list = list.filter(poolFilter(r.prefs));
    const inDay = new Set(r.days[pickerDay].items.map((i) => i.exId));
    $('.picker__list', main).innerHTML = list.slice(0, 40).map((ex) => {
      const t = thumbOf(ex);
      const has = inDay.has(ex.id);
      return `<li class="pick">
        <span class="pick__thumb">${t ? img(t, '', { w: 96, h: 64 }) : placeholder(ex)}</span>
        <span class="pick__text"><strong>${esc(ex.title)}</strong><small>${esc([muscleList(ex.primary), equipmentText(ex,EQUIPMENT)].filter(Boolean).join('. '))}</small></span>
        <button type="button" class="btn btn--small ${has ? '' : 'btn--primary'}" data-pick="${esc(ex.id)}" ${has ? 'disabled' : ''}>${has ? 'Agregado' : 'Agregar'}</button>
      </li>`;
    }).join('') || '<li class="pick pick--empty">No hay resultados. Prueba con otra palabra.</li>';
  };

  function wire() {
    const picker = $('#picker', main);
    $('#picker-q', main).addEventListener('input', debounce(drawPicker, 150));
    picker.addEventListener('click', (e) => {
      if (e.target === picker || e.target.closest('[data-close-picker]')) picker.close();
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const ex = get(b.dataset.pick);
      r.days[pickerDay].items.push(makeItem(ex, itemPrefs()));
      save();
      b.textContent = 'Agregado';
      b.disabled = true;
      b.classList.remove('btn--primary');
      toast(`${ex.title} agregado a ${r.days[pickerDay].title}`);
    });
    picker.addEventListener('close', () => draw(`[data-act="add"][data-day="${pickerDay}"]`));
  }

  function onInput(e) {
    const t = e.target;
    if (t.matches('[data-title]')) { r.title = t.value; saveSoon(); return; }
    if (t.matches('[data-notes]')) { r.notes = t.value; saveSoon(); return; }
    if (t.matches('[data-day-name]')) { r.days[Number(t.dataset.dayName)].title = t.value; saveSoon(); return; }
    const li = t.closest('.item');
    if (li && t.dataset.field) {
      const it = r.days[Number(li.dataset.day)].items[Number(li.dataset.i)];
      it[t.dataset.field] = t.dataset.field === 'series' ? Math.max(1, Number(t.value) || 1) : t.value;
      if(['reps','rest'].includes(t.dataset.field))it.timingEdited=true;
      const dayIndex=Number(li.dataset.day);
      $(`[data-day-duration="${dayIndex}"]`,main).textContent=dayDuration(r.days[dayIndex]).label;
      saveSoon();
    }
  }

  async function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const li = b.closest('.item');
    const di = li ? Number(li.dataset.day) : Number(b.dataset.day);
    const ii = li ? Number(li.dataset.i) : -1;
    const day = r.days[di];

    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? ii - 1 : ii + 1;
      [day.items[ii], day.items[j]] = [day.items[j], day.items[ii]];
      save();
      draw(`.item[data-day="${di}"][data-i="${j}"] [data-act="${act}"]:not([disabled])`);
      if (!$(`.item[data-day="${di}"][data-i="${j}"] [data-act="${act}"]:not([disabled])`, main)) $(`.item[data-day="${di}"][data-i="${j}"] [data-act="swap"]`, main)?.focus();
    } else if (act === 'remove') {
      const before = snapshot();
      const ex = get(day.items[ii].exId);
      day.items.splice(ii, 1);
      save();
      draw(`[data-act="add"][data-day="${di}"]`);
      undoable(`${ex.title} quitado`, before);
    } else if (act === 'swap') {
      const ex = get(day.items[ii].exId);
      const alts = alternatives(data.items, ex, r, di);
      if (!alts.length) { toast('No encontramos otro ejercicio parecido con tu equipo'); return; }
      const before = snapshot();
      const next = alts[0];
      day.items[ii] = { ...makeItem(next, r.prefs ?? itemPrefs()) };
      save();
      draw(`.item[data-day="${di}"][data-i="${ii}"] [data-act="swap"]`);
      undoable(`Cambiado por ${next.title}`, before);
    } else if (act === 'add') {
      pickerDay = di;
      $('#picker-h', main).textContent = `Agregar a ${day.title}`;
      $('#picker-q', main).value = '';
      drawPicker();
      $('#picker', main).showModal();
      $('#picker-q', main).focus();
    } else if (act === 'remove-day') {
      const before = snapshot();
      r.days.splice(di, 1);
      save();
      draw('[data-act="add-day"]');
      undoable('Día quitado', before);
    } else if (act === 'add-day') {
      r.days.push({ title: `Día ${r.days.length + 1}`, items: [], cooldown: [] });
      save();
      draw(`#day-name-${r.days.length - 1}`);
    } else if (act === 'regen') {
      const before = snapshot();
      const n = generateRoutine(data.items, r.prefs, (r.seed || 1) + 1);
      n.title = r.title;
      n.notes = r.notes;
      r = n;
      save();
      draw('[data-act="regen"]');
      undoable('Nueva versión creada', before);
    } else if (act === 'clear') {
      const before = snapshot();
      routineStore.clear();
      go('#/rutina');
      toast('Rutina borrada', { action: 'Deshacer', onAction: () => { routineStore.set(before); go('#/rutina'); } });
    } else if (act === 'print') {
      window.print();
    } else if (act === 'pdf') {
      const status = $('[data-pdf-status]', main);
      b.disabled = true;
      try {
        await exportRoutinePdf(r, get, { photos: $('#pdf-photos', main).checked, steps: $('#pdf-steps', main).checked }, (s) => { status.textContent = s; });
        status.textContent = 'PDF descargado';
      } catch (err) {
        status.textContent = err.message || 'No se pudo crear el PDF.';
      } finally {
        b.disabled = false;
      }
    }
  }

  // Los eventos de la vista se registran una sola vez. Cada redibujo solo reemplaza el contenido.
  main.addEventListener('input', onInput);
  main.addEventListener('click', onClick);
  draw();
}

export async function renderRoutine(main, params) {
  const data = await loadData();
  const r = routineStore.get();
  if (!r || params.get('editar') === '1') return renderWizard(main, data, params.get('editar') === '1' ? r : null);
  return renderEditor(main, data, r);
}
