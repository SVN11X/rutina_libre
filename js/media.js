export function playableVideos(ex) {
  return [...new Set(ex.videos || [])].filter(url => {
    const info = ex.videoInfo?.find(v => (v.mediaUrl || v.url) === url);
    if(info?.variantRestricted)return false;
    if (/hevc|h265/i.test(info?.codec || '')) return false;
    return url.startsWith('assets/media/') || /h264|avc|vp[89]|av1/i.test(info?.codec || '') || /\.(mp4|webm)(?:$|\?)/i.test(url);
  });
}
export function hasDecodedFrames({width,height,frames}) { return width>0 && height>0 && frames>0; }
// Success is based on decoded video frames, never duration, HTTP or time alone.
export function wireVideo(root, ex) {
  const video=root.querySelector('video'); if(!video)return ()=>{};
  const status=root.querySelector('[data-video-status]'), retry=root.querySelector('[data-video-retry]'), start=root.querySelector('[data-video-play]'), options=root.querySelector('[data-video-source]');
  let timeout,poll,frameId,disposed=false,frames=0,lastFrames=0,lastTime=0,lastStamp=0,same=0,hash=null,sampling=true;
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const clear=()=>{clearTimeout(timeout);clearInterval(poll);poll=null;if(frameId && video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameId);frameId=null;};
  const state=(key,message)=>{
    if(disposed)return;video.dataset.playback=key;status.textContent=message;
    retry.hidden=!['failed','stalled'].includes(key);
    start.textContent=video.paused?'Reproducir video':'Pausar video';
    start.setAttribute('aria-pressed',String(!video.paused));
  };
  const fail=message=>{clear();video.pause();state('failed',message+' Reintenta o usa el GIF, las fotos o la fuente de esta ficha.');};
  const sample=()=>{
    if(!sampling || !video.videoWidth)return;
    try{
      ctx.drawImage(video,0,0,16,16);const pixels=ctx.getImageData(0,0,16,16).data;
      const next=Array.from(pixels).filter((_,i)=>i%4!==3).map(n=>Math.round(n/8)).join(',');
      same=next===hash?same+1:0;hash=next;
      if(!same && video.dataset.playback==='stalled')state('playing','Video con imagen y cambios detectados. Puedes pausar con los controles.');
      if(same>=12 && !['plank','balance'].includes(ex.family))state('stalled','Se reciben fotogramas, pero no detectamos cambios de imagen. Comprueba la demostración o usa otra fuente.');
    }catch{sampling=false;} // CORS can prevent pixel inspection: do not claim motion verified.
  };
  const inspect=()=>{
    if(video.paused || document.hidden)return;
    if(!video.requestVideoFrameCallback){const decoded=video.getVideoPlaybackQuality?.().totalVideoFrames || video.webkitDecodedFrameCount || 0;frames=Math.max(frames,decoded);}
    if(video.currentTime>1 && (!video.videoWidth || !video.videoHeight))return fail('El tiempo avanzó sin imagen: este navegador no decodificó el video.');
    if(hasDecodedFrames({width:video.videoWidth,height:video.videoHeight,frames}) && frames>lastFrames){
      lastFrames=frames;lastTime=video.currentTime;lastStamp=performance.now();clearTimeout(timeout);
      if(video.dataset.playback!=='stalled')state('playing','Video con imagen. Usa los controles para pausar, cambiar el volumen o ampliar.');sample();
    }else if(lastStamp && performance.now()-lastStamp>10000 && video.currentTime>lastTime)fail('La reproducción dejó de entregar fotogramas.');
    else if(lastStamp && performance.now()-lastStamp>12000)fail('El video se detuvo mientras esperaba datos de la red.');
  };
  const callback=(_,metadata)=>{frames=Math.max(frames+1,metadata.presentedFrames||0);if(!disposed && !video.paused)frameId=video.requestVideoFrameCallback(callback);};
  const reset=()=>{clear();frames=lastFrames=lastTime=lastStamp=same=0;hash=null;};
  const arm=()=>{clear();state('loading','Cargando imagen del video…');timeout=setTimeout(()=>fail('No llegaron fotogramas a tiempo. Puede haber un bloqueo de red o un formato incompatible.'),15000);poll=setInterval(inspect,500);if(video.requestVideoFrameCallback)frameId=video.requestVideoFrameCallback(callback);};
  const play=async()=>{try{await video.play();}catch{if(!disposed && video.dataset.playback!=='failed')fail('No se pudo iniciar el video. Revisa la conexión o los permisos del navegador.');}};
  const listeners=[],on=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
  on(video,'play',arm);
  on(video,'pause',()=>{clear();if(video.dataset.playback!=='failed')state('paused',frames?'Video pausado.':'Reproduce el video para comprobar la imagen.');});
  on(video,'ended',()=>{clear();if(!hasDecodedFrames({width:video.videoWidth,height:video.videoHeight,frames}))fail('El archivo terminó sin mostrar fotogramas.');else state('ended','Video terminado con imagen. Puedes volver a reproducirlo.');});
  on(video,'error',()=>fail('No se pudo cargar o decodificar este video.'));
  on(video,'waiting',()=>{if(video.paused)return;state('loading','Esperando datos de la red…');clearTimeout(timeout);timeout=setTimeout(()=>fail('La red no entregó el video a tiempo.'),15000);});
  on(start,'click',()=>video.paused?play():video.pause());
  on(retry,'click',()=>{reset();video.load();play();});
  if(options)on(options,'change',()=>{video.pause();reset();video.src=options.value;video.load();state('idle','Otra versión de la misma demostración. Reproduce para comprobarla.');});
  const cacheButton=root.querySelector('[data-cache-video]');
  if(cacheButton)on(cacheButton,'click',async()=>{
    cacheButton.disabled=true;
    try{
      if(!navigator.serviceWorker?.controller)throw new Error('worker');state('idle','Guardando este video para usarlo sin conexión…');
      const res=await fetch(video.currentSrc||video.src,{headers:{'X-Rutina-Cache':'full'},signal:AbortSignal.timeout(45000)});
      if(!res.ok || res.status!==200)throw new Error('network');await res.arrayBuffer();
      if(!await caches.match(video.currentSrc||video.src))throw new Error('cache');
      state(video.paused?'idle':'playing','Video guardado sin conexión. El navegador puede liberar su caché si falta espacio.');
    }catch{state('idle','No se pudo guardar el video. Necesitas conexión y espacio en este navegador.');}
    finally{cacheButton.disabled=false;}
  });
  state('idle','Reproduce la demostración cuando estés listo. No se descarga hasta que la solicites.');
  return ()=>{disposed=true;clear();listeners.forEach(fn=>fn());video.pause();video.removeAttribute('src');video.load();};
}
