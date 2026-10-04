// Traducción gratuita en el propio dispositivo usando el traductor integrado de Chrome y Edge
// (Translator API). No envía el texto a ningún servidor. Si el navegador no lo tiene,
// se ofrece un enlace a Google Translate.

const OPTS = { sourceLanguage: 'en', targetLanguage: 'es' };
let translatorPromise = null;

export function canTranslateHere() {
  return typeof self !== 'undefined' && 'Translator' in self && typeof self.Translator?.create === 'function';
}

export async function availability() {
  if (!canTranslateHere()) return 'unavailable';
  try {
    return await self.Translator.availability(OPTS);
  } catch {
    return 'unavailable';
  }
}

async function getTranslator(onProgress) {
  if (!translatorPromise) {
    translatorPromise = self.Translator.create({
      ...OPTS,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded));
      },
    }).catch((err) => {
      translatorPromise = null;
      throw err;
    });
  }
  return translatorPromise;
}

export async function translateSteps(steps, onProgress) {
  const tr = await getTranslator(onProgress);
  const out = [];
  for (const s of steps) out.push(await tr.translate(s));
  return out;
}

export function googleTranslateUrl(text) {
  const t = text.length > 4500 ? `${text.slice(0, 4500)}…` : text;
  return `https://translate.google.com/?sl=en&tl=es&op=translate&text=${encodeURIComponent(t)}`;
}
