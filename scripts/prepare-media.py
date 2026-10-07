#!/usr/bin/env python3
"""Maintenance only. Convert licensed source videos; never needed by visitors.

Uses the included wger snapshot by default, --all-variants for every original.
Preserves successful older entries on failure. --ids 475,73 targets records.
Needs Python 3, ffmpeg and ffprobe (all free).
"""
import argparse, concurrent.futures, datetime, hashlib, json, pathlib, subprocess, tempfile, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/media'
LICENSES = {'CC BY-SA 3.0','CC BY-SA 4.0','CC BY 4.0','CC0 1.0'}

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height,nb_frames:format=duration','-of','json',str(path)]))

def convert(record, i):
    original_url = record['videos'][i]
    info = record.get('videoInfo',[])[i]
    if info.get('name') not in LICENSES:
        raise ValueError('No verified redistribution license: '+original_url)
    ident = record['wgerId']
    name = f'wger-{ident}' + (f'-v{i+1}' if i else '')
    mp4, poster = DEST/(name+'.mp4'), DEST/(name+'.jpg')
    with tempfile.TemporaryDirectory() as temp:
        source = pathlib.Path(temp)/'original'
        subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','90','--output',str(source),original_url],check=True,timeout=95)
        sha = hashlib.sha256(source.read_bytes()).hexdigest()
        source_probe = probe(source)
        if not source_probe.get('streams'): raise ValueError('No video stream')
        output = pathlib.Path(temp)/'compatible.mp4'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-threads','2','-i',str(source),'-map','0:v:0','-vf',"scale='min(720,iw)':-2,fps=24",'-c:v','libx264','-threads','2','-crf','24','-preset','fast','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(output)],check=True,timeout=180)
        decoded = probe(output)
        stream = decoded['streams'][0]
        if stream['codec_name'] != 'h264' or stream['pix_fmt'] != 'yuv420p' or not stream['width']:
            raise ValueError('Invalid converted stream')
        raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(output),'-vf','fps=2,scale=64:64,format=gray','-f','rawvideo','-'],timeout=120)
        frames = [raw[j:j+4096] for j in range(0,len(raw),4096) if len(raw[j:j+4096])==4096]
        distinct = len(set(hashlib.sha256(f).hexdigest() for f in frames))
        if len(frames)<2 or distinct<2: raise ValueError('No changing decoded frames')
        output.replace(mp4)
        duration = float(decoded['format']['duration'])
        start = min(4, duration*.25)
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(mp4),'-frames:v','1',str(poster)],check=True,timeout=30)
        gif = DEST/(name+'.gif') if i==0 else None
        gif_duration = min(6,duration-start)
        if gif:
            subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(mp4),'-t',str(gif_duration),'-filter_complex','fps=8,scale=320:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer','-loop','0',str(gif)],check=True,timeout=60)
    credit = dict(kind='MP4, GIF y miniatura derivados' if gif else 'MP4 y miniatura derivados',author=info['author'],name=info['name'],url=info.get('licenseUrl') or info.get('url'),source=info['source'],original=original_url,changes=f'MP4 H.264 yuv420p, 24 fps, máximo 720 px, faststart, sin audio. Miniatura en {start:.2f} s.'+(f' GIF de {gif_duration:.2f} s desde {start:.2f} s.' if gif else ''))
    result = dict(wgerId=ident,video=f'assets/media/{mp4.name}',poster=f'assets/media/{poster.name}',original=original_url,sha256Original=sha,sha256Video=hashlib.sha256(mp4.read_bytes()).hexdigest(),checked=datetime.datetime.now(datetime.timezone.utc).isoformat(),attribution=credit,sourceProbe=source_probe,probe=decoded,frameCheck=dict(sampledFrames=len(frames),distinctFrames=distinct,width=64,height=64),bytes=mp4.stat().st_size)
    if gif: result.update(gif=f'assets/media/{gif.name}',gifStartSeconds=round(start,2))
    print(f'OK {ident} original {i+1}: {stream["width"]}x{stream["height"]}, {distinct} distinct frames',flush=True)
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--snapshot',default='data/source-wger.json')
    parser.add_argument('--ids')
    parser.add_argument('--all-variants',action='store_true')
    parser.add_argument('--workers',type=int,default=3)
    args=parser.parse_args()
    DEST.mkdir(parents=True,exist_ok=True)
    records=json.loads((ROOT/args.snapshot).read_text())
    selected=set(map(int,args.ids.split(','))) if args.ids else None
    old=json.loads((ROOT/'data/media.json').read_text()) if (ROOT/'data/media.json').exists() else []
    manifest={m['original']:m for m in old}
    jobs=[(r,i) for r in records if r.get('videos') and (not selected or r['wgerId'] in selected) for i in range(len(r['videos']) if args.all_variants else 1)]
    failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(convert,r,i):(r,i) for r,i in jobs}
        for future in concurrent.futures.as_completed(futures):
            r,i=futures[future]
            try:
                value=future.result(); manifest[value['original']]=value
                (ROOT/'data/media.json').write_text(json.dumps(sorted(manifest.values(),key=lambda m:(m['wgerId'],m['video'])),ensure_ascii=False,indent=2)+'\n')
            except Exception as e:
                failures.append(dict(wgerId=r['wgerId'],original=r['videos'][i],error=str(e)))
                print('FAILED',r['wgerId'],str(e),flush=True)
    (ROOT/'docs/media-maintenance.json').write_text(json.dumps(dict(attempted=len(jobs),succeeded=len(jobs)-len(failures),failures=failures),ensure_ascii=False,indent=2)+'\n')
    if failures: raise SystemExit(1)

if __name__=='__main__': main()
