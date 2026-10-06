// Textos en español para los valores que vienen en inglés desde las fuentes de datos.

export const MUSCLES = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Zona lumbar",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

// Explicación corta para los nombres menos conocidos.
export const MUSCLE_HINT = {
  abductors: "parte externa de la cadera",
  adductors: "parte interna del muslo",
  hamstrings: "parte trasera del muslo",
  lats: "costados de la espalda",
  traps: "parte alta de la espalda",
  quadriceps: "parte delantera del muslo",
  calves: "parte trasera de la pierna, bajo la rodilla",
};

export const ZONES = [
  { id: "pecho", label: "Pecho", muscles: ["chest"] },
  {
    id: "espalda",
    label: "Espalda",
    muscles: ["lats", "middle back", "lower back", "traps"],
  },
  { id: "hombros", label: "Hombros", muscles: ["shoulders"] },
  { id: "brazos", label: "Brazos", muscles: ["biceps", "triceps", "forearms"] },
  { id: "abdomen", label: "Abdomen", muscles: ["abdominals"] },
  { id: "gluteos", label: "Glúteos", muscles: ["glutes", "abductors"] },
  {
    id: "piernas",
    label: "Piernas",
    muscles: ["quadriceps", "hamstrings", "calves", "adductors"],
  },
  { id: "cuello", label: "Cuello", muscles: ["neck"] },
];

export const EQUIPMENT = {
  "body only": "Peso corporal",
  treadmill: "Caminadora / cinta",
  "stationary bike": "Bicicleta estática",
  "rowing machine": "Máquina de remo",
  elliptical: "Elíptica",
  "pullup bar": "Barra de dominadas",
  bench: "Banca",
  step: "Escalón / cajón bajo",
  chair: "Silla estable",
  "jump rope": "Cuerda de saltar",
  dumbbell: "Mancuernas",
  barbell: "Barra",
  "e-z curl bar": "Barra Z",
  kettlebells: "Pesa rusa",
  bands: "Bandas elásticas",
  cable: "Polea",
  machine: "Máquina",
  "medicine ball": "Balón medicinal",
  "exercise ball": "Pelota de ejercicio",
  "foam roll": "Rodillo de espuma",
  other: "Otros implementos",
};

export const EQUIPMENT_HINT = {
  other: "banca, cajón, barra de dominadas y similares",
  cable: "máquina con cable y polea",
};

export const CATEGORIES = {
  strength: "Fuerza",
  stretching: "Estiramiento",
  plyometrics: "Saltos",
  cardio: "Cardio",
  speed: "Velocidad y técnica de carrera",
  agility: "Agilidad y coordinación",
  balance: "Equilibrio",
  mobility: "Movilidad",
  warmup: "Calentamiento",
  recovery: "Vuelta a la calma",
  powerlifting: "Powerlifting",
  "olympic weightlifting": "Halterofilia",
  strongman: "Strongman",
};

export const LEVELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
};
export const LEVEL_ORDER = ["beginner", "intermediate", "expert"];

export const FORCES = {
  push: "Empujar",
  pull: "Tirar",
  static: "Mantener la posición",
};
export const MECHANICS = {
  compound: "Compuesto, mueve varias articulaciones",
  isolation: "Aislado, se enfoca en un músculo",
};

export const SOURCES = {
  fedb: "Free Exercise DB",
  wger: "wger",
  edb: "ExerciseDB",
};

export function label(dict, key, fallback = "Sin dato") {
  if (key == null || key === "") return fallback;
  return dict[key] ?? key;
}

export function muscleList(keys = []) {
  return keys.map((k) => label(MUSCLES, k)).join(", ");
}

// Búsqueda en español: frases y palabras que se traducen a los términos en inglés del catálogo.
export const PHRASES = {
  "press de banca": ["bench press"],
  "press banca": ["bench press"],
  "peso muerto": ["deadlift"],
  "press militar": ["military press", "shoulder press", "overhead press"],
  "press de hombro": ["shoulder press", "overhead press"],
  "puente de gluteo": ["glute bridge", "bridge", "hip thrust"],
  "hip thrust": ["hip thrust", "glute bridge"],
  "saltar la cuerda": ["rope jump", "jump rope", "rope jumping"],
  "salto de cuerda": ["rope jump", "jump rope", "rope jumping"],
  "jalon al pecho": ["pulldown"],
  "buenos dias": ["good morning"],
  "rueda abdominal": ["ab roller", "ab wheel", "rollout"],
  "paseo del granjero": ["farmer"],
  "pesa rusa": ["kettlebell"],
  "barra z": ["ez bar", "e z bar", "ez curl"],
  "zona lumbar": ["lower back", "hyperextension"],
};

export const SYNONYMS = {
  caminata: ["walk", "caminar", "walking"],
  caminadora: ["treadmill", "cinta"],
  cinta: ["treadmill", "caminadora"],
  sprint: ["sprints", "velocidad", "carrera rapida"],
  aceleracion: ["aceleraciones", "acceleration", "progresivos"],
  velocidad: ["speed", "sprint", "aceleracion"],
  agilidad: ["agility", "lateral", "coordinacion"],
  equilibrio: ["balance", "estabilidad"],
  movilidad: ["mobility", "rotacion"],
  sentadilla: ["squat"],
  zancada: ["lunge"],
  estocada: ["lunge"],
  desplante: ["lunge"],
  dominada: ["pull up", "pullup", "chin up", "chinup"],
  flexion: ["push up", "pushup"],
  lagartija: ["push up", "pushup"],
  plancha: ["plank"],
  abdominal: ["crunch", "sit up", "situp"],
  remo: ["row"],
  fondo: ["dip"],
  elevacion: ["raise"],
  jalon: ["pulldown", "pull down"],
  prensa: ["press"],
  extension: ["extension"],
  encogimiento: ["shrug"],
  apertura: ["fly", "flye"],
  cargada: ["clean"],
  arranque: ["snatch"],
  envion: ["jerk"],
  salto: ["jump", "hop", "bound"],
  estiramiento: ["stretch"],
  estirar: ["stretch"],
  mancuerna: ["dumbbell"],
  barra: ["barbell", "bar"],
  polea: ["cable"],
  banda: ["band"],
  elastico: ["band"],
  liga: ["band"],
  inclinado: ["incline"],
  inclinada: ["incline"],
  declinado: ["decline"],
  declinada: ["decline"],
  hombro: ["shoulder"],
  pecho: ["chest"],
  espalda: ["back"],
  pierna: ["leg"],
  gluteo: ["glute"],
  antebrazo: ["forearm", "wrist"],
  muneca: ["wrist"],
  cadera: ["hip"],
  rodilla: ["knee"],
  correr: ["run", "sprint"],
  trotar: ["jog", "run"],
  caminar: ["walk"],
  bicicleta: ["bike", "bicycle", "cycling"],
  cuerda: ["rope"],
  pantorrilla: ["calf"],
  gemelo: ["calf"],
  cuello: ["neck"],
  lumbar: ["lower back", "hyperextension"],
  giro: ["twist", "rotation"],
  rotacion: ["rotation", "twist"],
  cajon: ["box"],
  banco: ["bench"],
  banca: ["bench"],
  maquina: ["machine"],
  pelota: ["ball"],
  balon: ["ball"],
  rodillo: ["roller", "foam"],
  martillo: ["hammer"],
  frances: ["skull", "lying triceps"],
  sumo: ["sumo"],
  bulgara: ["split squat"],
  trineo: ["sled"],
  escalador: ["mountain climber"],
  tijera: ["scissor"],
};
