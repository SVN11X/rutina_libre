// Búsqueda por descripción: BM25 ponderado, sinónimos y pistas de movimiento.
// Clasificador de bocetos: k vecinos más cercanos de nubes de puntos normalizadas.
// Todo se ejecuta localmente. Los resultados son sugerencias, no diagnósticos.
import { SYNONYMS, PHRASES, EQUIPMENT, CATEGORIES, MUSCLES } from "./i18n.js";
import { POSES, poseStrokes } from "./motions.js";
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const STOP = new Set(
  "a al ante bajo con de del desde el ella en entre es este esta estan estoy hago hacer hacia hay la las lo los me mi mientras muy no o para pero por que se sin sobre su sus te tengo tiene un una unas unos y yo ejercicio ejercicios como trata posicion cuerpo quiero cual donde luego volver vez movement exercise repeat position step begin slowly".split(
    " ",
  ),
);
const stem = (t) =>
  t.length > 4
    ? t.replace(/(?:ando|iendo|ados|adas|mente|aciones|acion|es|s)$/, "")
    : t;
const tokenize = (s) =>
  norm(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .map(stem);
const indexes = new WeakMap();
function index(items) {
  if (indexes.has(items)) return indexes.get(items);
  const docs = new Map(),
    df = new Map();
  let total = 0;
  for (const ex of items) {
    const tf = new Map();
    let len = 0;
    const fields = [
      [ex.title || ex.nameEs || ex.name, 5],
      [ex.name, 3],
      [(ex.aliases || []).join(" "), 5],
      [ex.summary, 2],
      [(ex.stepsEs || []).join(" "), 0.8],
      [(ex.steps || []).join(" "), 0.4],
      [EQUIPMENT[ex.equipment], 2],
      [CATEGORIES[ex.category], 1],
      [(ex.primary || []).map((m) => MUSCLES[m]).join(" "), 1],
    ];
    for (const [text, weight] of fields)
      for (const token of tokenize(text)) {
        tf.set(token, (tf.get(token) || 0) + weight);
        len++;
      }
    for (const token of tf.keys()) df.set(token, (df.get(token) || 0) + 1);
    docs.set(ex.id, { tf, len });
    total += len;
  }
  const value = {
    docs,
    df,
    average: total / items.length,
    count: items.length,
  };
  indexes.set(items, value);
  return value;
}
const clues = [
  [
    "pushup",
    /(boca abajo|manos.*suelo|suelo.*manos)/,
    /(subo|bajo|empujo|empujar|doblo|flexiono|pecho|brazos)/,
  ],
  [
    "plank",
    /(antebrazo|plancha|boca abajo)/,
    /(quiet|mantengo|mantener|sostengo|sostener|aguanto)/,
  ],
  ["bridge", /(boca arriba|acostad|tumbad)/, /(cadera|pelvis|gluteo)/],
  ["squat", /(agacho|agacharse|agachar|sentadilla|squat|sentarme)/, null],
  [
    "squat",
    /(bajo|bajar|flexiono|doblo)/,
    /(rodillas.*cadera|cadera.*rodillas)/,
  ],
  ["pullup", /(barra fija|colgado|colgada|dominada|pull up)/, null],
  ["curl", /(mancuerna|peso|biceps|pesas)/, /(codo|doblo|flexiono|curl)/],
  ["press", /(sobre|encima|arriba)/, /(cabeza)/],
  ["lunge", /(paso|pierna)/, /(adelante|delante|zancada|estocada)/],
  ["treadmill", /(caminadora|cinta|treadmill)/, null],
  ["run", /(sprint|correr|trotar|aceleracion|piques)/, null],
  ["walk", /(caminar|caminata|andar|paseo)/, null],
  ["row", /(remo|tirar|tiro)/, /(espalda|mancuerna|mango|codo)/],
  ["deadlift", /(barra|peso)/, /(suelo|cadera atras|peso muerto)/],
];
function conceptFamilies(q) {
  const s = norm(q);
  return new Set(
    clues.filter(([, a, b]) => a.test(s) && (!b || b.test(s))).map(([f]) => f),
  );
}
export function rankDescription(items, query, limit = 6) {
  const q = norm(query).slice(0, 800),
    terms = tokenize(q),
    families = conceptFamilies(q);
  if (!terms.length) return [];
  const idx = index(items),
    expanded = new Map(terms.map((t) => [t, 1]));
  for (const [k, values] of Object.entries(SYNONYMS))
    if (terms.includes(stem(k)))
      for (const v of values) for (const t of tokenize(v)) expanded.set(t, 0.7);
  for (const [k, values] of Object.entries(PHRASES))
    if (q.includes(norm(k)))
      for (const v of values) for (const t of tokenize(v)) expanded.set(t, 0.8);
  const noEquipment = /\bsin (equipo|pesas|mancuernas|barra)\b/.test(q);
  const results = [];
  for (const ex of items) {
    if (noEquipment && ex.equipment !== "body only") continue;
    const doc = idx.docs.get(ex.id);
    let score = 0;
    const found = [];
    for (const [t, weight] of expanded) {
      const tf = doc.tf.get(t) || 0;
      if (!tf) continue;
      const idf = Math.log(
        1 +
          (idx.count - (idx.df.get(t) || 0) + 0.5) /
            ((idx.df.get(t) || 0) + 0.5),
      );
      score +=
        (weight * idf * tf * 2.2) /
        (tf + 1.2 * (0.25 + (0.75 * doc.len) / idx.average));
      if (terms.includes(t)) found.push(t);
    }
    const family = ex.family;
    if (families.has(family)) score += 28;
    if (!score || (!found.length && !families.has(family))) continue;
    if (ex.editorial) score += 1.5;
    // Un solo término común entre muchos no es identificación suficiente.
    if (!families.has(family) && terms.length > 4 && found.length < 2) continue;
    results.push({
      ex,
      score,
      reasons: families.has(family)
        ? ["La postura o acción descrita coincide con este movimiento"]
        : found.slice(0, 3).map((t) => `Coincidencia: ${t}`),
    });
  }
  results.sort((a, b) => b.score - a.score);
  if (!results.length || results[0].score < 3) return [];
  return results
    .filter((r) => r.score >= results[0].score * 0.32)
    .slice(0, limit);
}
function sample(strokes, count = 64) {
  const segments = [];
  let length = 0;
  for (const stroke of strokes)
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1],
        b = stroke[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len) {
        segments.push({ a, b, len, start: length });
        length += len;
      }
    }
  if (length < 20 || !segments.length) return [];
  const pts = [];
  let segment = 0;
  for (let i = 0; i < count; i++) {
    const target = ((i + 0.5) * length) / count;
    while (
      segment < segments.length - 1 &&
      segments[segment].start + segments[segment].len < target
    )
      segment++;
    const s = segments[segment],
      t = (target - s.start) / s.len;
    pts.push([s.a[0] + t * (s.b[0] - s.a[0]), s.a[1] + t * (s.b[1] - s.a[1])]);
  }
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]),
    minX = Math.min(...xs),
    minY = Math.min(...ys),
    scale = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1);
  const meanX = xs.reduce((a, b) => a + b) / count,
    meanY = ys.reduce((a, b) => a + b) / count;
  return pts.map((p) => [(p[0] - meanX) / scale, (p[1] - meanY) / scale]);
}
function distance(a, b) {
  const one = (from, to) =>
    from.reduce(
      (s, p) =>
        s + Math.min(...to.map((t) => Math.hypot(p[0] - t[0], p[1] - t[1]))),
      0,
    ) / from.length;
  return (one(a, b) + one(b, a)) / 2;
}
let training = null;
export function classifySketch(strokes, limit = 4) {
  const query = sample(strokes);
  if (query.length < 64 || strokes.length < 3) return [];
  // Una postura no permite separar caminadora de caminata, ni press de dominada siempre.
  // Se clasifican familias, no variantes ni velocidad del movimiento.
  const families = Object.keys(POSES).filter(
    (f) => !["treadmill", "mobility", "cycle"].includes(f),
  );
  if (!training) {
    training = [];
    for (const family of families)
      for (let frame = 0; frame < POSES[family].length; frame++)
        for (let variant = 0; variant < 3; variant++) {
          const strokes = poseStrokes(family, frame).map((s) =>
            s.map(([x, y], i) => [
              x + (variant ? Math.sin(i * 1.7 + variant) * 3 : 0),
              y + (variant ? Math.cos(i + variant) * 3 : 0),
            ]),
          );
          training.push({ family, points: sample(strokes) });
        }
  }
  const mirror = query.map(([x, y]) => [-x, y]),
    scores = [];
  for (const family of families) {
    const neighbors = training
      .filter((t) => t.family === family)
      .map((t) =>
        Math.min(distance(query, t.points), distance(mirror, t.points)),
      )
      .sort((a, b) => a - b);
    const d = neighbors.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    scores.push({ family, distance: d, similarity: Math.max(0, 1 - d / 0.18) });
  }
  scores.sort((a, b) => a.distance - b.distance);
  if (!scores.length || scores[0].distance > 0.1) return [];
  return scores.filter((s) => s.distance < 0.12).slice(0, limit);
}
