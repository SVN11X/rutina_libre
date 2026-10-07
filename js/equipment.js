// Required implements are sets: ALL implements in one option must be available.
// `equipment` remains the legacy primary field; null never means body weight.
export const cleanEquipment = (values) => [...new Set((values || []).filter(Boolean))];
export function equipmentOptions(ex) {
  if (ex.equipmentKnown === false) return [];
  const primary = ex.requiredEquipment || (ex.equipment ? [ex.equipment] : []);
  const options = [primary, ...(ex.equipmentAlternatives || [])]
    .map(cleanEquipment).filter((x) => x.length && !x.includes('unknown') && !x.includes('other'));
  return options;
}
export function canUseEquipment(ex, available = []) {
  const set = new Set(['body only', ...available]);
  return equipmentOptions(ex).some((option) => option.every((key) => set.has(key)));
}
export function equipmentText(ex, labels = {}) {
  const options = equipmentOptions(ex);
  return options.length ? options.map((option) => option.filter((k) => k !== 'body only' || option.length === 1)
    .map((k) => labels[k] || k).join(' + ')).join(' o ') : 'Equipo no confirmado';
}
export function migrateEquipment(ex) {
  ex.originalEquipment ??= ex.equipment ?? null;
  if (!ex.requiredEquipment) ex.requiredEquipment = ex.equipment ? [ex.equipment] : [];
  const required = new Set(ex.requiredEquipment);
  const name = String(ex.name || '').toLowerCase();
  const steps = (ex.steps || []).join(' ').toLowerCase().split(/variations?:/)[0].replace(/(?:you can also|alternatively)[^.]*\./g,'');
  const evidence = ex.equipmentEvidence || [];
  const require = (key, why) => { required.add(key); evidence.push(why); };
  // These checks use explicit requirements in the original instructions.
  if (/\bbench\b/.test(steps) || /bench press|bench dip|incline dumbbell press/.test(name)) require('bench', 'Banca descrita en las instrucciones originales');
  if (/pull.?up bar|chin.?up bar/.test(steps) || /^(?:pull.?ups?|chin.?up|hanging)/.test(name)) require('pullup bar', 'Barra fija descrita en la fuente original');
  if (/leg press|leg curl|leg extension|smith machine|multipress/.test(name)) require(/smith|multipress/.test(name) ? 'smith machine' : 'machine', 'Máquina indicada en el nombre original');
  if (/single leg press/.test(name)) { required.clear(); require('machine','La fuente describe una prensa de piernas'); }
  if (ex.id === 'Inverted_Row') {
    required.clear(); require('fixed bar','Barra horizontal fijada a un rack a la altura de la cintura'); require('rack','Soporte del rack indicado en el paso 1');
    ex.equipmentAlternatives = [['smith machine']];
  }
  if (/\b(?:grasp|grab|hold|holding|with|using)\b[^.]{0,45}\bdumbbells?\b/.test(steps)) require('dumbbell','Mancuernas indicadas en los pasos originales');
  if (/\b(?:grasp|grab|hold|holding|with|using)\b[^.]{0,45}\bbarbell\b/.test(steps)) require('barbell','Barra con peso indicada en los pasos originales');
  if (/cable|pulley/.test(name) || /\b(?:attach|attachment|grasp|grab|hold)\b[^.]{0,65}\b(?:pulley|cable)\b/.test(steps)) require('cable','Polea indicada en las instrucciones');
  if (/parallel bars/.test(steps)) require('parallel bars','Barras paralelas indicadas en la fuente');
  if (/\b(?:squat|power) rack\b|\b(?:bar|barbell)\b[^.]{0,55}\brack\b/.test(steps)) require('rack','Rack indicado en el montaje de la fuente original');
  if (/\b(?:elevated|raised) platform\b|\bbox\b/.test(steps) || /step.?ups?/.test(name)) require('step','Escalón o plataforma estable indicada en el montaje');
  if (/\bchair\b/.test(steps)) require('chair','Silla indicada en la fuente original');
  if (/\b(?:against|on|facing) (?:a |the )?wall\b/.test(steps)) require('wall','Pared indicada como apoyo en los pasos originales');
  if (/\b(?:stability|exercise|swiss) ball\b/.test(steps)) require('exercise ball','Pelota de ejercicio indicada en los pasos originales');
  if(/smith|multipress/.test(name)){
    required.delete('machine');required.delete('barbell');required.delete('rack');
    require('smith machine','La barra y sus soportes forman parte de la máquina Smith, no implementos separados');
  }
  if(/pull ups? on machine/.test(name))required.delete('pullup bar');
  if(/leg (?:curl|extension|press)/.test(name) && required.has('machine'))required.delete('bench');
  if (required.size > 1) required.delete('body only');
  // `other` is retained, but insufficient to plan an exercise automatically.
  ex.requiredEquipment = cleanEquipment([...required]);
  ex.equipmentKnown = ex.requiredEquipment.length > 0 && !ex.requiredEquipment.some(k => ['unknown','other'].includes(k));
  if (ex.equipment === 'body only' && required.size && !required.has('body only')) ex.equipment = [...required][0];
  ex.equipmentEvidence = cleanEquipment(evidence);
  return ex;
}
