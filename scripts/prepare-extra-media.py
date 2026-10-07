#!/usr/bin/env python3
"""Maintenance: reproducible conversions of individually licensed demonstrations.
Requires free Python 3, curl, ffmpeg and ffprobe, never visitor installation.
--originals-dir reuses originals downloaded by the maintainer.
"""
import argparse,datetime,hashlib,json,pathlib,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
def run(args): subprocess.run(args,check=True,timeout=240)
def probe(file):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height,nb_frames:format=duration','-of','json',str(file)]))
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--originals-dir');args=parser.parse_args()
    sources=json.loads((ROOT/'data/extra-sources.json').read_text());results=[]
    dest=ROOT/'assets/media';dest.mkdir(exist_ok=True)
    for row in sources:
        if row['license'] not in ['Dominio público · DVIDS','CC BY-SA 3.0','CC BY-SA 4.0']:raise ValueError('License must be reviewed')
        with tempfile.TemporaryDirectory() as temp:
            source=pathlib.Path(args.originals_dir)/row['localOriginal'] if args.originals_dir else pathlib.Path(temp)/'original.mp4'
            if not source.exists():run(['curl','--fail','--location','--max-time','120','--output',str(source),row['original']])
            name='demo-'+row['slug'];video=dest/(name+'.mp4');poster=dest/(name+'.jpg');gif=dest/(name+'.gif')
            output=pathlib.Path(temp)/'converted.mp4'
            run(['ffmpeg','-v','error','-y','-ss',str(row['startSeconds']),'-i',str(source),'-t',str(row['durationSeconds']),'-map','0:v:0','-vf',"scale='min(720,iw)':-2,fps=24",'-c:v','libx264','-threads','2','-crf','24','-preset','fast','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(output)])
            info=probe(output);raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(output),'-vf','fps=2,scale=64:64,format=gray','-f','rawvideo','-'],timeout=120)
            frames=[raw[i:i+4096]for i in range(0,len(raw),4096)if len(raw[i:i+4096])==4096];distinct=len(set(hashlib.sha256(f).hexdigest()for f in frames))
            if distinct<2:raise ValueError('No distinct decoded frames')
            output.replace(video)
            run(['ffmpeg','-v','error','-y','-ss','2','-i',str(video),'-frames:v','1',str(poster)])
            run(['ffmpeg','-v','error','-y','-ss','2','-i',str(video),'-t','6','-filter_complex','fps=8,scale=320:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer','-loop','0',str(gif)])
            changes=f"Fragmento desde {row['startSeconds']} s, duración máxima {row['durationSeconds']} s. H.264 yuv420p 720 px, 24 fps, faststart; sin audio. GIF 6 s desde el segundo 2 del fragmento; miniatura en 2 s. La dosis de la app es independiente del video original."
            result=dict(exerciseId=row['exerciseId'],title=row['title'],video='assets/media/'+video.name,gif='assets/media/'+gif.name,poster='assets/media/'+poster.name,original=row['original'],sha256Original=hashlib.sha256(source.read_bytes()).hexdigest(),sha256Video=hashlib.sha256(video.read_bytes()).hexdigest(),sourceProbe=probe(source),probe=info,frameCheck=dict(sampledFrames=len(frames),distinctFrames=distinct),attribution=dict(kind='MP4, GIF y miniatura derivados',author=row['author'],name=row['license'],url=row['licenseUrl'],source=row['source'],original=row['original'],changes=changes,notice=row['notice']),checked=datetime.datetime.now(datetime.timezone.utc).isoformat(),visualReview=row['visualReview'],bytes=video.stat().st_size)
            results.append(result);print('OK',row['exerciseId'],info['streams'][0],flush=True)
    (ROOT/'data/extra-media.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
