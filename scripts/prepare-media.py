#!/usr/bin/env python3
"""Opcional para mantenedores: convertir videos CC BY-SA de wger a MP4/GIF.
Requiere ffmpeg en el equipo de mantenimiento; el visitante no instala nada.
Uso: python3 scripts/prepare-media.py [snapshot-wger-original.json]
"""
import concurrent.futures, datetime, hashlib, json, pathlib, subprocess, sys, tempfile, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
IDS = [73, 75, 194, 245, 246, 537, 538, 655, 659, 803, 91, 475]
DEST = ROOT / 'assets' / 'media'
DEST.mkdir(parents=True, exist_ok=True)
def get_json(url):
    with urllib.request.urlopen(url, timeout=45) as r: return json.load(r)
records = json.loads(pathlib.Path(sys.argv[1]).read_text()) if len(sys.argv)>1 else [get_json(f'https://wger.de/api/v2/exerciseinfo/{i}/') for i in IDS]
by_id = {x['id']:x for x in records}
def convert(id):
    x=by_id[id]
    v=next((v for v in x.get('videos',[]) if v.get('license')==2),None)
    if not v: return None
    basename=f'wger-{id}'
    mp4=DEST/(basename+'.mp4'); gif=DEST/(basename+'.gif'); poster=DEST/(basename+'.jpg')
    with tempfile.TemporaryDirectory() as temp:
        original=pathlib.Path(temp)/'original.mov'
        for attempt in range(2):
            try:
                with urllib.request.urlopen(v['video'],timeout=60) as r,original.open('wb') as target:
                    while chunk:=r.read(1024*1024): target.write(chunk)
                if original.stat().st_size<1000: raise RuntimeError('Archivo vacío')
                break
            except Exception:
                if attempt==1: raise
        sha=hashlib.sha256(original.read_bytes()).hexdigest()
        common=['ffmpeg','-hide_banner','-loglevel','error','-y','-threads','2','-i',str(original)]
        subprocess.run(common+['-vf',"scale='min(640,iw)':-2,fps=20",'-c:v','libx264','-crf','27','-preset','fast','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(mp4)],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(mp4)]))
        start=round(min(4,duration*.25),2)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(mp4),'-t','6','-filter_complex','fps=7,scale=320:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=80[p];[b][p]paletteuse=dither=bayer','-loop','0',str(gif)],check=True)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(mp4),'-frames:v','1',str(poster)],check=True)
    print('Video compatible y GIF:',id,flush=True)
    return dict(wgerId=id,video=f'assets/media/{mp4.name}',gif=f'assets/media/{gif.name}',poster=f'assets/media/{poster.name}',original=v['video'],gifStartSeconds=start,sha256Original=sha,checked=datetime.datetime.now(datetime.timezone.utc).isoformat(),attribution=dict(kind='MP4, GIF y miniatura derivados',author=v.get('license_author') or 'Comunidad wger',name='CC BY-SA 4.0',url='https://creativecommons.org/licenses/by-sa/4.0/',source=f'https://wger.de/en/exercise/{id}/view/',original=v['video'],changes=f'MP4 H.264 sin audio y resolución reducida. GIF de 6 segundos desde el segundo {start}; miniatura del fragmento seleccionado. Revisa el resultado antes de publicar.'))
manifest=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    futures={pool.submit(convert,id):id for id in IDS if id in by_id}
    for future in concurrent.futures.as_completed(futures):
        try:
            value=future.result()
            if value: manifest.append(value)
        except Exception as e: print('No se pudo convertir',futures[future],str(e),file=sys.stderr)
if manifest:
    (ROOT/'data/media.json').write_text(json.dumps(sorted(manifest,key=lambda x:x['wgerId']),ensure_ascii=False,indent=2)+'\n')
print('Recursos preparados:',len(manifest))
