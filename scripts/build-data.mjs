#!/usr/bin/env node
// Genera data/exercises.json juntando tres fuentes gratuitas:
//
// 1. Free Exercise DB (obligatoria). Unos 870 ejercicios con dos fotos cada uno. Dominio público.
// 2. wger (opcional). Nombres y descripciones en español, videos y ejercicios extra. Licencias CC.
// 3. ExerciseDB V1 gratuita (opcional). Animaciones GIF y ejercicios extra.
//
// Si una fuente opcional falla, se sigue con las demás. Si falla la principal, no se toca el archivo actual.
//
// Uso:  node scripts/build-data.mjs
// Variables opcionales:
//   USE_WGER=0          no consultar wger
//   USE_EXERCISEDB=0    no consultar ExerciseDB
//   WGER_BASE, EXERCISEDB_BASE, FEDB_URL   cambiar las direcciones (útil para pruebas)

import { writeFile, mkdir } from 'node:fs/promises';

const FEDB_URL = process.env.FEDB_URL || 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FEDB_IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const WGER_BASE = (process.env.WGER_BASE || 'https://wger.de').replace(/\/$/, '');
const EDB_BASE = (process.env.EXERCISEDB_BASE || 'https://oss.exercisedb.dev').replace(/\/$/, '');
const USE_WGER = process.env.USE_WGER !== '0';
const USE_EDB = process.env.USE_EXERCISEDB !== '0';
const OUT_DIR = new URL('../data/', import.meta.url);
const OUT = new URL('exercises.json', OUT_DIR);
const HEADERS = { 'User-Agent': 'rutina-libre-build/1.0 (proyecto educativo en GitHub Pages)', Accept: 'application/json' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[datos]', ...a);

async function getJSON(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(45000) });
      if (r.status === 429) { await sleep(4000 * i); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      if (i === tries) throw new Error(`${url} -> ${err.message}`);
      await sleep(1500 * i);
    }
  }
  throw new Error(`${url} -> demasiados intentos`);
}

// ---------- Normalización para comparar nombres entre fuentes ----------
const STOP = new Set(['the', 'a', 'an', 'with', 'on', 'of', 'and', 'to', 'in', 'for']);
const baseNorm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
// Singular simple en inglés: lunges -> lunge, presses -> press, crunches -> crunch.
const singular = (t) => {
  if (t.length < 3 || /(ss|us|is)$/.test(t)) return t;
  if (/(sses|ches|shes|xes)$/.test(t)) return t.slice(0, -2);
  return t.endsWith('s') ? t.slice(0, -1) : t;
};
function nameKey(s) {
  return baseNorm(s).split(' ').filter((t) => t && !STOP.has(t))
    .map(singular)
    .join(' ').replace(/\bpush up\b/g, 'pushup').replace(/\bpull up\b/g, 'pullup').replace(/\bsit up\b/g, 'situp').replace(/\bchin up\b/g, 'chinup');
}
const sortedKey = (s) => nameKey(s).split(' ').sort().join(' ');

const titleCase = (s) => String(s || '').replace(/\b([a-z])/g, (m) => m.toUpperCase());

// ---------- Mapeo de músculos y equipo al vocabulario de la app ----------
const MUSCLE_RULES = [
  [/serratus/, 'chest'], [/pector|chest/, 'chest'],
  [/oblique|abdom|\babs?\b|rectus abd|core|waist/, 'abdominals'],
  [/delt|shoulder/, 'shoulders'],
  [/biceps femoris|hamstring/, 'hamstrings'],
  [/tricep/, 'triceps'], [/bicep|brachialis/, 'biceps'],
  [/latissimus|\blats?\b/, 'lats'],
  [/rhomboid|upper back|middle back|teres/, 'middle back'],
  [/lower back|spine|erector/, 'lower back'],
  [/trap/, 'traps'],
  [/quad|thigh front/, 'quadriceps'],
  [/glute/, 'glutes'],
  [/calf|calves|gastrocnem|soleus/, 'calves'],
  [/forearm|wrist|brachioradialis|grip/, 'forearms'],
  [/adductor|inner thigh/, 'adductors'], [/abductor|hip abd/, 'abductors'],
  [/neck|levator|sternocleid/, 'neck'],
];
function mapMuscle(s) {
  const t = baseNorm(s);
  for (const [re, m] of MUSCLE_RULES) if (re.test(t)) return m;
  return null;
}
const mapMuscles = (list) => [...new Set((list || []).map(mapMuscle).filter(Boolean))];

