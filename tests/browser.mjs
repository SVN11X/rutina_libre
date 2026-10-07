// Real browser regressions. Requires Playwright only for development/CI.
// Starts a static server under /rutina_libre/ to exercise GitHub Pages paths.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir}from 'node:fs/promises';
import {spawn}from 'node:child_process';
import {createRequire}from 'node:module';
import {fileURLToPath}from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const axe=require(process.env.AXE_MODULE||'axe-core');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:4187/rutina_libre/';
await mkdir(root+'docs/qa',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:'4187',BASE_PATH:'/rutina_libre/'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('QA server exited '+code)));});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:process.env.CHROMIUM_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu']:[]});
const report={checked:new Date().toISOString(),browser:browser.version(),platform:process.platform,media:[],checks:[],errors:[],limits:['External provider playback is not certified by these local tests','No Safari, Firefox, physical iOS/Android or screen reader validation']};
const check=async(name,fn)=>{try{const evidence=await fn();report.checks.push({name,passed:true,evidence});console.log('PASS',name);}catch(e){report.checks.push({name,passed:false,error:String(e.stack||e)});console.error('FAIL',name,e.message);}};
const makeContext=async(options={})=>{const ctx=await browser.newContext({viewport:{width:1280,height:800},...options});await ctx.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('blob:')?route.continue():route.abort());return ctx;};
const context=await makeContext({serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',error=>report.errors.push(error.message));
const data=JSON.parse(await readFile(root+'data/exercises.json','utf8'));
try{
  await check('catalogue loads without downloading video files',async()=>{
    const videos=[];page.on('request',req=>{if(/\.mp4(?:$|\?)/.test(req.url()))videos.push(req.url());});
    await page.goto(base+'#/');await page.locator('.card').first().waitFor();assert.equal(videos.length,0);return {cards:await page.locator('.card').count(),videoRequests:videos.length};
  });
  await check('short search, equipment filter and return navigation preserve state',async()=>{
    await page.locator('#q').fill('sentadilla sin equipo');await page.locator('#q').press('Enter');await page.waitForFunction(()=>document.querySelector('.card__title')?.textContent.includes('Sentadilla con peso corporal'));
    const before=page.url();await page.locator('.card__link').first().click();await page.locator('.detail').waitFor();await page.locator('[data-back]').click();await page.locator('#q').waitFor();assert.equal(await page.locator('#q').inputValue(),'sentadilla sin equipo');assert.equal(page.url(),before);return{query:await page.locator('#q').inputValue()};
  });
  await check('skip link preserves route and focuses main with keyboard',async()=>{
    const hash=new URL(page.url()).hash;await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,hash);assert.equal(await page.evaluate(()=>document.activeElement.id),'main');return{hash,focus:'main'};
  });
  await check('saved removal updates card, count, empty state and Undo',async()=>{
    await page.evaluate(()=>localStorage.setItem('rl:guardados',JSON.stringify(['Bodyweight_Squat'])));await page.goto(base+'#/guardados');await page.locator('[data-save]').waitFor();await page.locator('[data-save]').click();await page.waitForFunction(()=>!document.querySelector('[data-save]'));
    assert.match(await page.locator('main').innerText(),/No tienes|Todavía no|Aún no guardas|vacía|vacío/);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('rl:guardados'))),[]);
    await page.getByRole('button',{name:'Deshacer',exact:true}).click();await page.locator('[data-save]').waitFor();assert.match(await page.locator('main').innerText(),/1 ejercicio/);return{removed:true,undoRestored:true};
  });
  await check('Pullups player delivers visible frames and changes pixels',async()=>{
    await page.goto(base+'#/ejercicio/Pullups');await page.locator('video').waitFor();assert.equal(await page.locator('video').getAttribute('preload'),'none');await page.getByRole('button',{name:'Reproducir video',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.dataset.playback==='playing');
    const result=await page.locator('video').evaluate(async video=>{
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');
      const capture=()=>{ctx.drawImage(video,0,0,64,64);return Array.from(ctx.getImageData(0,0,64,64).data).reduce((sum,n,i)=>(sum+n*(i%17+1))>>>0,0);};
      const first=capture();await new Promise(r=>setTimeout(r,2000));return{width:video.videoWidth,height:video.videoHeight,frames:video.getVideoPlaybackQuality().totalVideoFrames,time:video.currentTime,pixelsChanged:first!==capture()};
    });assert.ok(result.width>0&&result.height>0&&result.frames>1&&result.pixelsChanged);await page.screenshot({path:root+'docs/qa/pullups.png',fullPage:true});return result;
  });
  await check('GIF starts on poster, pauses and photos stay labelled as photos',async()=>{
    await page.locator('label[for="m-gif"]').click();const image=page.locator('[data-gif-src]');assert.ok(!(await image.getAttribute('src')).endsWith('.gif'));
    await page.getByRole('button',{name:'Reproducir GIF',exact:true}).click();assert.ok((await image.getAttribute('src')).endsWith('.gif'));await page.getByRole('button',{name:'Pausar GIF',exact:true}).click();assert.ok(!(await image.getAttribute('src')).endsWith('.gif'));
    await page.locator('label[for="m-fotos"]').click();assert.match(await page.locator('[data-panel="fotos"]').innerText(),/no muestran el movimiento continuo/);return{gifManual:true,photoLabel:true};
  });
  await check('all included MP4 files decode frames and changing pixels in browser',async()=>{
    const manifest=[...JSON.parse(await readFile(root+'data/media.json','utf8')),...JSON.parse(await readFile(root+'data/extra-media.json','utf8'))];
    const prior=process.env.QA_REUSE_MEDIA==='1'?JSON.parse(await readFile(root+'docs/browser-validation.json','utf8')):null;
    const decoded=process.env.QA_REUSE_MEDIA==='1'?JSON.parse(await readFile(root+'docs/media-decode.json','utf8')):[];
    if(prior)report.mediaCheckedAt=prior.mediaCheckedAt||prior.checked;
    // Validate each actual file, rather than only manifest codec or readyState.
    for(let i=0;i<manifest.length;i++){
      const m=manifest[i],cached=prior?.media.find(x=>x.video===m.video);
      if(cached?.sha256===m.sha256Video && decoded.some(x=>x.video===m.video&&x.sha256===m.sha256Video)){assert.ok(cached.width&&cached.height&&cached.frames>1&&cached.distinctPixelSamples>1);report.media.push(cached);continue;}
      const p=await context.newPage();await p.goto(base+'index.html');
      const result=await p.evaluate(async url=>{
        const v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=url;document.body.replaceChildren(v);let frames=0;
        const cb=(_,meta)=>{frames=Math.max(frames,meta.presentedFrames||frames+1);v.requestVideoFrameCallback(cb);};v.requestVideoFrameCallback(cb);
        const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d'),hashes=new Set();
        await v.play();const started=performance.now();
        while(performance.now()-started<2800&&!v.ended){if(v.videoWidth){ctx.drawImage(v,0,0,64,64);hashes.add(Array.from(ctx.getImageData(0,0,64,64).data).reduce((s,n,i)=>(s+n*(i%19+1))>>>0,0));}await new Promise(r=>setTimeout(r,250));}
        return {width:v.videoWidth,height:v.videoHeight,frames,time:v.currentTime,distinctPixelSamples:hashes.size,error:v.error?.message||null};
      },base+m.video);report.media.push({video:m.video,sha256:m.sha256Video,checked:new Date().toISOString(),...result});await p.close();
      assert.ok(result.width>0&&result.height>0&&result.frames>1&&result.distinctPixelSamples>1,m.video+' '+JSON.stringify(result));
      if(i%15===0)console.log('Frames verified',i+1,'/',manifest.length);
    }return{files:report.media.length,allHaveDimensionsFramesAndPixelChange:true};
  });
  await check('blocked video displays error, retry and valid GIF alternative',async()=>{
    const blocked=await makeContext({serviceWorkers:'block'});await blocked.route('**/*.mp4',r=>r.abort());const p=await blocked.newPage();await p.goto(base+'#/ejercicio/Pullups');await p.getByRole('button',{name:'Reproducir video',exact:true}).click();await p.locator('[data-video-retry]').waitFor({state:'visible'});assert.match(await p.locator('[data-video-status]').innerText(),/No se pudo|no llegaron|no decodificó/i);assert.ok(await p.getByLabel('GIF',{exact:true}).isVisible());await blocked.close();return{networkFailureDetected:true};
  });
  await check('audio without video frames is rejected even when its clock advances',async()=>{
    const p=await context.newPage();await p.goto(base+'index.html');await p.evaluate(async()=>{
      document.body.innerHTML='<main><video controls></video><button data-video-play>Reproducir video</button><button data-video-retry hidden>Reintentar video</button><p data-video-status></p></main>';
      const {wireVideo}=await import('./js/media.js');const v=document.querySelector('video');v.src='./tests/fixtures/audio-only.webm';wireVideo(document.querySelector('main'),{});
    });await p.locator('[data-video-play]').click();await p.waitForFunction(()=>document.querySelector('video').dataset.playback==='failed',{},{timeout:18000});const result=await p.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,time:v.currentTime,state:v.dataset.playback}));assert.equal(result.width,0);assert.equal(result.height,0);assert.ok(result.time>0);assert.match(await p.locator('[data-video-status]').innerText(),/sin imagen|sin mostrar fotogramas/);await p.close();return result;
  });
  await check('a network timeout shows loading, a useful error and retry',async()=>{
    const slow=await makeContext({serviceWorkers:'block'});let release;
    const held=new Promise(resolve=>{release=resolve;});
    await slow.route('**/*.mp4',async route=>{await held;try{await route.abort();}catch{}});
    const p=await slow.newPage();
    try{
      await p.goto(base+'#/ejercicio/Pullups');await p.getByRole('button',{name:'Reproducir video',exact:true}).click();
      await p.waitForFunction(()=>document.querySelector('video').dataset.playback==='loading');
      assert.match(await p.locator('[data-video-status]').innerText(),/Cargando|Esperando/);
      await p.waitForFunction(()=>document.querySelector('video').dataset.playback==='failed',{},{timeout:19000});
      assert.match(await p.locator('[data-video-status]').innerText(),/a tiempo/);assert.equal(await p.locator('[data-video-retry]').isVisible(),true);
      return{loadingShown:true,timeoutSeconds:15,retryShown:true};
    }finally{release();await slow.close();}
  });
  await check('mobile layout, reduced motion and filter focus trap',async()=>{
    const mobile=await makeContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});const p=await mobile.newPage();await p.goto(base+'#/');await p.locator('.card').first().waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.locator('.filters-toggle').click();assert.equal(await p.locator('#filtros').getAttribute('aria-modal'),'true');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('filters-toggle')),true);
    await p.goto(base+'#/ejercicio/Pullups');await p.locator('video').waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await p.locator('[data-video-play]').isVisible());assert.equal(await p.locator('video').evaluate(v=>v.paused),true);await p.screenshot({path:root+'docs/qa/mobile.png',fullPage:true});await mobile.close();return{viewport:'390×844',overflow:false,reducedMotion:true,escapeReturnsFocus:true};
  });
  await check('service worker, full media cache and byte range work offline without clearing saved data',async()=>{
    const offline=await makeContext();const p=await offline.newPage();await p.goto(base+'#/ejercicio/Pullups');await p.locator('video').waitFor();await p.evaluate(()=>localStorage.setItem('rl:guardados',JSON.stringify(['Pullups'])));await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
    await p.getByRole('button',{name:'Guardar video sin conexión',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-video-status]')?.textContent.includes('Video guardado sin conexión'));
    const installed=await p.evaluate(()=>navigator.serviceWorker.controller.scriptURL);await offline.setOffline(true);await p.reload();await p.getByRole('button',{name:'Reproducir video',exact:true}).click();await p.waitForFunction(()=>document.querySelector('video')?.dataset.playback==='playing');const dims=await p.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames}));assert.ok(dims.width&&dims.height&&dims.frames);
    const range=await p.evaluate(async()=>{const r=await fetch('assets/media/wger-475.mp4',{headers:{Range:'bytes=0-31'}});return{status:r.status,contentRange:r.headers.get('Content-Range'),bytes:(await r.arrayBuffer()).byteLength};});assert.equal(range.status,206);assert.equal(range.bytes,32);assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('rl:guardados'))),['Pullups']);await offline.close();return{installed,dims,range,savedPreserved:true};
  });
  await check('release activation removes v2 caches and preserves local favourites and routines',async()=>{
    const update=await makeContext();let release;const held=new Promise(resolve=>{release=resolve;});
    await update.route('**/sw.js',async route=>{await held;await route.continue();});
    const p=await update.newPage();
    try{
      await p.goto(base+'#/');await p.locator('.card').first().waitFor();
      const old=await p.evaluate(async()=>{
        localStorage.setItem('rl:guardados',JSON.stringify(['Pullups']));
        const routine={title:'Rutina conservada',days:[{title:'Día 1',items:[{exId:'Pushups',series:2,reps:'8',rest:'60 segundos'}]}]};
        localStorage.setItem('rl:rutina',JSON.stringify(routine));
        await(await caches.open('rutina-libre-shell-v2')).put('old-shell',new Response('old'));
        await(await caches.open('rutina-libre-media-v2')).put('old-medium',new Response('old'));
        return JSON.stringify(routine);
      });release();
      await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
      const state=await p.evaluate(async()=>({keys:await caches.keys(),saved:localStorage.getItem('rl:guardados'),routine:localStorage.getItem('rl:rutina')}));
      assert.ok(!state.keys.some(k=>k.endsWith('-v2')));assert.ok(state.keys.some(k=>k.includes('v3.0.0-')));
      assert.equal(state.saved,JSON.stringify(['Pullups']));assert.equal(state.routine,old);
      return{oldCachesRemoved:true,savedPreserved:true,routinePreserved:true};
    }finally{release();await update.close();}
  });
  await check('PDF and routine show the same dose and effective duration, including offline export',async()=>{
    const pdfctx=await makeContext(),p=await pdfctx.newPage();await p.goto(base+'#/');await p.locator('.card').first().waitFor();await p.evaluate(async()=>{
      await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
      const {loadData}=await import('./js/data.js'),{makeItem}=await import('./js/generator.js');const d=await loadData(),prefs={goal:'cardio',level:'beginner',days:1,minutes:60,equipment:[],focus:[]};
      localStorage.setItem('rl:rutina',JSON.stringify({version:1,title:'Prueba de dosis coherente',prefs,days:[{title:'Trote suave',items:['rl-calentamiento-marcha','rl-trote','rl-vuelta-calma'].map(id=>makeItem(d.byId.get(id),prefs)),cooldown:[],transitionSeconds:30}],notes:''}));
    });await p.goto(base+'#/rutina');await p.locator('[data-act="pdf"]').waitFor();assert.match(await p.locator('.day__duration').innerText(),/12–21 min/);assert.ok((await p.locator('[data-field="reps"]').evaluateAll(nodes=>nodes.map(n=>n.value))).some(s=>s.includes('5 a 10 minutos')));
    await p.locator('#pdf-photos').uncheck();await pdfctx.setOffline(true);const download=p.waitForEvent('download');await p.locator('[data-act="pdf"]').click();await(await download).saveAs(root+'docs/qa/routine-offline.pdf');assert.match(await p.locator('[data-pdf-status]').innerText(),/PDF descargado/);await pdfctx.close();return{pdf:'docs/qa/routine-offline.pdf',offline:true,dose:'5 a 10 minutos',effectiveDuration:'12–21 min'};
  });
  await check('unavailable legacy IDs remain stored and visible item actions use original indices',async()=>{
    await page.evaluate(()=>localStorage.setItem('rl:rutina',JSON.stringify({title:'Antigua',prefs:null,days:[{title:'Día antiguo',items:[{exId:'missing-id',series:1,reps:'5',rest:''},{exId:'Pushups',series:2,reps:'8',rest:'60 segundos'}],cooldown:[]}],notes:''})));await page.goto(base+'#/rutina');await page.locator('.item').waitFor();assert.equal(await page.locator('.item').getAttribute('data-i'),'1');await page.locator('[data-act="remove"]').click();const ids=await page.evaluate(()=>JSON.parse(localStorage.getItem('rl:rutina')).days[0].items.map(x=>x.exId));assert.deepEqual(ids,['missing-id']);return{preservedIDs:ids};
  });
  await check('accessibility scan checks five desktop views and mobile in light and dark themes',async()=>{
    const routes=['#/','#/ejercicio/Pullups','#/identificar','#/rutina','#/acerca'],scans=[];
    for(const colorScheme of ['light','dark']){
      await page.emulateMedia({colorScheme});await page.setViewportSize({width:1280,height:800});
      for(const route of routes){
      await page.goto(base+route);await page.locator('main').waitFor();await page.waitForTimeout(500);
      await page.addScriptTag({content:axe.source});
      const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});
      scans.push({route,viewport:'1280×800',colorScheme,...result});
      }
    await page.setViewportSize({width:390,height:844});await page.goto(base+'#/ejercicio/Pullups');await page.locator('video').waitFor();await page.addScriptTag({content:axe.source});
    const mobile=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});scans.push({route:'#/ejercicio/Pullups',viewport:'390×844',colorScheme,...mobile});
    }
    report.accessibility={tool:'axe-core '+axe.version,scans,limitation:'Automated scan only; no certification or screen reader evaluation'};
    assert.ok(scans.every(s=>s.violations.length===0),JSON.stringify(scans.filter(s=>s.violations.length)));return{scans:scans.length,violations:0,manualReviewNeeded:scans.some(s=>s.incomplete.length)};
  });
}finally{
  await context.close();await browser.close();server.kill();
  report.passed=report.checks.every(c=>c.passed)&&report.errors.length===0;
  await writeFile(root+'docs/browser-validation.json',JSON.stringify(report,null,2)+'\n');
  console.log('Browser checks:',report.checks.filter(c=>c.passed).length,'/',report.checks.length,'Files:',report.media.length);if(!report.passed)process.exitCode=1;
}
