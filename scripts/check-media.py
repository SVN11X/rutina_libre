#!/usr/bin/env python3
"""Decode every distributed MP4 and verify provenance, H.264, pixels and faststart."""
import hashlib,json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/media.json').read_text())+json.loads((ROOT/'data/extra-media.json').read_text())
report=[]
for row in rows:
    path=ROOT/row['video'];raw=path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['sha256Video'],str(path)+' changed without updating manifest'
    assert raw.index(b'moov')<raw.index(b'mdat'),str(path)+' missing faststart'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height:format=duration','-of','json',str(path)]));stream=probe['streams'][0]
    assert stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p' and stream['width']>0 and stream['height']>0
    # ffmpeg reports decoding errors and exits nonzero, rather than accepting headers alone.
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-map','0:v:0','-f','null','-'],check=True,timeout=180)
    assert row['frameCheck']['distinctFrames']>1 and row['attribution']['author'] and row['attribution']['url']
    report.append(dict(video=row['video'],sha256=row['sha256Video'],**stream,seconds=float(probe['format']['duration']),decodedWithoutErrors=True))
    print('OK',row['video'],flush=True)
(ROOT/'docs/media-decode.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Decoded',len(report),'MP4 files')
