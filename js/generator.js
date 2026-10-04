import { prescribe, repsText, GOALS } from './reps.js';
import { LEVELS, ZONES } from './i18n.js';

// Número aleatorio repetible a partir de una semilla, para que "Crear otra versión" cambie la selección.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = (muscles, mech = null, force = null) => ({ muscles, mech, force });

// Plantillas de día. Cada espacio indica qué músculo buscar y qué tipo de ejercicio se prefiere.
const DAYS = {
  fullA: ['Cuerpo completo A', [S(['quadriceps', 'glutes'], 'compound'), S(['chest'], 'compound', 'push'), S(['lats', 'middle back'], 'compound', 'pull'), S(['hamstrings', 'glutes'], 'compound'), S(['shoulders'], null, 'push'), S(['abdominals']), S(['biceps'], 'isolation'), S(['triceps'], 'isolation')]],
  fullB: ['Cuerpo completo B', [S(['hamstrings', 'glutes', 'lower back'], 'compound'), S(['shoulders'], 'compound', 'push'), S(['middle back', 'lats'], 'compound', 'pull'), S(['quadriceps']), S(['chest'], null, 'push'), S(['abdominals']), S(['calves']), S(['triceps'])]],
  fullC: ['Cuerpo completo C', [S(['quadriceps', 'glutes'], 'compound'), S(['lats'], 'compound', 'pull'), S(['chest', 'triceps'], 'compound', 'push'), S(['glutes', 'hamstrings']), S(['shoulders', 'traps']), S(['abdominals']), S(['biceps']), S(['calves'])]],
  torsoA: ['Torso A', [S(['chest'], 'compound', 'push'), S(['lats', 'middle back'], 'compound', 'pull'), S(['shoulders'], 'compound', 'push'), S(['middle back'], null, 'pull'), S(['triceps'], 'isolation'), S(['biceps'], 'isolation'), S(['abdominals']), S(['traps'])]],
  torsoB: ['Torso B', [S(['shoulders'], 'compound', 'push'), S(['lats'], 'compound', 'pull'), S(['chest'], null, 'push'), S(['middle back'], 'compound', 'pull'), S(['biceps']), S(['triceps']), S(['forearms']), S(['abdominals'])]],
  piernaA: ['Pierna A', [S(['quadriceps'], 'compound'), S(['hamstrings'], 'compound'), S(['glutes']), S(['quadriceps'], 'isolation'), S(['calves']), S(['abdominals']), S(['adductors']), S(['lower back'])]],
  piernaB: ['Pierna B', [S(['hamstrings', 'glutes'], 'compound'), S(['quadriceps', 'glutes'], 'compound'), S(['hamstrings'], 'isolation'), S(['abductors', 'glutes']), S(['calves']), S(['abdominals']), S(['quadriceps']), S(['lower back'])]],
  empuje: ['Empujar: pecho, hombros y tríceps', [S(['chest'], 'compound', 'push'), S(['shoulders'], 'compound', 'push'), S(['chest'], null, 'push'), S(['shoulders'], 'isolation'), S(['triceps'], 'isolation'), S(['triceps']), S(['abdominals'])]],
  tiron: ['Tirar: espalda y bíceps', [S(['lats'], 'compound', 'pull'), S(['middle back'], 'compound', 'pull'), S(['lats', 'middle back'], null, 'pull'), S(['traps']), S(['biceps'], 'isolation'), S(['biceps', 'forearms']), S(['lower back'])]],
};

const SPLITS = {
  1: ['fullA'],
  2: ['fullA', 'fullB'],
  3: ['fullA', 'fullB', 'fullC'],
  4: ['torsoA', 'piernaA', 'torsoB', 'piernaB'],
  5: ['empuje', 'tiron', 'piernaA', 'torsoA', 'piernaB'],
  6: ['empuje', 'tiron', 'piernaA', 'empuje', 'tiron', 'piernaB'],
  7: ['empuje', 'tiron', 'piernaA', 'torsoA', 'piernaB', 'fullA', 'fullB'],
};

const STRETCH_ORDER = ['hamstrings', 'quadriceps', 'glutes', 'lower back', 'chest', 'shoulders', 'lats', 'calves', 'adductors', 'abductors', 'neck', 'triceps', 'biceps', 'forearms', 'traps', 'middle back', 'abdominals'];

export const EXERCISES_PER_MINUTES = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