const EQUIP_RULES = [
  [/body ?weight|none|gym mat|^mat$|assisted|\bbody\b/, 'body only'],
  [/sz|ez|curl bar/, 'e-z curl bar'],
  [/smith|leverage|machine|sled|ergometer|elliptical|stepmill|stationary|treadmill|skierg|upper body ergometer/, 'machine'],
  [/barbell|olympic|trap bar|bar$/, 'barbell'],
  [/dumbbell/, 'dumbbell'],
  [/kettlebell/, 'kettlebells'],
  [/cable|pulley/, 'cable'],
  [/band|resistance/, 'bands'],
  [/medicine ball/, 'medicine ball'],
  [/swiss|stability|exercise ball|bosu/, 'exercise ball'],
  [/foam|roller/, 'foam roll'],
  [/rope|bench|pull ?up bar|box|weight|plate|tire|hammer|wheel|step/, 'other'],
];
function mapEquipment(list) {
  const names = (list || []).map((x) => baseNorm(typeof x === 'string' ? x : x?.name));
  const mapped = names.map((n) => { for (const [re, e] of EQUIP_RULES) if (re.test(n)) return e; return 'other'; });
  const strong = mapped.find((e) => e !== 'body only' && e !== 'other');
  return strong || (mapped.includes('other') && !mapped.includes('body only') ? 'other' : mapped[0] || 'body only');
}

function guessCategory(name, fallback = 'strength') {
  const n = baseNorm(name);
  if (/stretch|estiramiento/.test(n)) return 'stretching';
  if (/jump|hop|bound|plyo|salto/.test(n)) return 'plyometrics';
  if (/\b(run|jog|sprint|walk|cycle|bike|rowing|row machine|elliptical|burpee|jumping jack)\b/.test(n)) return 'cardio';
  return fallback;
}

// ---------- Texto ----------
function htmlToSteps(html) {
  if (!html) return [];
  const text = String(html)
    .replace(/<\s*(li|p|br|div|h\d)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  let parts = text.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 2);
  if (parts.length === 1 && parts[0].length > 220) {
    parts = parts[0].split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).map((s) => s.trim()).filter(Boolean);
  }
  return parts;
}
const cleanEdbStep = (s) => String(s || '').replace(/^\s*step\s*:?\s*\d+\s*[:.)-]?\s*/i, '').trim();

// ---------- Fuente 1: Free Exercise DB ----------
async function loadFedb() {
  const raw = await getJSON(FEDB_URL);
  if (!Array.isArray(raw) || raw.length < 500) throw new Error('Free Exercise DB devolvió datos incompletos');
  return raw.map((x) => ({
    id: x.id,
    name: x.name,
    level: x.level ?? null,
    force: x.force ?? null,
    mechanic: x.mechanic ?? null,
    equipment: x.equipment ?? 'body only',
    category: x.category ?? 'strength',
    primary: x.primaryMuscles ?? [],
    secondary: x.secondaryMuscles ?? [],
    steps: x.instructions ?? [],
    images: (x.images ?? []).map((p) => FEDB_IMG + p),
    source: 'fedb',
  }));
}

// ---------- Fuente 2: wger ----------
async function loadWger() {
  let en = 2;
  let es = 4;
  try {
    const langs = await getJSON(`${WGER_BASE}/api/v2/language/?limit=100&format=json`);
    for (const l of langs.results || []) {
      if (l.short_name === 'en') en = l.id;
      if (l.short_name === 'es') es = l.id;
    }
  } catch (e) {
    log('wger: no se pudo leer la lista de idiomas, se usan los valores conocidos.', e.message);
  }
  const out = [];
  let url = `${WGER_BASE}/api/v2/exerciseinfo/?limit=100&offset=0&format=json`;
  let pages = 0;
  while (url && pages < 60) {
    const j = await getJSON(url);
    out.push(...(j.results || []));
    url = j.next ? new URL(j.next, WGER_BASE).toString() : null;
    pages++;
    await sleep(400);
  }
  log(`wger: ${out.length} registros leídos`);
  const abs = (u) => (u ? new URL(u, WGER_BASE).toString() : null);
  return out.map((x) => {
    const tEn = (x.translations || []).find((t) => t.language === en);
    const tEs = (x.translations || []).find((t) => t.language === es);
    const muscles = (x.muscles || []).map((m) => m.name_en || m.name);
    const secondary = (x.muscles_secondary || []).map((m) => m.name_en || m.name);
    const imgs = (x.images || []).sort((a, b) => Number(b.is_main) - Number(a.is_main));
    const authors = [...new Set([...(imgs.map((i) => i.license_author)), tEs?.license_author, tEn?.license_author].filter(Boolean))].slice(0, 3);
    return {
      wgerId: x.id,
      nameEn: tEn?.name || null,
      nameEs: tEs?.name || null,
      stepsEn: htmlToSteps(tEn?.description),
      stepsEs: htmlToSteps(tEs?.description),
      category: x.category?.name || '',
      primary: muscles,
      secondary,
      equipment: (x.equipment || []).map((e) => e.name),
      images: imgs.map((i) => abs(i.image)).filter(Boolean),
      videos: (x.videos || []).sort((a, b) => Number(b.is_main) - Number(a.is_main)).map((v) => abs(v.video)).filter(Boolean),
      credit: `wger.de${authors.length ? `, autoría: ${authors.join(', ')}` : ''}${x.license?.short_name ? `, licencia ${x.license.short_name}` : ''}`,
    };
  });
}

