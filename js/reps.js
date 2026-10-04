// Recomendaciones generales de series, repeticiones y descanso.
// Se basan en los rangos de uso común en guías de entrenamiento (por ejemplo ACSM y NSCA).
// No reemplazan la indicación de un profesional.

export const GOALS = {
  fuerza: {
    label: 'Ganar fuerza',
    desc: 'Levantar más peso. Pocas repeticiones, más descanso.',
    series: [3, 5], amount: '4 a 6', rest: '2 a 3 minutos',
    tip: 'Usa un peso con el que podrías hacer 1 o 2 repeticiones más al terminar la serie.',
  },
  musculo: {
    label: 'Ganar músculo',
    desc: 'Aumentar el tamaño del músculo. Repeticiones medias.',
    series: [3, 4], amount: '8 a 12', rest: '60 a 90 segundos',
    tip: 'Las últimas 2 repeticiones deben costar, sin perder la técnica.',
  },
  resistencia: {
    label: 'Resistencia',
    desc: 'Aguantar más tiempo el esfuerzo. Muchas repeticiones.',
    series: [2, 3], amount: '15 a 20', rest: '30 a 45 segundos',
    tip: 'Peso liviano y ritmo constante de principio a fin.',
  },
  grasa: {
    label: 'Bajar grasa',
    desc: 'Gastar más energía. Circuitos con poco descanso.',
    series: [3, 4], amount: '12 a 15', rest: '30 segundos',
    tip: 'Haz los ejercicios uno tras otro como circuito y descansa al terminar la vuelta.',
  },
  movilidad: {
    label: 'Movilidad',
    desc: 'Moverte mejor y con menos rigidez. Estiramientos.',
    series: [2, 3], amount: '20 a 30', rest: '15 segundos',
    tip: 'Estira hasta sentir tensión, nunca dolor. Respira lento.',
  },
};

export const GOAL_ORDER = ['musculo', 'fuerza', 'resistencia', 'grasa', 'movilidad'];

const pickSeries = ([a, b], level) =>
  level === 'beginner' ? a : level === 'expert' ? b : Math.round((a + b) / 2);

/**
 * Devuelve la dosis sugerida para un ejercicio.
 * series: número de series o rondas
 * seriesLabel: palabra para las series (series, rondas, vez)
 * amount y unit: cantidad y unidad por serie
 * rest: descanso entre series
 */
export function prescribe(ex, goal = 'musculo', level = 'beginner') {
  const g = GOALS[goal] ?? GOALS.musculo;
  const lv = level || 'intermediate';
  const primary = ex.primary ?? [];

  if (ex.category === 'stretching') {
    return { series: lv === 'beginner' ? 2 : 3, seriesLabel: 'series', amount: '20 a 30', unit: 'segundos por lado', rest: '15 segundos' };
  }
  if (ex.category === 'cardio') {
    if (goal === 'grasa') {
      return { series: lv === 'beginner' ? 6 : lv === 'expert' ? 10 : 8, seriesLabel: 'rondas', amount: '20 segundos rápido y 40', unit: 'segundos suave', rest: 'sin pausa' };
    }
    const min = lv === 'beginner' ? 10 : lv === 'expert' ? 25 : 15;
    return { series: 1, seriesLabel: 'vez', amount: String(min), unit: 'minutos a ritmo moderado', rest: '' };
  }
  if (ex.category === 'plyometrics') {
    return {
      series: pickSeries([3, 5], lv), seriesLabel: 'series',
      amount: goal === 'fuerza' ? '3 a 5' : '6 a 10', unit: 'saltos',
      rest: goal === 'grasa' ? '45 segundos' : '60 a 90 segundos',
    };
  }
  if (ex.category === 'olympic weightlifting') {
    return { series: pickSeries([3, 6], lv), seriesLabel: 'series', amount: goal === 'fuerza' ? '1 a 3' : '2 a 4', unit: 'repeticiones', rest: '2 a 3 minutos' };
  }
  if (ex.category === 'strongman') {
    return { series: pickSeries([3, 5], lv), seriesLabel: 'series', amount: '20 a 40', unit: 'segundos', rest: '90 segundos a 2 minutos' };
  }
  if (ex.force === 'static') {
    const t = { fuerza: '20 a 30', musculo: '30 a 45', resistencia: '45 a 60', grasa: '30 a 45', movilidad: '20 a 30' }[goal] ?? '30 a 45';
    return { series: pickSeries(g.series, lv), seriesLabel: 'series', amount: t, unit: 'segundos sosteniendo', rest: g.rest };
  }

  let amount = g.amount;
  if (goal === 'movilidad') amount = '10 a 12';
  if (ex.mechanic === 'isolation' && goal === 'fuerza') amount = '6 a 8';
  if (primary.some((m) => ['abdominals', 'calves', 'forearms', 'neck'].includes(m))) {
    amount = { fuerza: '8 a 12', musculo: '12 a 15', resistencia: '15 a 25', grasa: '15 a 20', movilidad: '10 a 12' }[goal] ?? amount;
  }
  return { series: pickSeries(g.series, lv), seriesLabel: 'series', amount, unit: goal === 'movilidad' ? 'repeticiones lentas' : 'repeticiones', rest: g.rest };
}

export function repsText(p) {
  return [p.amount, p.unit].filter(Boolean).join(' ');
}

export function doseText(p) {
  const reps = repsText(p);
  if (!p.series || p.series <= 1) return reps.charAt(0).toUpperCase() + reps.slice(1);
  return `${p.series} ${p.seriesLabel || 'series'} de ${reps}`;
}