export const EQUIPMENT_PRESETS = {
  casa: { label: 'En casa sin equipo', equipment: ['body only'] },
  casaPesas: { label: 'En casa con mancuernas', equipment: ['body only', 'dumbbell', 'bands', 'other'] },
  gimnasio: { label: 'Gimnasio completo', equipment: ['body only', 'dumbbell', 'barbell', 'e-z curl bar', 'cable', 'machine', 'kettlebells', 'bands', 'medicine ball', 'exercise ball', 'foam roll', 'other'] },
};

function allowedLevels(level) {
  if (level === 'beginner') return new Set(['beginner', null]);
  if (level === 'intermediate') return new Set(['beginner', 'intermediate', null]);
  return new Set(['beginner', 'intermediate', 'expert', null]);
}

function allowedCategories(goal, level) {
  if (goal === 'movilidad') return new Set(['stretching']);
  const c = new Set(['strength']);
  if (level !== 'beginner' && (goal === 'fuerza' || goal === 'musculo')) c.add('powerlifting');
  if (level === 'expert' && goal === 'fuerza') c.add('olympic weightlifting');
  return c;
}

// Algunos ejercicios figuran como "peso corporal" pero necesitan una barra fija o paralelas.
const NEEDS_BAR = /(pull|chin)[ -]?ups?|muscle[ -]?up|hanging|dips?\b/i;
const OLYMPIC = /\b(clean|snatch|jerk)\b/i;

export function poolFilter(prefs) {
  const eq = new Set(['body only', ...(prefs.equipment ?? [])]);
  const lv = allowedLevels(prefs.level);
  const hasBar = eq.has('other') || eq.has('machine');
  const olympicOk = prefs.level === 'expert' && prefs.goal === 'fuerza';
  return (ex) =>
    eq.has(ex.equipment ?? 'body only') &&
    lv.has(ex.level ?? null) &&
    (hasBar || ex.equipment !== 'body only' || !NEEDS_BAR.test(ex.name)) &&
    (olympicOk || !OLYMPIC.test(ex.name));
}

function score(ex, slot, prefs, rand) {
  let s = 0;
  if (slot.mech && ex.mechanic === slot.mech) s += 3;
  if (slot.force && ex.force === slot.force) s += 1.5;
  if (ex.primary[0] === slot.muscles[0]) s += 2;
  if (ex.images?.length) s += 2.5;
  else if (ex.gif) s += 1.5;
  if (ex.level === prefs.level) s += 1;
  if (ex.level == null) s -= 1;
  if (ex.source === 'fedb') s += 0.5;
  if (ex._basic) s += 2;
  return s + rand() * 3;
}

function pickFor(slot, pool, used, prefs, rand) {
  const fits = (ex) => ex.primary.some((m) => slot.muscles.includes(m));
  let cands = pool.filter((ex) => fits(ex) && !used.has(ex.id));
  if (!cands.length) cands = pool.filter(fits);
  if (!cands.length) return null;
  let best = null;
  let bestS = -Infinity;
  for (const ex of cands) {
    const s = score(ex, slot, prefs, rand);
    if (s > bestS) { bestS = s; best = ex; }
  }
  return best;
}

export function makeItem(ex, prefs) {
  const p = prescribe(ex, prefs.goal, prefs.level);
  return { exId: ex.id, series: p.series, seriesLabel: p.seriesLabel, reps: repsText(p), rest: p.rest };
}

function focusSlots(prefs) {
  const out = [];
  for (const zid of prefs.focus ?? []) {
    const z = ZONES.find((x) => x.id === zid);
    if (z) out.push(S(z.muscles));
  }
  return out;
}

export function summary(prefs) {
  const parts = [
    GOALS[prefs.goal]?.label,
    LEVELS[prefs.level]?.toLowerCase(),
    `${prefs.days} ${prefs.days === 1 ? 'día' : 'días'} por semana`,
    `${prefs.minutes} minutos por sesión`,
  ];
  return parts.filter(Boolean).join(', ');
}

