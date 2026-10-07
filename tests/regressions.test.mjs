import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from 'node:fs';
import {prepare,search,facetCounts,EMPTY_FILTERS}from '../js/data.js';
import {canUseEquipment,migrateEquipment}from '../js/equipment.js';
import {normalizeWger,repairVideoInfo}from '../scripts/build-data.mjs';
import {playableVideos,hasDecodedFrames}from '../js/media.js';
import {rankDescription,classifySketch}from '../js/intelligence.js';
import {queryEvidence,matchesEvidence}from '../js/query.js';
import {generateRoutine,makeItem,alternatives,poolFilter,summary}from '../js/generator.js';
import {prescribe,repsText}from '../js/reps.js';
import {itemDuration,dayDuration}from '../js/duration.js';
import {parseRange,rangeResponse}from '../js/range.js';
import {mkdtemp,cp,mkdir,readFile,rm}from 'node:fs/promises';
import {tmpdir}from 'node:os';
import {join}from 'node:path';
import {execFileSync}from 'node:child_process';
const payload=JSON.parse(readFileSync(new URL('../data/exercises.json',import.meta.url)));
const items=payload.exercises.map(prepare),byId=new Map(items.map(x=>[x.id,x]));
const filters=extra=>({...EMPTY_FILTERS,...extra});
const preferences=extra=>({goal:'musculo',level:'beginner',days:3,minutes:30,equipment:['dumbbell'],focus:[],...extra});

