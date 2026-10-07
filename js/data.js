import {
  MUSCLES,
  EQUIPMENT,
  CATEGORIES,
  LEVELS,
  ZONES,
  SYNONYMS,
  PHRASES,
  LEVEL_ORDER,
} from "./i18n.js";
import { migrateEquipment, canUseEquipment, equipmentText } from './equipment.js';
import { queryEvidence, matchesEvidence } from './query.js';
import { rankDescription } from './intelligence.js';
import { playableVideos } from './media.js';

// Archivo generado por scripts/build-data.mjs. Si no existe, se usa la fuente original directo desde GitHub.
const DATA_URL = "data/exercises.json";
const FALLBACK_URL =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";
export const FEDB_IMG =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const FEDB_IMG_ALT =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOP = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "del",
  "al",
  "con",
  "para",
  "en",
  "y",
  "a",
  "un",
  "una",
  "por",
  "sin",
  "the",
  "of",
  "with",
  "on",
  "and",
]);

const PHRASES_N = Object.entries(PHRASES).map(([k, v]) => [
  norm(k),
  v.map(norm),
]);
const SYN_N = Object.fromEntries(
  Object.entries(SYNONYMS).map(([k, v]) => [norm(k), v.map(norm)]),
);
function oneTypo(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    errors = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++errors > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return errors + (i < a.length || j < b.length ? 1 : 0) <= 1;
}

// Convierte un registro de Free Exercise DB al formato de la app (se usa solo como respaldo).
export function fromFedb(x) {
  return {
    id: x.id,
    name: x.name,
    level: x.level ?? null,
    force: x.force ?? null,
    mechanic: x.mechanic ?? null,
    equipment: x.equipment ?? null,
    category: x.category ?? "strength",
    primary: x.primaryMuscles ?? [],
    secondary: x.secondaryMuscles ?? [],
    steps: x.instructions ?? [],
    images: (x.images ?? []).map((p) => FEDB_IMG + p),
    source: "fedb",
  };
}

export function altImage(url) {
  return url && url.startsWith(FEDB_IMG)
    ? url.replace(FEDB_IMG, FEDB_IMG_ALT)
    : "";
}

function prepare(ex) {
  migrateEquipment(ex);
  ex.primary ??= [];
  ex.secondary ??= [];
  ex.steps ??= [];
  ex.images ??= [];
  ex.title = ex.nameEs || ex.name;
  ex._t = norm([ex.name, ex.nameEs].join(" "));
  ex._hay = norm(
    [
      ex.name,
      ex.nameEs,
      ...ex.primary.map((m) => MUSCLES[m]),
      ...ex.secondary.map((m) => MUSCLES[m]),
      equipmentText(ex,EQUIPMENT),
      CATEGORIES[ex.category],
      LEVELS[ex.level],
      ...(ex.aliases || []),
      ex.summary,
    ].join(" "),
  );
  ex._motion = Boolean(ex.gif || playableVideos(ex).length);
  ex._visual = Boolean(ex.images.length || ex.gif);
  ex._basic = isBasic(ex);
  return ex;
}

let cache = null;

export async function loadData() {
  if (cache) return cache;
  let items;
  let meta = {};
  try {
    const r = await fetch(DATA_URL);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    items = j.exercises;
    if (!Array.isArray(items) || !items.length)
      throw new Error("Catálogo inválido");
    meta = {
      generated: j.generated,
      sources: j.sources ?? [],
      coverage: j.coverage || {},
      editorialReviewed: j.editorialReviewed,
    };
  } catch {
    const r = await fetch(FALLBACK_URL);
    if (!r.ok) throw new Error("No se pudo cargar la lista de ejercicios.");
    items = (await r.json()).map(fromFedb);
    meta = {
      generated: null,
      sources: [{ id: "fedb", name: "Free Exercise DB", count: items.length }],
    };
  }
  items.forEach(prepare);
  const byId = new Map(items.map((x) => [x.id, x]));
  cache = { items, byId, meta };
  return cache;
}

// Construye grupos de palabras. Cada grupo se cumple si aparece cualquiera de sus alternativas.
export function buildGroups(q) {
  let s = ` ${norm(q)} `;
  const groups = [];
  for (const [ph, alts] of PHRASES_N) {
    if (s.includes(` ${ph} `)) {
      groups.push([ph, ...alts]);
      s = s.replace(` ${ph} `, " ");
    }
  }
  for (const t of s.split(" ")) {
    if (!t || STOP.has(t)) continue;
    const corrected =
      t.length > 5 ? Object.keys(SYN_N).find((k) => oneTypo(t, k)) : null;
    const alts =
      SYN_N[t] ||
      SYN_N[t.replace(/es$/, "")] ||
      SYN_N[t.replace(/s$/, "")] ||
      (corrected ? [corrected, ...SYN_N[corrected]] : []) ||
      [];
    const base = t.length > 4 ? t.replace(/(es|s)$/, "") : t;
    groups.push([...new Set([t, base, ...alts])]);
  }
  return groups;
}

