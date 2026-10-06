import { loadData } from "./data.js";
import { rankDescription, classifySketch } from "./intelligence.js";
import { POSES, poseStrokes, FAMILY_LABELS, EXAMPLE_IDS } from "./motions.js";
import { card, wireCardHover, wireSaveButtons } from "./catalog.js";
import { esc, icon, setTitle, $, $$ } from "./ui.js";

export async function renderDetector(main) {
  const data = await loadData();
  setTitle("Identificar un ejercicio");
  main.innerHTML = `<div class="wrap page detector">
    <header class="page__head detector__head"><span class="eyebrow">ENCUENTRA EL MOVIMIENTO</span><h1 tabindex="-1">¿No sabes cómo se llama?</h1><p class="lead">Descríbelo con tus palabras o dibuja su postura. Te mostramos ejercicios del catálogo para que puedas comparar.</p><span class="privacy-tag">${icon("bookmark")} Tu descripción y tu dibujo se procesan en este navegador</span></header>
    <div class="detector__workspace">
      <section class="detector__text" aria-labelledby="describe-h"><span class="step-label">01 / CUÉNTANOS</span><h2 id="describe-h">Describe lo que recuerdas</h2>
        <form id="identify-form"><label for="description">Posición, movimiento y equipo</label><textarea id="description" rows="6" maxlength="800" placeholder="Estoy boca arriba, con las rodillas dobladas, y levanto la cadera del suelo…" aria-describedby="description-help"></textarea><p id="description-help" class="muted">Prueba: cómo están las manos, qué parte se mueve y si usas peso. Puedes añadir texto al dibujo.</p>
        <div class="description-examples" role="group" aria-label="Ejemplos de descripción">
        <button type="button" class="chip" data-description="Estoy boca abajo, apoyado en las manos, y subo y bajo el pecho doblando los brazos">Bajo y subo el pecho</button>
        <button type="button" class="chip" data-description="Estoy boca arriba con rodillas dobladas y elevo la cadera y la pelvis">Levanto la cadera</button>
        <button type="button" class="chip" data-description="Camino en una caminadora con la cinta inclinada">Camino en una cinta</button></div>
        <button class="btn btn--primary btn--large" type="submit" data-identify>${icon("search")}Identificar ejercicio</button></form>
        <details class="detector__method"><summary>Cómo funciona y qué puede reconocer</summary><p>El texto usa búsqueda BM25, sinónimos en español y pistas del movimiento. El dibujo se compara mediante vecinos más cercanos con posturas esquemáticas de 15 familias. Funciona mejor con figuras de palitos y una postura clara.</p><p>Una imagen estática puede parecerse a varios ejercicios. El dibujo no mide técnica, repeticiones ni velocidad y no distingue todas las variantes. Las coincidencias son sugerencias para verificar.</p></details>
      </section>
      <section class="detector__draw" aria-labelledby="draw-h"><span class="step-label">02 / SI LO PREFIERES</span><h2 id="draw-h">Dibuja la postura</h2><p class="muted">Cabeza, tronco, brazos y piernas. Una persona de palitos vista de lado es suficiente para intentar la búsqueda.</p>
        <div class="draw-board"><canvas id="sketch" width="420" height="328" aria-label="Área para dibujar una postura con ratón o pantalla táctil" aria-describedby="sketch-help"></canvas><span class="draw-board__hint" aria-hidden="true">Dibuja aquí</span></div>
        <p id="sketch-help" class="visually-hidden">Puedes usar la descripción de texto como alternativa accesible al dibujo.</p>
        <div class="draw-tools"><button type="button" class="btn btn--small" data-undo>Deshacer trazo</button><button type="button" class="btn btn--small btn--ghost" data-clear-sketch>${icon("trash")}Borrar dibujo</button></div>
        <div class="sample-tools"><label for="pose-example">Ver un ejemplo de dibujo</label><select id="pose-example"><option value="">Elige una postura…</option><option value="squat">Sentadilla</option><option value="pushup">Flexión</option><option value="bridge">Puente de glúteos</option><option value="run">Carrera</option><option value="press">Press sobre la cabeza</option><option value="plank">Plancha</option></select><p class="muted">El ejemplo reemplaza el dibujo actual. Puedes borrarlo y hacer el tuyo.</p></div>
      </section>
    </div>
    <section class="detector__results" aria-labelledby="identify-h"><h2 id="identify-h">Coincidencias posibles</h2><p class="identify-status" role="status" aria-live="polite">Describe un movimiento o dibuja una postura para empezar.</p><div class="match-families"></div><ul class="grid" role="list"></ul></section>
  </div>`;
  const canvas = $("#sketch", main),
    context = canvas.getContext("2d"),
    text = $("#description", main),
    status = $(".identify-status", main),
    grid = $(".grid", main),
    button = $("[data-identify]", main);
  let strokes = [],
    active = null,
    drawing = false,
    disposed = false,
    pending = 0;
  const logicalWidth = 420,
    logicalHeight = 328;
  function repaint() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== logicalWidth * ratio) {
      canvas.width = logicalWidth * ratio;
      canvas.height = logicalHeight * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.strokeStyle = "#234938";
    context.lineWidth = 5;
    context.lineJoin = "round";
    context.lineCap = "round";
    for (const stroke of strokes) {
      context.beginPath();
      stroke.forEach(([x, y], i) =>
        i ? context.lineTo(x, y) : context.moveTo(x, y),
      );
      context.stroke();
    }
    $(".draw-board__hint", main).hidden = strokes.length > 0;
    $("[data-undo]", main).disabled = !strokes.length;
  }
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * logicalWidth,
      ((e.clientY - r.top) / r.height) * logicalHeight,
    ];
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    active = [point(e)];
    strokes.push(active);
    repaint();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    active.push(point(e));
    repaint();
  });
  const finish = () => {
    drawing = false;
    active = null;
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  canvas.addEventListener("lostpointercapture", finish);
  $("[data-undo]", main).addEventListener("click", () => {
    strokes.pop();
    repaint();
  });
  $("[data-clear-sketch]", main).addEventListener("click", () => {
    strokes = [];
    $("#pose-example", main).value = "";
    repaint();
  });
  $("#pose-example", main).addEventListener("change", (e) => {
    if (!e.target.value) return;
    const f = e.target.value,
      frame = Math.min(1, POSES[f].length - 1);
    strokes = poseStrokes(f, frame).map((s) =>
      s.map(([x, y]) => [x * 1.13 + 28, y * 1.13 + 14]),
    );
    repaint();
  });
  $$("[data-description]", main).forEach((b) =>
    b.addEventListener("click", () => {
      text.value = b.dataset.description;
      text.focus();
    }),
  );
  wireCardHover(grid);
  wireSaveButtons(grid);
  $("#identify-form", main).addEventListener("submit", (e) => {
    e.preventDefault();
    if (button.disabled) return;
    const query = text.value.trim();
    if (!query && strokes.length < 3) {
      status.textContent =
        "Escribe una descripción o dibuja al menos tres trazos: tronco, brazos y piernas.";
      return;
    }
    button.disabled = true;
    status.textContent = "Comparando tu descripción y tu postura…";
    // Cede un frame para mostrar el estado; ningún dato se envía a servidores.
    pending = window.setTimeout(() => {
      if (disposed) return;
      try {
        const described = query ? rankDescription(data.items, query, 8) : [];
        const drawn = strokes.length ? classifySketch(strokes, 3) : [];
        const candidates = new Map(described.map((r) => [r.ex.id, { ...r }]));
        for (const match of drawn) {
          const ex = data.byId.get(EXAMPLE_IDS[match.family]);
          if (!ex) continue;
          const item = candidates.get(ex.id) || { ex, score: 0, reasons: [] };
          item.score += match.similarity * (query ? 12 : 40);
          item.reasons.push(
            `Postura parecida a ${FAMILY_LABELS[match.family].toLowerCase()}`,
          );
          candidates.set(ex.id, item);
        }
        let result = [...candidates.values()].sort((a, b) => b.score - a.score);
        if (query && described.length)
          result = result.filter(
            (r) =>
              described.some((d) => d.ex.id === r.ex.id) ||
              r.score >= described[0].score * 0.65,
          );
        result = result.slice(0, 6);
        grid.innerHTML = result.map((r) => card(r.ex)).join("");
        $(".match-families", main).innerHTML = drawn.length
          ? `<p><strong>Posturas parecidas:</strong> ${drawn.map((m) => esc(FAMILY_LABELS[m.family])).join(" · ")}. Una postura no basta para confirmar el ejercicio.</p>`
          : "";
        status.textContent = result.length
          ? `Encontramos ${result.length} coincidencias posibles. Abre las fichas y compara el equipo, la posición y el movimiento.`
          : query
            ? "No hay una coincidencia suficientemente clara. Añade detalles del equipo y de la parte del cuerpo que se mueve."
            : "El dibujo no tiene una coincidencia clara. Prueba una figura de palitos o añade una descripción.";
        if (strokes.length && !drawn.length && result.length)
          status.textContent +=
            " El dibujo no dio una coincidencia clara; se usó la descripción.";
        $(".detector__results", main).scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      } catch (err) {
        console.error(err);
        status.textContent =
          "No se pudo completar la comparación. Prueba de nuevo con una descripción más breve.";
      } finally {
        button.disabled = false;
      }
    }, 30);
  });
  repaint();
  return () => {
    disposed = true;
    clearTimeout(pending);
  };
}
