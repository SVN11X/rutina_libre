// Reproducible inventory. Missing values stay missing; this script does not invent content.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {equipmentOptions} from '../js/equipment.js';
import {playableVideos} from '../js/media.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const data=JSON.parse(await readFile(root+'data/exercises.json','utf8')),items=data.exercises;
const issues=ex=>[
  !ex.nameEs&&'nombre_sin_espanol',
  !ex.stepsEs?.length&&'pasos_sin_espanol',
  !ex.stepsEs?.length&&!ex.steps?.length&&'sin_instrucciones',
  !ex.level&&'nivel_desconocido',
  !ex.primary?.length&&'musculo_principal_desconocido',
  !equipmentOptions(ex).length&&'equipo_sin_confirmar',
  !ex.images?.length&&!ex.gif&&!ex.videos?.length&&'sin_recurso_visual',
  !playableVideos(ex).length&&!ex.gif&&'sin_video_o_gif_compatible',
  ex.demonstrations?.some(d=>d.status!=='playback-verified')&&'reproduccion_externa_pendiente',
  ex.videoInfo?.some(v=>v.variantRestricted)&&'video_original_de_otra_variante'
].filter(Boolean);
const pending=items.map(ex=>({id:ex.id,name:ex.name,nameEs:ex.nameEs||null,issues:issues(ex),sourceLinks:ex.sourceLinks||[]})).filter(r=>r.issues.length);
const normalize=s=>String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const groups=new Map();for(const ex of items){const name=normalize(ex.nameEs||ex.name);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(ex.id);}
const duplicates=[...groups].filter(([,ids])=>ids.length>1).map(([normalizedName,ids])=>({normalizedName,ids,note:'Posibles equivalencias, no duplicados confirmados. No se eliminan IDs ni se unen variantes automáticamente.'}));
const media=[...JSON.parse(await readFile(root+'data/media.json','utf8')),...JSON.parse(await readFile(root+'data/extra-media.json','utf8'))];
const report={version:'3.0.0',generated:new Date().toISOString(),coverage:data.coverage,
  physicalMP4Files:media.length,assignedMP4Files:new Set(items.flatMap(ex=>playableVideos(ex).filter(u=>u.startsWith('assets/media/')))).size,
  localVideoExercises:items.filter(ex=>playableVideos(ex).some(u=>u.startsWith('assets/media/'))).length,
  spanishNames:items.filter(ex=>ex.nameEs).length,
  pendingCounts:Object.fromEntries([...new Set(pending.flatMap(r=>r.issues))].sort().map(key=>[key,pending.filter(r=>r.issues.includes(key)).length])),
  limits:'Inventario de campos y revisión de variantes; no valida clínicamente instrucciones, músculos, niveles ni traducciones del catálogo completo.',possibleDuplicates:duplicates,pending};
await mkdir(root+'docs',{recursive:true});
await writeFile(root+'docs/catalog-audit.json',JSON.stringify(report,null,2)+'\n');
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
await writeFile(root+'docs/catalog-pending.csv','\uFEFFid,nombre_original,nombre_es,pendientes,fuentes\n'+pending.map(r=>[r.id,r.name,r.nameEs,r.issues.join(' | '),r.sourceLinks.map(s=>s.url).join(' | ')].map(csv).join(',')).join('\n')+'\n');
console.log(JSON.stringify({coverage:report.coverage,physicalMP4Files:report.physicalMP4Files,assignedMP4Files:report.assignedMP4Files,pendingCounts:report.pendingCounts,possibleDuplicateGroups:duplicates.length},null,2));
