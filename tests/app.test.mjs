import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { prepare, search, EMPTY_FILTERS } from "../js/data.js";
import { rankDescription, classifySketch } from "../js/intelligence.js";
import { generateRoutine } from "../js/generator.js";
import { prescribe } from "../js/reps.js";
import { normalizeWger, mergeWger } from "../scripts/build-data.mjs";
const root = new URL("../", import.meta.url),
  payload = JSON.parse(readFileSync(new URL("data/exercises.json", root)));
const items = payload.exercises.map(prepare),
  byId = new Map(items.map((ex) => [ex.id, ex]));
const filters = (extra) => ({ ...EMPTY_FILTERS, ...extra });

test("el catálogo conserva la base original, IDs únicos y recursos locales existentes", () => {
  assert.ok(items.filter((ex) => ex.source === "fedb").length >= 870);
  assert.equal(byId.size, items.length);
  assert.equal(search(items, filters({})).length, items.length);
  for (const ex of items) {
    assert.ok(ex.sourceLinks.length > 0, ex.id);
    for (const url of [...ex.images, ...(ex.videos || []), ex.gif].filter(
      Boolean,
    ))
      if (url.startsWith("assets/"))
        assert.ok(existsSync(new URL(url, root)), `${ex.id}: ${url}`);
  }
});
test("caminata y velocidad priorizan los movimientos solicitados", () => {
  const walking = search(items, filters({ q: "caminata" }));
  assert.match(walking[0].title, /Caminata/);
  assert.ok(
    walking.every((ex) =>
      ["cardio", "warmup", "recovery"].includes(ex.category),
    ),
  );
  const speed = search(items, filters({ q: "velocidad" }));
  assert.equal(speed[0].id, "rl-sprint");
  assert.ok(speed.every((ex) => ex.category === "speed"));
  assert.equal(
    search(items, filters({ q: "sentadila" }))[0].id,
    "Bodyweight_Squat",
  );
});
test("el filtro de caminadora no confunde equipo ni pierde fichas con videos", () => {
  const treadmill = search(items, filters({ equipo: ["treadmill"] }));
  assert.ok(treadmill.length >= 6);
  assert.ok(treadmill.every((ex) => ex.equipment === "treadmill"));
  const media = search(items, filters({ media: true }));
  assert.ok(media.length >= 6);
  assert.ok(media.some((ex) => ex.gif?.startsWith("assets/media/")));
});
test("descripciones naturales identifican movimientos y rechazan texto ajeno", () => {
  const cases = [
    [
      "Estoy boca arriba, doblo las rodillas y elevo la pelvis",
      "Butt_Lift_Bridge",
    ],
    ["Estoy apoyado en las manos boca abajo y subo y bajo el pecho", "Pushups"],
    ["Tengo una mancuerna y doblo el codo", "Dumbbell_Bicep_Curl"],
    ["Camino en una caminadora con inclinación", "rl-caminadora-inclinada"],
  ];
  for (const [q, id] of cases)
    assert.equal(rankDescription(items, q, 3)[0]?.ex.id, id, q);
  assert.deepEqual(rankDescription(items, "pizza chocolate naranja"), []);
  assert.ok(
    rankDescription(items, "sentadilla sin equipo").every(
      (r) => r.ex.equipment === "body only",
    ),
  );
});
test("boceto lateral nuevo y reflejado reconoce una familia; entrada vacía no inventa", () => {
  // Ejemplo dibujado con proporciones diferentes a los prototipos, sin usar poseStrokes.
  const head = Array.from({ length: 21 }, (_, i) => [
    286 + 16 * Math.cos((i * Math.PI) / 10),
    92 + 16 * Math.sin((i * Math.PI) / 10),
  ]);
  const sketch = [
    head,
    [
      [281, 109],
      [264, 135],
      [201, 194],
    ],
    [
      [264, 135],
      [317, 143],
      [359, 144],
    ],
    [
      [264, 135],
      [305, 158],
      [358, 158],
    ],
    [
      [201, 194],
      [278, 213],
      [267, 294],
    ],
    [
      [201, 194],
      [227, 236],
      [229, 294],
    ],
  ];
  assert.equal(classifySketch(sketch)[0]?.family, "squat");
  assert.equal(
    classifySketch(sketch.map((s) => s.map(([x, y]) => [500 - x, y])))[0]
      ?.family,
    "squat",
  );
  assert.deepEqual(classifySketch([]), []);
  assert.deepEqual(
    classifySketch([
      [
        [1, 1],
        [2, 2],
      ],
    ]),
    [],
  );
});
test("caminata no cambia a HIIT por un objetivo de grasa y sprint exige adaptación", () => {
  assert.deepEqual(
    prescribe(byId.get("rl-caminata"), "grasa", "beginner"),
    prescribe(byId.get("rl-caminata"), "cardio", "beginner"),
  );
  assert.match(
    prescribe(byId.get("rl-sprint"), "velocidad", "beginner").amount,
    /técnica/,
  );
  assert.match(
    prescribe(byId.get("rl-sprint"), "velocidad", "expert").unit,
    /metros/,
  );
});
test("rutinas nuevas respetan equipo, nivel y recuperación entre días intensos", () => {
  const prefs = {
    goal: "cardio",
    level: "beginner",
    days: 3,
    minutes: 30,
    equipment: ["treadmill"],
    focus: [],
  };
  const cardio = generateRoutine(items, prefs, 21);
  assert.equal(cardio.days.length, 3);
  assert.ok(
    cardio.days.every((d) =>
      d.items.some((it) => byId.get(it.exId).equipment === "treadmill"),
    ),
  );
  for (const day of cardio.days)
    for (const it of day.items)
      assert.ok(
        ["body only", "treadmill"].includes(byId.get(it.exId).equipment),
      );
  const speed = generateRoutine(
    items,
    { ...prefs, goal: "velocidad", level: "intermediate", days: 5 },
    3,
  );
  const intense = speed.days.map((d) =>
    d.items.some((it) => byId.get(it.exId).id === "rl-aceleraciones"),
  );
  assert.deepEqual(intense, [true, false, true, false, true]);
  assert.ok(
    speed.days
      .flatMap((d) => d.items)
      .every((it) => byId.get(it.exId).id !== "rl-sprint"),
  );
});
test("la unión conserva autoría de textos y videos; no une variantes solo por prefijo", () => {
  const records = [
    {
      id: 1,
      translations: [
        {
          language: 2,
          name: "Squat",
          description: "<p>Instruction</p>",
          license: 2,
          license_author: "Original",
        },
        {
          language: 4,
          name: "Sentadilla",
          description: "<p>Pasos</p>",
          license: 4,
          license_author: "Traductor",
        },
      ],
      images: [],
      videos: [
        {
          video: "https://wger.de/demo.mp4",
          license: 2,
          license_author: "Autor del video",
          codec: "h264",
        },
      ],
      muscles: [],
      equipment: [],
      category: { name: "Legs" },
    },
  ];
  const incoming = normalizeWger(records),
    base = [
      { id: "example", name: "Squat", images: [], steps: [], sourceLinks: [] },
    ];
  mergeWger(base, incoming);
  assert.equal(base[0].stepsEs[0], "Pasos");
  assert.ok(
    base[0].attributions.some(
      (a) => a.author === "Traductor" && a.name === "CC BY 4.0",
    ),
  );
  assert.ok(base[0].attributions.some((a) => a.author === "Autor del video"));
  const variant = [
    {
      id: "different",
      name: "Squat with chains",
      images: [],
      steps: [],
      sourceLinks: [],
    },
  ];
  mergeWger(variant, incoming);
  assert.equal(variant.length, 2);
  assert.equal(variant[0].videos, undefined);
});
test("GIF y MP4 incluidos contienen medios reales con licencia por recurso", () => {
  const media = JSON.parse(readFileSync(new URL("data/media.json", root)));
  assert.ok(media.length >= 6);
  for (const entry of media) {
    const gif = readFileSync(new URL(entry.gif, root));
    assert.match(gif.subarray(0, 6).toString(), /^GIF8[79]a$/);
    const mp4 = readFileSync(new URL(entry.video, root));
    assert.ok(mp4.includes(Buffer.from("ftyp")));
    assert.equal(entry.attribution.name, "CC BY-SA 4.0");
    assert.ok(entry.attribution.author && entry.attribution.changes);
  }
});