// Ejercicios clásicos que conviene mostrar primero, porque son los más conocidos y fáciles de aprender.
const BASICS = new Set(
  [
    "Pushups",
    "Bodyweight Squat",
    "Barbell Squat",
    "Barbell Full Squat",
    "Barbell Deadlift",
    "Barbell Bench Press - Medium Grip",
    "Dumbbell Bench Press",
    "Pullups",
    "Chin-Up",
    "Plank",
    "Dumbbell Bicep Curl",
    "Standing Military Press",
    "Bent Over Barbell Row",
    "Dumbbell Lunges",
    "Romanian Deadlift",
    "Leg Press",
    "Wide-Grip Lat Pulldown",
    "Crunches",
    "Goblet Squat",
    "Dips - Triceps Version",
    "Side Lateral Raise",
    "Barbell Hip Thrust",
    "Mountain Climbers",
    "One-Arm Dumbbell Row",
    "Seated Cable Rows",
    "Standing Calf Raises",
    "Hammer Curls",
    "Triceps Pushdown",
    "Bodyweight Walking Lunge",
    "Butt Lift (Bridge)",
    "Rope Jumping",
    "Hamstring Stretch",
    "Cat Stretch",
    "Russian Twist",
    "Dumbbell Shoulder Press",
    "Lying Leg Curls",
    "Leg Extensions",
    "Face Pull",
    "One-Arm Kettlebell Swings",
    "Dumbbell Flyes",
    "Incline Dumbbell Press",
    "Sumo Deadlift",
    "Dead Bug",
    "Superman",
    "Bench Dips",
    "Glute Kickback",
  ].map(norm),
);
export const isBasic = (ex) =>
  Boolean(ex.featured || ex.editorial) || BASICS.has(norm(ex.name));

// Variantes muy específicas que conviene mostrar después de la versión básica.
const VARIANT =
  /\b(chains|bands|plate movers|powerlifting|reverse band|with band|band suspended)\b/;

function textScore(ex, groups) {
  let score = 0;
  let found = 0;
  for (const g of groups) {
    let best = 0;
    for (const alt of g) {
      if (!alt) continue;
      if (ex._t.startsWith(alt)) best = Math.max(best, 5.2);
      else if (` ${ex._t} `.includes(` ${alt} `)) best = Math.max(best, 5);
      else if (ex._t.includes(alt)) best = Math.max(best, 3.5);
      else if (ex._hay.includes(alt)) best = Math.max(best, 1);
    }
    if (!best && groups.length < 5) return 0;
    if (best) found++;
    score += best;
  }
  if (found < Math.ceil(groups.length * 0.6)) return 0;
  // Prefiere nombres cortos y ejercicios básicos cuando la coincidencia es similar.
  score -= ex._t.length / 30;
  if (ex._basic) score += 1.5;
  if (ex.editorial) score += 4;
  if (ex.nameEs) score += 0.8;
  if (VARIANT.test(ex._t)) score -= 1;
  if (ex.category === "strength" || ex.category === "stretching") score += 0.5;
  if (ex.level === "beginner") score += 0.3;
  return score;
}

// Sin búsqueda, primero los ejercicios básicos y con imagen, que son buenos para empezar.
function baseScore(ex) {
  let s = 1;
  if (ex.featured) s += 12;
  if (ex.nameEs) s += 1;
  if (ex._basic) s += 3;
  if (ex._visual) s += 1;
  if (ex.level === "beginner") s += 0.6;
  if (ex.mechanic === "compound") s += 0.5;
  if (ex.category === "strength") s += 0.4;
  if (VARIANT.test(ex._t)) s -= 1;
  return Math.max(0.1, s - ex._t.length / 30);
}

export const EMPTY_FILTERS = {
  q: "",
  zona: "",
  musculo: [],
  equipo: [],
  nivel: [],
  tipo: [],
  media: false,
  orden: "relevancia",
};

export function filtersFromParams(p) {
  const list = (k) => (p.get(k) ? p.get(k).split(",").filter(Boolean) : []);
  return {
    q: p.get("q") ?? "",
    zona: p.get("zona") ?? "",
    musculo: list("musculo"),
    equipo: list("equipo"),
    nivel: list("nivel"),
    tipo: list("tipo"),
    media: p.get("media") === "1",
    orden: p.get("orden") ?? "relevancia",
  };
}

export function filtersToParams(f) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.zona) p.set("zona", f.zona);
  for (const k of ["musculo", "equipo", "nivel", "tipo"])
    if (f[k].length) p.set(k, f[k].join(","));
  if (f.media) p.set("media", "1");
  if (f.orden && f.orden !== "relevancia") p.set("orden", f.orden);
  return p;
}

export function activeCount(f) {
  return (
    f.musculo.length +
    f.equipo.length +
    f.nivel.length +
    f.tipo.length +
    (f.media ? 1 : 0)
  );
}