export function generateRoutine(items, prefs, seed = Date.now() % 100000) {
  const rand = rng(seed);
  const base = items.filter(poolFilter(prefs));
  const cats = allowedCategories(prefs.goal, prefs.level);
  const pool = base.filter((ex) => cats.has(ex.category) && ex.primary.length);
  const stretches = base.filter((ex) => ex.category === 'stretching' && ex.primary.length);
  const finishers = base.filter((ex) => ex.category === 'plyometrics' || ex.category === 'cardio');
  const nPerDay = EXERCISES_PER_MINUTES[prefs.minutes] ?? 5;
  const used = new Set();
  const focus = focusSlots(prefs);
  const days = [];

  let keys;
  if (prefs.goal === 'grasa' || (prefs.goal === 'resistencia' && prefs.days <= 3)) {
    keys = Array.from({ length: prefs.days }, (_, i) => ['fullA', 'fullB', 'fullC'][i % 3]);
  } else {
    keys = SPLITS[prefs.days] ?? SPLITS[3];
  }
  const seen = {};

  for (let d = 0; d < prefs.days; d++) {
    let title;
    let slots;
    if (prefs.goal === 'movilidad') {
      const n = Math.max(5, Math.round(prefs.minutes / 5));
      title = ['Movilidad de cuerpo completo', 'Movilidad de piernas y cadera', 'Movilidad de espalda y hombros'][d % 3];
      const start = (d * 5) % STRETCH_ORDER.length;
      slots = Array.from({ length: n }, (_, i) => S([STRETCH_ORDER[(start + i) % STRETCH_ORDER.length]]));
    } else {
      const k = keys[d];
      seen[k] = (seen[k] || 0) + 1;
      title = DAYS[k][0] + (seen[k] > 1 ? ' (segunda vuelta)' : '');
      slots = [...DAYS[k][1]];
      if (focus.length) {
        const fs = focus[d % focus.length];
        const target = prefs.goal === 'grasa' ? nPerDay - 1 : nPerDay;
        const already = slots.slice(0, target).some((s) => s.muscles.some((m) => fs.muscles.includes(m)));
        if (!already) slots.splice(Math.max(0, target - 1), 0, fs);
      }
    }

    const dayItems = [];
    const dayUsed = new Set();
    const src = prefs.goal === 'movilidad' ? stretches : pool;
    const target = prefs.goal === 'movilidad' ? slots.length : prefs.goal === 'grasa' ? nPerDay - 1 : nPerDay;
    for (const slot of slots) {
      if (dayItems.length >= target) break;
      const ex = pickFor(slot, src, new Set([...used, ...dayUsed]), prefs, rand);
      if (!ex || dayUsed.has(ex.id)) continue;
      dayUsed.add(ex.id);
      used.add(ex.id);
      dayItems.push(makeItem(ex, prefs));
    }
    if (prefs.goal === 'grasa' && finishers.length) {
      const ex = pickFor(S(['quadriceps', 'hamstrings', 'calves', 'glutes', 'abdominals']), finishers, used, prefs, rand) || finishers[Math.floor(rand() * finishers.length)];
      if (ex) { used.add(ex.id); dayItems.push(makeItem(ex, prefs)); }
    }

    // Estiramientos para cerrar, según los músculos trabajados ese día.
    let cooldown = [];
    if (prefs.goal !== 'movilidad') {
      const worked = [...new Set(dayItems.flatMap((it) => items.find((x) => x.id === it.exId)?.primary ?? []))];
      for (const m of worked.slice(0, 2)) {
        const st = pickFor(S([m]), stretches, new Set(cooldown), prefs, rand);
        if (st && !cooldown.includes(st.id)) cooldown.push(st.id);
      }
    }
    days.push({ title: `Día ${d + 1}: ${title}`, items: dayItems, cooldown });
  }

  return {
    version: 1,
    created: new Date().toISOString(),
    title: 'Mi rutina',
    prefs: { ...prefs },
    seed,
    days,
    notes: '',
  };
}

export function emptyRoutine(prefs) {
  const n = prefs?.days ?? 3;
  return {
    version: 1,
    created: new Date().toISOString(),
    title: 'Mi rutina',
    prefs: prefs ? { ...prefs } : null,
    seed: 0,
    days: Array.from({ length: n }, (_, i) => ({ title: `Día ${i + 1}`, items: [], cooldown: [] })),
    notes: '',
  };
}

// Opciones para reemplazar un ejercicio por otro parecido.
export function alternatives(items, ex, routine, dayIndex) {
  const okPool = routine.prefs ? poolFilter(routine.prefs) : () => true;
  const inDay = new Set(routine.days[dayIndex].items.map((i) => i.exId));
  const main = ex.primary[0];
  return items
    .filter((x) => x.id !== ex.id && !inDay.has(x.id) && x.primary[0] === main && x.category === ex.category && okPool(x))
    .map((x) => ({ x, s: (x.mechanic === ex.mechanic ? 2 : 0) + (x.images?.length ? 2 : x.gif ? 1 : 0) + Math.random() * 2 }))
    .sort((a, b) => b.s - a.s)
    .map((a) => a.x);
}

