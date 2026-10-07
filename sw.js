// SHARED RANGE START
function parseRange(header,length) {
  const m=/^bytes=(\d*)-(\d*)$/.exec(header || '');
  if(!m || (!m[1]&&!m[2]) || length<=0)return null;
  const start=m[1]?Number(m[1]):Math.max(0,length-Number(m[2]));
  const end=m[1]?(m[2]?Math.min(Number(m[2]),length-1):length-1):length-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=length||end<start)return null;
  return {start,end};
}
async function rangeResponse(response,header) {
  if(!header)return response;
  const bytes=await response.arrayBuffer(),part=parseRange(header,bytes.byteLength);
  if(!part)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`,'Accept-Ranges':'bytes'}});
  return new Response(bytes.slice(part.start,part.end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'video/mp4','Content-Range':`bytes ${part.start}-${part.end}/${bytes.byteLength}`,'Content-Length':String(part.end-part.start+1),'Accept-Ranges':'bytes'}});
}

// SHARED RANGE END
// A versioned, atomic shell prevents mixing old code with new data.
const VERSION = 'v3.0.0-70e67f05af6e';
const PREFIX='rutina-libre-',SHELL=`${PREFIX}shell-${VERSION}`,MEDIA=`${PREFIX}media-${VERSION}`;
const MEDIA_MAX=180,MEDIA_BYTES=160*1024*1024;
const FILES=['./','index.html','css/styles.css','css/enhancements.css','js/app.js','js/catalog.js','js/data.js','js/detail.js','js/detector.js','js/intelligence.js','js/motions.js','js/equipment.js','js/query.js','js/media.js','js/duration.js','js/range.js','js/generator.js','js/i18n.js','js/pdf.js','js/reps.js','js/routine.js','js/store.js','js/translate.js','js/ui.js','data/exercises.json','manifest.webmanifest','assets/icon.svg','assets/vendor/jspdf.umd.min.js',...['squat','pushup','plank','lunge','curl','press','pullup','bridge','deadlift','row','walk','run','balance','treadmill','cycle','mobility','mountain','jump'].map(f=>`assets/illustrations/${f}.svg`)];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(SHELL);
  await cache.addAll(FILES.map(url=>new Request(new URL(url,self.location),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&![SHELL,MEDIA].includes(key))await caches.delete(key);
  await self.clients.claim();
  for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'RELEASE_READY',version:VERSION});
})()));
async function trim(cache){
  const keys=await cache.keys();let bytes=0;
  for(let i=keys.length-1;i>=0;i--){const response=await cache.match(keys[i]);bytes+=Number(response?.headers.get('Content-Length'))||0;if(keys.length-i>MEDIA_MAX||bytes>MEDIA_BYTES)await cache.delete(keys[i]);}
}
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return; // External availability is never guaranteed offline.
  if(/\/assets\/media\//.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(MEDIA),hit=await cache.match(url.href);
      if(hit)return rangeResponse(hit,req.headers.get('range'));
      try{
        const response=await fetch(req,{signal:AbortSignal.timeout(45000)});
        if(response.status===200){
          const save=cache.put(url.href,response.clone()).then(()=>trim(cache));
          if(req.headers.get('X-Rutina-Cache')==='full')await save.catch(()=>{});
          else event.waitUntil(save.catch(()=>{}));
        }
        return response;
      }catch{return new Response('Este medio no está guardado para usarlo sin conexión',{status:503});}
    })());return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(SHELL),hit=await cache.match(req);
    if(hit)return hit;
    if(req.mode==='navigate'){const index=await cache.match(new URL('index.html',self.location).href);if(index)return index;}
    try{return await fetch(req,{signal:AbortSignal.timeout(12000)});}catch{return new Response('Archivo no disponible sin conexión',{status:503});}
  })());
});