test('URL del video y URL de licencia son campos diferentes, también en el respaldo v2',()=>{
  const records=[{id:7,translations:[{language:2,name:'Demo',description:'<p>Steps</p>',license:4}],images:[],videos:[{video:'https://wger.de/a.MOV',codec:'hevc',license:4,license_author:'Autor'}],muscles:[],equipment:[],category:{name:'Back'}}];
  const [ex]=normalizeWger(records);assert.equal(ex.videoInfo[0].url,ex.videos[0]);assert.match(ex.videoInfo[0].licenseUrl,/creativecommons/);
  const old={videos:['https://wger.de/old.MOV'],videoInfo:[{url:'https://creativecommons.org/licenses/by/4.0/',codec:'hevc'}]};
  repairVideoInfo(old);assert.equal(old.videoInfo[0].mediaUrl,old.videos[0]);assert.match(old.videoInfo[0].licenseUrl,/creativecommons/);
  for(const snapshot of [JSON.parse(readFileSync(new URL('../data/source-wger.json',import.meta.url))),payload.exercises])for(const x of snapshot)for(const v of x.videoInfo||[]){assert.equal(v.mediaUrl,v.url);assert.ok((x.videos||[]).includes(v.url),x.id);assert.ok(!/creativecommons/.test(v.url));}
});
test('un archivo HEVC conocido nunca se ofrece como alternativa compatible',()=>{
  const ex=byId.get('Pullups');assert.ok(playableVideos(ex).length);assert.ok(playableVideos(ex).every(v=>!ex.videoInfo.some(i=>i.url===v&&i.codec==='hevc')));
  assert.equal(hasDecodedFrames({width:0,height:0,frames:300}),false);
  assert.equal(hasDecodedFrames({width:720,height:406,frames:0}),false);
  assert.equal(hasDecodedFrames({width:720,height:406,frames:2}),true);
});
test('78 originales convertidos: se conservan origen y asignación de variantes revisadas',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../data/media.json',import.meta.url)));
  assert.equal(new Set(manifest.map(m=>m.wgerId)).size,46);
  assert.equal(manifest.length,78);
  const review=JSON.parse(readFileSync(new URL('../data/media-review.json',import.meta.url)));
  for(const m of manifest){const override=review.overrides.find(r=>r.video===m.video);if(override)assert.equal(items.some(x=>x.videos.includes(m.video)),Boolean(override.exerciseId));else assert.ok(items.some(x=>x.videos.includes(m.original)&&x.videos.includes(m.video)),m.original);assert.ok(m.attribution.author);assert.ok(m.attribution.url);}
  assert.ok(byId.get('Smith_Machine_Bench_Press').videos.includes('assets/media/wger-73.mp4'));assert.ok(!playableVideos(byId.get('Barbell_Bench_Press_-_Medium_Grip')).includes('assets/media/wger-73.mp4'));
  assert.ok(byId.get('Triceps_Pushdown').videos.includes('assets/media/wger-659.mp4'));
});
test('equipo desconocido permanece desconocido; no equivale a peso corporal',()=>{
  const ex=migrateEquipment({name:'Unspecified',equipment:null,steps:[]});assert.equal(ex.equipmentKnown,false);assert.equal(canUseEquipment(ex,[]),false);
  assert.equal(poolFilter(preferences())({...ex,level:'beginner'}),false);
  const leg=byId.get('wger-2677');assert.equal(canUseEquipment(leg,[]),false);assert.equal(canUseEquipment(leg,['machine']),true);
  assert.equal(canUseEquipment(byId.get('Chin-Up'),[]),false);assert.equal(canUseEquipment(byId.get('Chin-Up'),['pullup bar']),true);
});
test('mancuernas solas no habilitan banca, remo invertido ni plataforma',()=>{
  for(const id of ['Dumbbell_Bench_Press','Incline_Dumbbell_Press','Inverted_Row','Dumbbell_Step_Ups'])assert.equal(canUseEquipment(byId.get(id),['dumbbell']),false,id);
  assert.equal(canUseEquipment(byId.get('Dumbbell_Bench_Press'),['dumbbell','bench']),true);
  assert.equal(canUseEquipment(byId.get('Inverted_Row'),['fixed bar']),false);
  assert.equal(canUseEquipment(byId.get('Inverted_Row'),['fixed bar','rack']),true);
  assert.equal(canUseEquipment(byId.get('Inverted_Row'),['smith machine']),true);
  const results=search(items,filters({equipo:['dumbbell']}));assert.ok(results.length);assert.ok(results.every(ex=>canUseEquipment(ex,['dumbbell'])));
});
test('generador y reemplazos exigen todo el equipo y nivel conocido en 90 planes',()=>{
  for(const goal of ['musculo','fuerza','resistencia','grasa','movilidad'])for(const level of ['beginner','intermediate','expert'])for(let seed=0;seed<6;seed++){
    const p=preferences({goal,level}),r=generateRoutine(items,p,seed);
    for(const day of r.days){assert.equal(dayDuration(day).known,true);assert.ok(dayDuration(day).seconds[1]<=p.minutes*60);
      for(const it of [...day.items,...(day.cooldownItems||[])]){const ex=byId.get(it.exId);assert.ok(ex.level);assert.ok(canUseEquipment(ex,p.equipment),ex.id);}
    }
    for(const ex of alternatives(items,byId.get('Pushups'),r,0)){assert.ok(ex.level);assert.ok(canUseEquipment(ex,p.equipment));}
  }
});
test('consultas cortas interpretan sinónimos y restricciones',()=>{
  assert.equal(search(items,filters({q:'sentadilla sin equipo'}))[0].id,'Bodyweight_Squat');
  assert.ok(search(items,filters({q:'sentadilla sin equipo'})).every(ex=>canUseEquipment(ex,[])));
  assert.ok(search(items,filters({q:'press solo mancuernas'})).every(ex=>canUseEquipment(ex,['dumbbell'])));
  const evidence=queryEvidence('remo sin polea ni mancuernas');assert.ok(evidence.excluded.has('cable'));assert.ok(evidence.excluded.has('dumbbell'));
  assert.equal(matchesEvidence(byId.get('Seated_Cable_Rows'),evidence),false);
});
test('equipo, postura y tirón hacia abdomen vencen a familias incompatibles',()=>{
  const q='Estoy sentado y tiro de un mango hacia el abdomen usando una polea',results=rankDescription(items,q,6);
  assert.equal(results[0].ex.id,'Seated_Cable_Rows');assert.ok(results.every(r=>r.ex.requiredEquipment.includes('cable')));
  assert.ok(results.every(r=>!/fly|curl|ergometro|rowing stationary|dumbbell/i.test(r.ex.name)));
  assert.deepEqual(rankDescription(items,'xilofono pizza universo'),[]);
});
test('resultados, facetas y orden usan el mismo conjunto de búsqueda',()=>{
  const f=filters({q:'Estoy sentado y tiro de un mango hacia el abdomen usando una polea'}),result=search(items,f),counts=facetCounts(items,f);
  assert.ok(result.length);assert.equal(Object.values(counts.tipo).reduce((a,b)=>a+b,0),result.length);
  assert.equal(Object.values(counts.nivel).reduce((a,b)=>a+b,0),result.length);
  assert.deepEqual(new Set(search(items,{...f,orden:'az'}).map(x=>x.id)),new Set(result.map(x=>x.id)));
  const cable=search(items,{...f,equipo:['cable']});assert.equal(counts.equipo.cable,cable.length);
});
test('escaladores y Superman usan unidades y lateralidad coherentes',()=>{
  assert.equal(byId.get('Mountain_Climbers').category,'cardio');assert.equal(byId.get('Superman').category,'strength');
  const mountain=prescribe(byId.get('Mountain_Climbers'),'musculo','beginner'),superman=prescribe(byId.get('Superman'),'movilidad','beginner');
  assert.match(mountain.unit,/segundos/);assert.doesNotMatch(mountain.unit,/saltos/);
  assert.match(superman.unit,/repeticiones/);assert.doesNotMatch(superman.unit,/por lado/);
});
test('60 minutos es un máximo y se informa el tiempo efectivo, sin rellenar esfuerzo',()=>{
  const r=generateRoutine(items,preferences({goal:'cardio',equipment:[],minutes:60}),21);
  assert.match(summary(r.prefs),/máximo 60/);
  for(const day of r.days){const time=dayDuration(day);assert.ok(time.known);assert.ok(time.seconds[1]<60*60);assert.ok(time.transitionsSeconds>0);assert.match(time.label,/efectivos estimados/);}
  const prescribed=makeItem(byId.get('rl-trote'),r.prefs);assert.equal(prescribed.reps,repsText(prescribe(byId.get('rl-trote'),'cardio','beginner')));assert.match(prescribed.reps,/5 a 10/);assert.deepEqual(itemDuration(prescribed),[300,600]);
});
test('duración suma trabajo, descansos entre series y transiciones; edición libre se declara pendiente',()=>{
  const it={series:3,timing:{workSeconds:[20,30],restSeconds:[60,90]}};assert.deepEqual(itemDuration(it),[180,270]);
  assert.deepEqual(dayDuration({items:[it,it],transitionSeconds:30}).seconds,[390,570]);
  assert.equal(dayDuration({items:[{...it,timingEdited:true}]}).known,false);
});
test('movilidad incluye movimientos dinámicos y estiramientos; principiantes no reciben sprint máximo',()=>{
  const r=generateRoutine(items,preferences({goal:'movilidad',equipment:[]}),5),categories=new Set(r.days.flatMap(d=>d.items.map(it=>byId.get(it.exId).category)));
  assert.ok(categories.has('mobility'));assert.ok(categories.has('stretching'));
  const speed=generateRoutine(items,preferences({goal:'velocidad',equipment:[],minutes:60}),3);
  assert.ok(speed.days.flatMap(d=>d.items).every(it=>!['rl-sprint','rl-aceleraciones'].includes(it.exId)));
});
test('rangos multimedia respetan límites, sufijos y errores 416',async()=>{
  assert.deepEqual(parseRange('bytes=1-3',10),{start:1,end:3});assert.deepEqual(parseRange('bytes=-2',10),{start:8,end:9});assert.equal(parseRange('bytes=15-',10),null);assert.equal(parseRange('bytes=0-1,3-4',10),null);
  const response=await rangeResponse(new Response('abcdefghij',{headers:{'Content-Type':'video/mp4'}}),'bytes=1-3');assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 1-3/10');assert.equal(await response.text(),'bcd');
});
test('bocetos de trazos mínimos o líneas sin estructura permiten no encontrar coincidencia',()=>{
  assert.deepEqual(classifySketch([[[1,1],[2,2]],[[3,3],[4,4]],[[5,5],[6,6]]]),[]);
  assert.deepEqual(classifySketch([[[10,20],[100,20]],[[10,50],[100,50]],[[10,80],[100,80]]]),[]);
});
test('reconstruir el respaldo dos veces conserva IDs, medios y créditos sin acumular metadatos',async()=>{
  const workspace=await mkdtemp(join(tmpdir(),'rutina-rebuild-'));
  try{
    for(const dir of ['scripts','js','data'])await mkdir(join(workspace,dir));
    const root=new URL('../',import.meta.url);
    await cp(new URL('package.json',root),join(workspace,'package.json'));
    await cp(new URL('scripts/build-data.mjs',root),join(workspace,'scripts/build-data.mjs'));
    await cp(new URL('js/equipment.js',root),join(workspace,'js/equipment.js'));
    await cp(new URL('data/',root),join(workspace,'data'),{recursive:true});
    const build=()=>execFileSync(process.execPath,['scripts/build-data.mjs'],{cwd:workspace,env:{...process.env,OFFLINE:'1'},stdio:'pipe'});
    const snapshot=async()=>{const d=JSON.parse(await readFile(join(workspace,'data/exercises.json'),'utf8'));delete d.generated;return d;};
    build();const first=await snapshot();build();const second=await snapshot();
    assert.deepEqual(second,first);assert.deepEqual(new Set(second.exercises.map(x=>x.id)),new Set(payload.exercises.map(x=>x.id)));
    for(const ex of second.exercises)assert.equal(ex.videoInfo.length,new Set(ex.videoInfo.map(v=>JSON.stringify(v))).size,ex.id);
  }finally{await rm(workspace,{recursive:true,force:true});}
});
