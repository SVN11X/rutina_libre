// Todo se guarda en el navegador del usuario. No hay cuentas ni servidor.
const K = {
  fav: 'rl:guardados',
  routine: 'rl:rutina',
  goal: 'rl:objetivo',
  level: 'rl:nivel',
  tr: 'rl:traducciones',
  wizard: 'rl:preferencias',
};

function read(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
}

function write(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (what) => listeners.forEach((fn) => fn(what));

export const saved = {
  all: () => read(K.fav, []),
  has: (id) => read(K.fav, []).includes(id),
  set(id,value) {
    const list=read(K.fav,[]).filter(x=>x!==id);
    if(value)list.unshift(id);
    if(!write(K.fav,list))return false;
    emit('saved');
    return true;
  },
  toggle(id) {
    const list = read(K.fav, []);
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(id);
    if(!write(K.fav, list))throw new Error('No se pudo guardar en este navegador. Puede estar lleno o bloquear el almacenamiento.');
    emit('saved');
    return i < 0;
  },
};

export const routineStore = {
  get: () => read(K.routine, null),
  set(r) {
    write(K.routine, r);
    emit('routine');
  },
  clear() {
    try { localStorage.removeItem(K.routine); } catch { /* sin acceso */ }
    emit('routine');
  },
};

export const prefs = {
  goal: () => read(K.goal, 'musculo'),
  setGoal: (g) => write(K.goal, g),
  level: () => read(K.level, 'beginner'),
  setLevel: (l) => write(K.level, l),
  wizard: () => read(K.wizard, null),
  setWizard: (w) => write(K.wizard, w),
};

export const translations = {
  get: (id) => read(K.tr, {})[id] ?? null,
  set(id, steps) {
    const all = read(K.tr, {});
    all[id] = steps;
    const keys = Object.keys(all);
    if (keys.length > 200) delete all[keys[0]];
    write(K.tr, all);
  },
};