// ---------- Fuente 3: ExerciseDB V1 gratuita ----------
async function loadEdb() {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (let guard = 0; guard < 80; guard++) {
    const j = await getJSON(`${EDB_BASE}/api/v1/exercises?offset=${offset}&limit=${limit}`);
    const list = Array.isArray(j) ? j : j.data || j.results || j.exercises || [];
    if (!list.length) break;
    out.push(...list);
    offset += list.length;
    const total = j.metadata?.totalExercises ?? j.total ?? null;
    if (total && offset >= total) break;
    if (!j.metadata?.nextPage && !total && list.length < limit) break;
    await sleep(350);
  }
  log(`ExerciseDB: ${out.length} registros leídos`);
  return out.map((x) => ({
    edbId: x.exerciseId || x.id,
    name: x.name,
    gif: x.gifUrl || x.gif_url || x.imageUrl || null,
    primary: x.targetMuscles || (x.target ? [x.target] : []),
    secondary: x.secondaryMuscles || [],
    bodyParts: x.bodyParts || (x.bodyPart ? [x.bodyPart] : []),
    equipment: x.equipments || (x.equipment ? [x.equipment] : []),
    steps: (x.instructions || []).map(cleanEdbStep).filter(Boolean),
  })).filter((x) => x.edbId && x.name);
}

// ---------- Unión ----------
function buildIndex(items) {
  const map = new Map();
  for (const it of items) {
    for (const k of [nameKey(it.name), sortedKey(it.name)]) if (k && !map.has(k)) map.set(k, it);
  }
  return map;
}
function findMatch(idx, name, { prefix = false } = {}) {
  if (!name) return null;
  const k = nameKey(name);
  const hit = idx.get(k) || idx.get(sortedKey(name));
  if (hit || !prefix || k.split(' ').length < 2) return hit || null;
  // Si no hay coincidencia exacta, se busca la variante más corta que empiece igual.
  // Ejemplo: "barbell bench press" se une con "Barbell Bench Press - Medium Grip".
  let best = null;
  for (const [key, it] of idx) {
    if (key.startsWith(`${k} `) && (!best || key.length < best[0].length)) best = [key, it];
  }
  return best ? best[1] : null;
}

function mergeWger(items, wger) {
  const idx = buildIndex(items);
  let matched = 0;
  let added = 0;
  for (const w of wger) {
    const hit = findMatch(idx, w.nameEn, { prefix: true }) || findMatch(idx, w.nameEs);
    if (hit) {
      matched++;
      if (w.nameEs && !hit.nameEs) hit.nameEs = w.nameEs;
      if (w.stepsEs.length && !hit.stepsEs) hit.stepsEs = w.stepsEs;
      if (w.videos.length && !hit.videos) hit.videos = w.videos;
      if (!hit.images.length && w.images.length) hit.images = w.images;
      if (!hit.steps.length && w.stepsEn.length) hit.steps = w.stepsEn;
      hit.also = [...new Set([...(hit.also || []), 'wger'])];
      continue;
    }
    const name = w.nameEn || w.nameEs;
    if (!name) continue;
    if (!w.stepsEn.length && !w.stepsEs.length && !w.images.length && !w.videos.length) continue;
    let primary = mapMuscles(w.primary);
    if (!primary.length) {
      const c = baseNorm(w.category);
      const byCat = { abs: 'abdominals', back: 'lats', calves: 'calves', chest: 'chest', legs: 'quadriceps', shoulders: 'shoulders' }[c];
      if (byCat) primary = [byCat];
      else if (c === 'arms') primary = [/tricep|extension|dip|pushdown|kickback/.test(baseNorm(name)) ? 'triceps' : 'biceps'];
    }
    const it = {
      id: `wger-${w.wgerId}`,
      name,
      nameEs: w.nameEs || undefined,
      level: null,
      force: null,
      mechanic: null,
      equipment: mapEquipment(w.equipment),
      category: baseNorm(w.category) === 'cardio' ? 'cardio' : guessCategory(name),
      primary,
      secondary: mapMuscles(w.secondary).filter((m) => !primary.includes(m)),
      steps: w.stepsEn,
      stepsEs: w.stepsEs.length ? w.stepsEs : undefined,
      images: w.images,
      videos: w.videos.length ? w.videos : undefined,
      source: 'wger',
      credit: w.credit,
    };
    items.push(it);
    for (const k of [nameKey(name), sortedKey(name), w.nameEs && nameKey(w.nameEs)]) if (k && !idx.has(k)) idx.set(k, it);
    added++;
  }
  return { matched, added };
}

