import { summary } from './generator.js';
import { muscleList, EQUIPMENT, label } from './i18n.js';

// jsPDF se carga solo cuando el usuario pide el PDF, así la página inicial pesa menos.
const JSPDF_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(src));
    document.head.append(s);
  });
}

async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  for (const u of JSPDF_URLS) {
    try {
      await loadScript(u);
      if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    } catch { /* se prueba el siguiente */ }
  }
  throw new Error('No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.');
}

// Convierte una imagen remota en una versión liviana para incrustar en el PDF.
async function toDataUrl(url, maxW = 360) {
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error(String(r.status));
  const blob = await r.blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/jpeg', 0.72), w: c.width, h: c.height };
}

async function loadImages(urls, onProgress) {
  const out = new Map();
  const queue = [...new Set(urls.filter(Boolean))];
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      try { out.set(u, await toDataUrl(u)); } catch { /* sin imagen, se sigue */ }
      onProgress?.(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return out;
}

// Las fuentes estándar de PDF solo cubren caracteres latinos básicos. Esto evita símbolos rotos.
const safe = (s) =>
  String(s ?? '')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2009\u202F]/g, ' ')
    .normalize('NFC')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, '');

const INK = [22, 33, 44];
const MUTED = [90, 100, 112];
const LINE = [205, 209, 200];
const YELLOW = [242, 183, 5];

/**
 * Arma el PDF. Es independiente del navegador para poder probarlo.
 * getEx(id) devuelve el ejercicio. images es un Map url -> {data,w,h}.
 */
