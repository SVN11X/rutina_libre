// Duration includes work, between-set rests, preparation and transitions.
export function itemDuration(item) {
  const timing=item.timing;
  if(!timing || item.timingEdited)return null;
  const series=Number(item.series)||1;
  const work=Array.isArray(timing.workSeconds)?timing.workSeconds:[timing.workSeconds,timing.workSeconds];
  const rest=Array.isArray(timing.restSeconds)?timing.restSeconds:[timing.restSeconds||0,timing.restSeconds||0];
  if(!work?.every(Number.isFinite) || !rest?.every(Number.isFinite))return null;
  return work.map((value,i)=>value*series+Math.max(0,series-1)*rest[i]);
}
export function dayDuration(day) {
  const entries=[...(day.items||[]),...(day.cooldownItems||[])];
  const durations=entries.map(itemDuration);
  if(durations.some(t=>!t))return {known:false,label:'Duración pendiente de estimar: hay dosis editadas o sin tiempo confirmado'};
  const preparation=day.preparationSeconds||0;
  const transitions=Math.max(0,entries.length-1)*(day.transitionSeconds??30);
  const seconds=[0,1].map(i=>durations.reduce((s,t)=>s+t[i],preparation+transitions));
  const mins=seconds.map(n=>Math.ceil(n/60));
  return {known:true,seconds,workAndRestSeconds:seconds.map(n=>n-preparation-transitions),transitionsSeconds:transitions,preparationSeconds:preparation,label:`${mins[0]===mins[1]?mins[0]:mins.join('–')} min efectivos estimados (incluye descansos y transiciones)`};
}
