import { canUseEquipment, equipmentOptions } from './equipment.js';
export const normalizeQuery = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const equipmentTerms = [
  ['treadmill','caminadora|cinta de correr|treadmill'],
  ['rowing machine','ergometro|maquina de remo|rowing machine'],
  ['stationary bike','bicicleta estatica|stationary bike'],
  ['cable','polea|cable'], ['dumbbell','mancuernas?|dumbbells?'],
  ['pullup bar','barra fija|barra de dominadas|pull up bar'],
  ['barbell','barra con peso|barbell'], ['bench','banca|banco|bench'],
  ['bands','bandas? elasticas?|resistance bands?'], ['machine','maquina|machine'],
];
export function queryEvidence(query) {
  let q = normalizeQuery(query), text = q;
  const excluded = new Set(), mentioned = new Set();
  text=text.replace(/\b(?:sin|no uso|no utilizo|no tengo|no)\s+(.+?)(?=\b(?:pero|con|uso|usando|utilizo|tengo)\b|$)/g,(span,list)=>{
    let found=false;
    for(const [key,pattern]of equipmentTerms)if(new RegExp(`\\b(?:${pattern})\\b`).test(list)){excluded.add(key);found=true;}
    return found?' ':span;
  });
  const noEquipment = /\b(?:sin equipo|sin implementos|sin pesas|peso corporal|bodyweight|body weight)\b/.test(q);
  for (const [key, pattern] of equipmentTerms) {
    const neg = new RegExp(`\\b(?:sin|no uso|no utilizo|no tengo|excepto) (?:una? |la |el |las |los )?(?:${pattern})\\b`,'g');
    if (neg.test(q)) { excluded.add(key); text = text.replace(neg,' '); }
    const positive = new RegExp(`\\b(?:${pattern})\\b`);
    if (positive.test(text) && !excluded.has(key)) mentioned.add(key);
  }
  if (mentioned.has('rowing machine') || mentioned.has('cable') || mentioned.has('treadmill') || mentioned.has('stationary bike')) mentioned.delete('machine');
  text = text.replace(/\b(?:sin equipo|sin implementos|sin pesas|peso corporal|bodyweight|body weight)\b/g,' ');
  const movement=/\b(?:tiro|tirar|jalo|jalar|pull)\b/.test(text) && /(?:hacia|hasta|toward).*(?:abdomen|ombligo|vientre|belly|midsection)/.test(text)?'horizontal-pull':null;
  return { noEquipment, mentioned, excluded, movement, only:/\b(?:solo|solamente|unicamente)\b/.test(q), posture:/\b(?:sentad[oa]|seated|sitting)\b/.test(text)?'seated':null, text:text.trim(), descriptive:/\b(estoy|hago|tiro|levanto|doblo|subo|bajo|usando|apoyad[oa])\b/.test(text) };
}
export function movementEvidence(ex) {
  const name=normalizeQuery([ex.name,ex.nameEs].join(' '));
  if(ex.movementPattern)return ex.movementPattern;
  if(/row|remo/.test(name))return 'horizontal-pull';
  if(/fly|apertura|curl|press|pushdown|extension|raise|elevacion|pull.?up|dominada|pulldown/.test(name))return 'other';
  return null;
}
export function matchesEvidence(ex, evidence) {
  const options = equipmentOptions(ex);
  if (evidence.noEquipment && !canUseEquipment(ex,[])) return false;
  if (evidence.excluded.size && (!options.length || !options.some(o=>o.every(k=>!evidence.excluded.has(k))))) return false;
  if (evidence.mentioned.size && !options.some(o=>[...evidence.mentioned].every(k=>o.includes(k)))) return false;
  if (evidence.only && evidence.mentioned.size && !canUseEquipment(ex,[...evidence.mentioned])) return false;
  if (evidence.posture === 'seated' && /standing|bent over|inclinado de pie|de pie/.test(normalizeQuery([ex.name,ex.nameEs].join(' ')))) return false;
  if (evidence.movement && movementEvidence(ex) && movementEvidence(ex)!==evidence.movement) return false;
  return true;
}