export function buildRoutinePdf(JsPDF, routine, getEx, images, opts = {}) {
  const { photos = true, steps = true, siteUrl = '' } = opts;
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 15;
  const CW = W - M * 2;
  let y = M;

  const setText = (size, style = 'normal', color = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lines = (text, width) => doc.splitTextToSize(safe(text), width);
  const lh = (size) => size * 0.42;
  const newPage = () => {
    doc.addPage();
    y = M;
  };
  const ensure = (h) => {
    if (y + h > H - 18) newPage();
  };

  // Encabezado
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, W, 5, 'F');
  y = 20;
  setText(24, 'bold');
  doc.text(safe(routine.title || 'Mi rutina'), M, y);
  y += 8;
  if (routine.prefs) {
    setText(11, 'normal', MUTED);
    for (const l of lines(summary(routine.prefs), CW)) { doc.text(l, M, y); y += lh(11) + 1; }
  }
  setText(9, 'normal', MUTED);
  doc.text(safe(`Creada el ${new Date(routine.created || Date.now()).toLocaleDateString('es-CL')}`), M, y + 1);
  y += 8;

  setText(10, 'normal', INK);
  const how = 'Antes de empezar calienta 5 a 10 minutos con movimiento suave, como caminar rápido, bicicleta o movilidad de articulaciones. Marca una casilla cada semana que completes el ejercicio.';
  for (const l of lines(how, CW)) { doc.text(l, M, y); y += lh(10) + 1; }
  y += 4;

  routine.days.forEach((day) => {
    ensure(24);
    doc.setFillColor(...INK);
    doc.rect(M, y, CW, 9, 'F');
    setText(12, 'bold', [255, 255, 255]);
    doc.text(safe(day.title), M + 3, y + 6.2);
    y += 13;

    if (!day.items.length) {
      setText(10, 'italic', MUTED);
      doc.text('Sin ejercicios en este día.', M, y + 2);
      y += 8;
    }

    day.items.forEach((it, idx) => {
      const ex = getEx(it.exId);
      if (!ex) return;
      const imgUrl = photos ? ex.images?.[0] || ex.gif : null;
      const im = imgUrl ? images.get(imgUrl) : null;
      const imgW = im ? 34 : 0;
      const tx = M + (im ? imgW + 5 : 0);
      const tw = CW - (im ? imgW + 5 : 0) - 40;

      setText(12, 'bold');
      const nameL = lines(`${idx + 1}. ${ex.title}`, tw);
      setText(9, 'normal', MUTED);
      const meta = [muscleList(ex.primary), label(EQUIPMENT, ex.equipment, '')].filter(Boolean).join('. ');
      const metaL = lines(meta, tw);
      const dose = it.series > 1 ? `${it.series} ${it.seriesLabel || 'series'} de ${it.reps}` : it.reps;
      setText(11, 'bold');
      const doseL = lines(dose + (it.rest ? `. Descanso ${it.rest}` : ''), tw);
      const stepsSrc = ex.stepsEs?.length ? ex.stepsEs : ex.steps;
      const stepText = steps && stepsSrc?.length ? stepsSrc.slice(0, 3).join(' ') : '';
      setText(9, 'normal');
      let stepL = stepText ? lines(stepText, tw) : [];
      if (stepL.length > 4) { stepL = stepL.slice(0, 4); stepL[3] = `${stepL[3].replace(/[\s,.;:]+$/, '')}...`; }

      const textH = nameL.length * (lh(12) + 1) + metaL.length * (lh(9) + 1) + doseL.length * (lh(11) + 1) + stepL.length * (lh(9) + 0.8) + 3;
      const imgH = im ? (imgW * im.h) / im.w : 0;
      const blockH = Math.max(textH, imgH, 22) + 5;
      ensure(blockH);

      const top = y;
      if (im) {
        try { doc.addImage(im.data, 'JPEG', M, top, imgW, imgH); } catch { /* imagen inválida */ }
      }
      let ty = top + 4;
      setText(12, 'bold');
      nameL.forEach((l) => { doc.text(l, tx, ty); ty += lh(12) + 1; });
      setText(9, 'normal', MUTED);
      metaL.forEach((l) => { doc.text(l, tx, ty); ty += lh(9) + 1; });
      ty += 0.5;
      setText(11, 'bold');
      doseL.forEach((l) => { doc.text(l, tx, ty); ty += lh(11) + 1; });
      if (stepL.length) {
        setText(9, 'normal', [60, 68, 78]);
        stepL.forEach((l) => { doc.text(l, tx, ty); ty += lh(9) + 0.8; });
      }

      // Casillas para marcar el avance semanal
      const bx = M + CW - 36;
      setText(8, 'normal', MUTED);
      doc.text('Semana', bx, top + 4);
      doc.setDrawColor(...INK);
      doc.setLineWidth(0.3);
      for (let w = 0; w < 4; w++) {
        const cx = bx + w * 9;
        doc.rect(cx, top + 6, 5.5, 5.5);
        doc.text(String(w + 1), cx + 1.7, top + 15.5);
      }

      y = top + blockH;
      doc.setDrawColor(...LINE);
      doc.line(M, y - 2.5, M + CW, y - 2.5);
    });

    const cool = (day.cooldown || []).map(getEx).filter(Boolean);
    if (cool.length) {
      ensure(12);
      setText(10, 'bold');
      doc.text('Para terminar, estira:', M, y + 2);
      setText(10, 'normal');
      const cl = lines(cool.map((c) => c.title).join(', ') + '. Mantén cada estiramiento 20 a 30 segundos.', CW - 40);
      cl.forEach((l, i) => doc.text(l, M + 40, y + 2 + i * (lh(10) + 1)));
      y += 4 + cl.length * (lh(10) + 1);
    }
    y += 6;
  });

  if (routine.notes) {
    ensure(20);
    setText(12, 'bold');
    doc.text('Notas', M, y);
    y += 6;
    setText(10, 'normal');
    for (const l of lines(routine.notes, CW)) { ensure(6); doc.text(l, M, y); y += lh(10) + 1; }
  }

  // Pie de página en todas las hojas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setText(8, 'normal', MUTED);
    doc.text(safe('Guía general de entrenamiento. Si tienes una lesión o condición médica, consulta a un profesional.'), M, H - 9);
    doc.text(safe(`Rutina Libre${siteUrl ? ` | ${siteUrl}` : ''}`), M, H - 5.5);
    doc.text(`${p} / ${total}`, W - M, H - 5.5, { align: 'right' });
  }
  return doc;
}

export async function exportRoutinePdf(routine, getEx, opts = {}, onStatus) {
  onStatus?.('Preparando el PDF');
  const JsPDF = await loadJsPDF();
  let images = new Map();
  if (opts.photos !== false) {
    const urls = routine.days.flatMap((d) => d.items.map((it) => getEx(it.exId)).filter(Boolean).map((ex) => ex.images?.[0] || ex.gif));
    images = await loadImages(urls, (n, t) => onStatus?.(`Cargando fotos ${n} de ${t}`));
  }
  const doc = buildRoutinePdf(JsPDF, routine, getEx, images, { ...opts, siteUrl: location.host + location.pathname });
  const name = `${(routine.title || 'mi-rutina').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mi-rutina'}.pdf`;
  doc.save(name);
  onStatus?.('');
}
