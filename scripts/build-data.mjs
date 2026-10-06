#!/usr/bin/env node
// Actualización reproducible: un fallo remoto conserva los recursos publicados.
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const ROOT = new URL("../", import.meta.url);
const IMG =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const FEDB =
  process.env.FEDB_URL ||
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const WGER = (process.env.WGER_BASE || "https://wger.de").replace(/\/$/, "");
const log = (...args) => console.log("[datos]", ...args);
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const licenses = {
  1: ["CC BY-SA 3.0", "by-sa/3.0"],
  2: ["CC BY-SA 4.0", "by-sa/4.0"],
  3: ["CC0 1.0", "../publicdomain/zero/1.0"],
  4: ["CC BY 4.0", "by/4.0"],
  5: ["ODbL", null],
};
const safeUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};
async function readJSON(path, fallback) {
  try {
    return JSON.parse(await readFile(new URL(path, ROOT), "utf8"));
  } catch {
    return fallback;
  }
}
async function getJSON(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
}
export function htmlToSteps(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\s*(p|br|li|div)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}
const muscleRules = [
  [/biceps femoris|hamstring/, "hamstrings"],
  [/tricep/, "triceps"],
  [/bicep|brachialis/, "biceps"],
  [/abdom|oblique|\babs\b|core/, "abdominals"],
  [/glut/, "glutes"],
  [/quad/, "quadriceps"],
  [/gastrocn|soleus|calv|calf/, "calves"],
  [/pector|chest/, "chest"],
  [/delt|shoulder/, "shoulders"],
  [/latiss|\blats\b/, "lats"],
  [/rhomboid|middle back|upper back|teres/, "middle back"],
  [/erector|lower back/, "lower back"],
  [/trap/, "traps"],
  [/forearm|wrist|brachiorad/, "forearms"],
  [/abductor/, "abductors"],
  [/adductor/, "adductors"],
  [/neck/, "neck"],
];
const mapMuscles = (list) => [
  ...new Set(
    (list || [])
      .map(
        (m) =>
          muscleRules.find(([re]) =>
            re.test(norm(m.name_en || m.name || m)),
          )?.[1],
      )
      .filter(Boolean),
  ),
];
const equipmentRules = [
  [/treadmill/, "treadmill"],
  [/stationary|exercise bike/, "stationary bike"],
  [/rowing machine|rower/, "rowing machine"],
  [/elliptic/, "elliptical"],
  [/pull up bar/, "pullup bar"],
  [/bench/, "bench"],
  [/sz|ez|curl bar/, "e-z curl bar"],
  [/barbell|olympic bar/, "barbell"],
  [/dumbbell/, "dumbbell"],
  [/kettlebell/, "kettlebells"],
  [/cable|pulley/, "cable"],
  [/band/, "bands"],
  [/machine|multipress/, "machine"],
  [/medicine ball/, "medicine ball"],
  [/swiss|gym ball/, "exercise ball"],
];
function equipment(list) {
  const found = (list || [])
    .map((e) => equipmentRules.find(([re]) => re.test(norm(e.name || e)))?.[1])
    .filter(Boolean);
  return (
    found.find((e) => e !== "bench") ||
    found[0] ||
    (!list?.length || list.some((e) => /none|body/i.test(e.name || e))
      ? "body only"
      : "other")
  );
}
function attribution(obj, kind, exercise) {
  const lic = licenses[obj.license?.id || obj.license];
  return {
    kind,
    author:
      obj.license_author ||
      (obj.author_history || []).join(", ") ||
      "Comunidad de wger",
    name: lic?.[0] || "Consultar fuente",
    url: lic?.[1]
      ? new URL(lic[1] + "/", "https://creativecommons.org/licenses/").href
      : "",
    source: `https://wger.de/en/exercise/${exercise}/view/`,
  };
}
export function normalizeWger(records) {
  return records
    .map((x) => {
      const en = x.translations?.find((t) => t.language === 2),
        es = x.translations?.find((t) => t.language === 4);
      const name = en?.name || es?.name;
      if (!name) return null;
      const images = (x.images || []).filter(
        (i) => !i.is_ai_generated && safeUrl(i.image),
      );
      const videos = (x.videos || []).filter((v) => safeUrl(v.video));
      return {
        id: `wger-${x.id}`,
        wgerId: x.id,
        name,
        nameEs: es?.name,
        steps: htmlToSteps(en?.description),
        stepsEs: htmlToSteps(es?.description),
        instructionCredit: es
          ? "Texto en español de la comunidad de wger; autoría al final de la ficha."
          : undefined,
        aliases: [...(en?.aliases || []), ...(es?.aliases || [])]
          .map((a) => (typeof a === "string" ? a : a.alias || a.name))
          .filter(Boolean),
        primary: mapMuscles(x.muscles),
        secondary: mapMuscles(x.muscles_secondary),
        equipment: equipment(x.equipment),
        category: /cardio/i.test(x.category?.name)
          ? "cardio"
          : /stretch/i.test(name)
            ? "stretching"
            : "strength",
        level: null,
        force: null,
        mechanic: null,
        images: images.map((i) => i.image),
        videos: videos.map((v) => v.video),
        videoInfo: videos.map((v) => ({
          url: v.video,
          codec: v.codec,
          size: v.size,
          ...attribution(v, "Video original", x.id),
        })),
        source: "wger",
        sourceLinks: [
          {
            title: "wger · ficha original",
            url: `https://wger.de/en/exercise/${x.id}/view/`,
            kind: "original",
          },
        ],
        attributions: [
          en && attribution(en, "Texto original", x.id),
          es && attribution(es, "Texto en español", x.id),
          ...images.map((i) => attribution(i, "Imagen", x.id)),
          ...videos.map((v) => attribution(v, "Video original", x.id)),
        ].filter(Boolean),
      };
    })
    .filter(
      (x) =>
        x &&
        (x.steps.length ||
          x.stepsEs.length ||
          x.images.length ||
          x.videos.length),
    );
}
const knownMatches = {
  "bench press": "Barbell_Bench_Press_-_Medium_Grip",
  "benchpress dumbbells": "Dumbbell_Bench_Press",
  "biceps curls with dumbbell": "Dumbbell_Bicep_Curl",
  "biceps curls with barbell": "Barbell_Curl",
  "barbell lunges standing": "Barbell_Lunge",
  "dumbbell lunges standing": "Dumbbell_Lunges",
  "pull ups": "Pullups",
  "shoulder press dumbbells": "Dumbbell_Shoulder_Press",
  "rowing seated narrow grip": "Seated_Cable_Rows",
  "hip thrust": "Barbell_Hip_Thrust",
  "triceps extensions on cable": "Triceps_Pushdown",
};
export function mergeWger(items, incoming) {
  const byId = new Map(items.map((x) => [x.id, x])),
    exact = new Map(items.map((x) => [norm(x.name), x]));
  let matched = 0;
  for (const w of incoming) {
    const hit = byId.get(knownMatches[norm(w.name)]) || exact.get(norm(w.name));
    if (!hit) {
      items.push(structuredClone(w));
      continue;
    }
    matched++;
    if (w.nameEs) hit.nameEs = w.nameEs;
    if (w.stepsEs?.length) {
      hit.stepsEs = w.stepsEs;
      hit.instructionCredit = w.instructionCredit;
    }
    if (w.videos.length) {
      hit.videos = w.videos;
      hit.videoInfo = w.videoInfo;
    }
    if (!hit.images.length) hit.images = w.images;
    hit.wgerId = w.wgerId;
    hit.sourceLinks = [...(hit.sourceLinks || []), ...w.sourceLinks];
    hit.attributions = [...(hit.attributions || []), ...w.attributions];
    hit.aliases = [...(hit.aliases || []), ...w.aliases];
    hit.also = ["wger"];
  }
  return matched;
}
async function main() {
  const previous = await readJSON("data/exercises.json", { exercises: [] });
  let items;
  try {
    const raw = process.env.FEDB_INPUT_FILE
      ? JSON.parse(await readFile(process.env.FEDB_INPUT_FILE, "utf8"))
      : await getJSON(FEDB);
    if (!Array.isArray(raw) || raw.length < 500)
      throw new Error("Base principal incompleta");
    items = raw.map((x) => ({
      id: x.id,
      name: x.name,
      category: x.category || "strength",
      level: x.level ?? null,
      force: x.force ?? null,
      mechanic: x.mechanic ?? null,
      equipment: x.equipment || "body only",
      primary: x.primaryMuscles || [],
      secondary: x.secondaryMuscles || [],
      steps: x.instructions || [],
      images: (x.images || []).map((p) => IMG + p),
      source: "fedb",
    }));
  } catch (e) {
    items = previous.exercises
      .filter((x) => x.source === "fedb")
      .map((x) => ({ ...x }));
    if (items.length < 500)
      throw new Error(`No hay respaldo suficiente: ${e.message}`);
    log("Free Exercise DB no disponible. Se conserva la base incluida.");
  }
  for (const x of items)
    x.sourceLinks ||= [
      {
        title: "Free Exercise DB · registro original",
        url: `https://github.com/yuhonas/free-exercise-db/blob/main/exercises/${encodeURIComponent(x.id)}.json`,
        kind: "original",
      },
    ];
  let wg = await readJSON("data/source-wger.json", []),
    wgerStatus = wg.length ? "respaldo incluido" : "no disponible";
  if (process.env.USE_WGER !== "0")
    try {
      let records;
      if (process.env.WGER_INPUT_FILE)
        records = JSON.parse(
          await readFile(process.env.WGER_INPUT_FILE, "utf8"),
        );
      else {
        records = [];
        let url = `${WGER}/api/v2/exerciseinfo/?limit=200`;
        for (let page = 0; url && page < 30; page++) {
          const j = await getJSON(url);
          if (!Array.isArray(j.results))
            throw new Error("Respuesta wger inválida");
          records.push(...j.results);
          url = j.next ? new URL(j.next, WGER).href : "";
        }
      }
      const next = normalizeWger(records);
      if (next.length < 100) throw new Error("Respuesta wger incompleta");
      wg = next;
      await writeFile(
        new URL("data/source-wger.json", ROOT),
        JSON.stringify(wg),
      );
      wgerStatus = "actualizado";
    } catch (e) {
      log(
        `wger: ${e.message}; se conserva el respaldo con ${wg.length} registros.`,
      );
    }
  if (!wg.length) wg = previous.exercises.filter((x) => x.source === "wger");
  const matched = mergeWger(items, wg);
  const editorial = await readJSON("data/editorial.json", {
    exercises: [],
    updates: [],
  });
  const byId = new Map(items.map((x) => [x.id, x]));
  for (const patch of editorial.updates) {
    const x = byId.get(patch.id);
    if (x)
      Object.assign(x, patch, {
        sourceLinks: [...(x.sourceLinks || []), ...patch.sourceLinks],
      });
    else log("Ficha editorial pendiente: no existe", patch.id);
  }
  items.push(...editorial.exercises);
  const media = await readJSON("data/media.json", []);
  for (const m of media)
    for (const x of items.filter((x) => x.wgerId === m.wgerId)) {
      x.videos = [m.video, ...(x.videos || [])];
      x.gif = m.gif;
      x.images = [m.poster, ...x.images];
      x.attributions = [...(x.attributions || []).filter(a=>a.kind !== 'MP4, GIF y miniatura derivados'), m.attribution];
    }
  for (const x of items) {
    if (x.source === "editorial") {
      x.images = [`assets/illustrations/${x.family}.svg`];
      x.illustration = true;
    }
    x.sourceLinks = [
      ...new Map(
        (x.sourceLinks || [])
          .filter((r) => safeUrl(r.url))
          .map((r) => [r.url, r]),
      ).values(),
    ];
    x.aliases = [...new Set(x.aliases || [])];
    x.images = [...new Set(x.images || [])];
    x.videos = [...new Set(x.videos || [])];
    x.attributions = [
      ...new Map(
        (x.attributions || []).map((a) => [JSON.stringify(a), a]),
      ).values(),
    ];
    if (/treadmill/i.test(x.name)) x.equipment = "treadmill";
    if (/bicycling.*stationary|stationary.*bike/i.test(x.name))
      x.equipment = "stationary bike";
    if (/rowing.*stationary|rowing.*machine/i.test(x.name))
      x.equipment = "rowing machine";
  }
  items = [
    ...new Map(
      items.filter((x) => x.name && x.id).map((x) => [x.id, x]),
    ).values(),
  ];
  const coverage = {
    exercises: items.length,
    spanish: items.filter((x) => x.stepsEs?.length).length,
    videos: items.filter((x) => x.videos?.length).length,
    gifs: items.filter((x) => x.gif).length,
    linked: items.filter((x) => x.sourceLinks?.length).length,
  };
  const payload = {
    version: 2,
    generated: new Date().toISOString(),
    editorialReviewed: editorial.reviewed,
    coverage,
    sources: [
      {
        id: "fedb",
        name: "Free Exercise DB",
        url: "https://github.com/yuhonas/free-exercise-db",
        license: "Unlicense declarada por el proyecto; sin revisión clínica",
        count: items.filter((x) => x.source === "fedb").length,
      },
      {
        id: "wger",
        name: "wger",
        url: "https://wger.de",
        license: "Ver licencia y autor de cada recurso",
        count: wg.length,
        matched,
        status: wgerStatus,
      },
      {
        id: "editorial",
        name: "Guías en español de Rutina Libre",
        url: "https://www.nhs.uk/live-well/exercise/",
        license: "Síntesis original MIT; fuentes de contexto enlazadas",
        count: editorial.exercises.length + editorial.updates.length,
      },
      {
        id: "nhs",
        name: "NHS y NHS South Tees",
        url: "https://www.nhs.uk/live-well/exercise/",
        license: "Referencias externas",
      },
      {
        id: "wa",
        name: "World Athletics",
        url: "https://worldathletics.org",
        license: "Referencias externas",
      },
      {
        id: "mayo",
        name: "Mayo Clinic y ACE",
        url: "https://www.mayoclinic.org/health/strength-training/MY00033",
        license: "Referencias externas",
      },
    ],
    exercises: items,
  };
  await mkdir(new URL("data/", ROOT), { recursive: true });
  const temporary = new URL("data/exercises.tmp.json", ROOT);
  await writeFile(temporary, JSON.stringify(payload));
  await rename(temporary, new URL("data/exercises.json", ROOT));
  log("Cobertura:", JSON.stringify(coverage));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