function mergeEdb(items, edb) {
  const idx = buildIndex(items);
  let matched = 0;
  let added = 0;
  for (const e of edb) {
    const hit = findMatch(idx, e.name, { prefix: true });
    if (hit) {
      matched++;
      if (e.gif && !hit.gif) hit.gif = e.gif;
      if (!hit.steps.length && e.steps.length) hit.steps = e.steps;
      hit.also = [...new Set([...(hit.also || []), 'edb'])];
      continue;
    }
    if (!e.gif && !e.steps.length) continue;
    let primary = mapMuscles(e.primary);
    if (!primary.length) primary = mapMuscles(e.bodyParts);
    const isCardio = e.bodyParts.some((b) => /cardio/i.test(b)) || e.primary.some((m) => /cardio/i.test(m));
    const it = {
      id: `edb-${e.edbId}`,
      name: titleCase(e.name),
      level: null,
      force: null,
      mechanic: null,
      equipment: mapEquipment(e.equipment),
      category: isCardio ? 'cardio' : guessCategory(e.name),
      primary,
      secondary: mapMuscles(e.secondary).filter((m) => !primary.includes(m)),
      steps: e.steps,
      images: [],
      gif: e.gif || undefined,
      source: 'edb',
      credit: 'ExerciseDB, API gratuita',
    };
    items.push(it);
    idx.set(nameKey(e.name), it);
    idx.set(sortedKey(e.name), it);
    added++;
  }
  return { matched, added };
}

function clean(it) {
  const o = {};
  for (const [k, v] of Object.entries(it)) {
    if (v === undefined || v === null || v === '') { if (['level', 'force', 'mechanic'].includes(k)) o[k] = null; continue; }
    if (Array.isArray(v) && !v.length && !['primary', 'secondary', 'steps', 'images'].includes(k)) continue;
    o[k] = v;
  }
  return o;
}

async function main() {
  log('Descargando Free Exercise DB…');
  let items;
  try {
    items = await loadFedb();
  } catch (e) {
    console.error('[datos] No se pudo descargar la fuente principal. Se mantiene el archivo actual.', e.message);
    process.exit(1);
  }
  const sources = [{ id: 'fedb', name: 'Free Exercise DB', url: 'https://github.com/yuhonas/free-exercise-db', license: 'Unlicense (dominio público)', count: items.length }];

  if (USE_WGER) {
    try {
      log('Consultando wger…');
      const w = await loadWger();
      const r = mergeWger(items, w);
      log(`wger: ${r.matched} coincidencias, ${r.added} ejercicios nuevos`);
      sources.push({ id: 'wger', name: 'wger', url: 'https://wger.de', license: 'CC BY-SA, ver autoría en cada ejercicio', count: r.matched + r.added });
    } catch (e) {
      log('wger no disponible, se continúa sin esta fuente.', e.message);
    }
  }

  if (USE_EDB) {
    try {
      log('Consultando ExerciseDB…');
      const e = await loadEdb();
      const r = mergeEdb(items, e);
      log(`ExerciseDB: ${r.matched} coincidencias, ${r.added} ejercicios nuevos`);
      sources.push({ id: 'edb', name: 'ExerciseDB', url: 'https://oss.exercisedb.dev', license: 'API gratuita, revisar términos del proveedor', count: r.matched + r.added });
    } catch (e) {
      log('ExerciseDB no disponible, se continúa sin esta fuente.', e.message);
    }
  }

  items = items.filter((x) => x.name && (x.primary.length || x.category === 'cardio'));
  items.sort((a, b) => (a.nameEs || a.name).localeCompare(b.nameEs || b.name, 'es'));
  const payload = { version: 1, generated: new Date().toISOString(), sources, exercises: items.map(clean) };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(payload));
  const kb = Math.round(Buffer.byteLength(JSON.stringify(payload)) / 1024);
  log(`Listo: ${items.length} ejercicios, ${kb} KB en data/exercises.json`);
}

main();