function matches(ex, f, skip) {
  const query = norm(f.q),
    categoryIntent = {
      velocidad: "speed",
      speed: "speed",
      sprint: "speed",
      sprints: "speed",
      aceleraciones: "speed",
      agilidad: "agility",
      equilibrio: "balance",
      calentamiento: "warmup",
      "vuelta a la calma": "recovery",
    }[query];
  if (categoryIntent && ex.category !== categoryIntent) return false;
  if (
    ["caminata", "caminar", "walking"].includes(query) &&
    !["cardio", "warmup", "recovery"].includes(ex.category)
  )
    return false;
  if (f.zona) {
    const z = ZONES.find((x) => x.id === f.zona);
    if (z && !ex.primary.some((m) => z.muscles.includes(m))) return false;
  }
  if (
    skip !== "musculo" &&
    f.musculo.length &&
    !ex.primary.some((m) => f.musculo.includes(m))
  )
    return false;
  if (skip !== "equipo" && f.equipo.length && !(f.equipo.includes('unknown') && !ex.equipmentKnown) && !canUseEquipment(ex,f.equipo))
    return false;
  if (
    skip !== "nivel" &&
    f.nivel.length &&
    !f.nivel.includes(ex.level ?? "none")
  )
    return false;
  if (skip !== "tipo" && f.tipo.length && !f.tipo.includes(ex.category))
    return false;
  if (skip !== "media" && f.media && !ex._motion) return false;
  return true;
}

function queryScores(items,q) {
  if (!q) return new Map(items.map(ex=>[ex.id,baseScore(ex)]));
  const evidence = queryEvidence(q);
  const groups = buildGroups(evidence.text);
  const lexical = new Map();
  for (const ex of items) if (matchesEvidence(ex,evidence)) {
    const s = groups.length ? textScore(ex,groups) : baseScore(ex);
    if(s) lexical.set(ex.id,s);
  }
  if (evidence.descriptive || !lexical.size) {
    return new Map(rankDescription(items,q,items.length).map(r=>[r.ex.id,r.score]));
  }
  return lexical;
}
export function search(items, f) {
  const scores = queryScores(items,f.q);
  const out = [];
  for (const ex of items) {
    if (!matches(ex, f)) continue;
    const s = scores.get(ex.id);
    if (!s) continue;
    out.push({
      ex,
      s: s + (ex._visual ? 0.5 : 0) + (ex.source === "fedb" ? 0.2 : 0),
    });
  }
  const byName = (a, b) => a.ex.title.localeCompare(b.ex.title, "es");
  const lv = (x) => (x.ex.level ? LEVEL_ORDER.indexOf(x.ex.level) : 3);
  if (f.orden === "az") out.sort(byName);
  else if (f.orden === "nivel")
    out.sort((a, b) => lv(a) - lv(b) || byName(a, b));
  else out.sort((a, b) => b.s - a.s || byName(a, b));
  return out.map((x) => x.ex);
}

// Conteo por opción respetando los demás filtros, para mostrar cuántos resultados da cada una.
export function facetCounts(items, f) {
  const scores = queryScores(items,f.q);
  const counts = { musculo: {}, equipo: {}, nivel: {}, tipo: {}, media: 0 };
  for (const ex of items) {
    if (!scores.has(ex.id)) continue;
    if (matches(ex, f, "musculo"))
      for (const m of ex.primary)
        counts.musculo[m] = (counts.musculo[m] || 0) + 1;
    if (matches(ex, f, "equipo")) for (const key of Object.keys(EQUIPMENT)) {
      if (key==='unknown' ? !ex.equipmentKnown : canUseEquipment(ex,[...f.equipo.filter(k=>k!=='unknown'),key])) counts.equipo[key]=(counts.equipo[key]||0)+1;
    }
    if (matches(ex, f, "nivel")) {
      const k = ex.level ?? "none";
      counts.nivel[k] = (counts.nivel[k] || 0) + 1;
    }
    if (matches(ex, f, "tipo"))
      counts.tipo[ex.category] = (counts.tipo[ex.category] || 0) + 1;
    if (matches(ex, f, "media") && ex._motion) counts.media++;
  }
  return counts;
}

export function similar(items, ex, n = 4) {
  const main = ex.primary[0];
  if (!main) return [];
  return items
    .filter((x) => x.id !== ex.id && x.primary[0] === main)
    .map((x) => ({
      x,
      s:
        (x.equipment === ex.equipment ? 2 : 0) +
        (x.category === ex.category ? 1 : 0) +
        (x._visual ? 2 : 0) +
        (x.mechanic === ex.mechanic ? 1 : 0),
    }))
    .sort((a, b) => b.s - a.s || a.x.title.localeCompare(b.x.title, "es"))
    .slice(0, n)
    .map((a) => a.x);
}

// Expone prepare para pruebas y para datos agregados en tiempo de ejecución.
export { prepare };
