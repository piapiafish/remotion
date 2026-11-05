import hashlib,json,re,subprocess
from pathlib import Path
audit=Path(__file__).parent
folder=audit/'evidence/browser'
video=folder/'P1-01-1080p30.mp4'
results=[]
for frame in [0,30,59]:
 decoded=folder/f'06-decoded-{frame:02d}.png'
 ref=folder/f'06-reference-{frame:02d}.png'
 cmd=['ffmpeg','-v','error','-i',str(video),'-vf',f'select=eq(n\\,{frame})','-frames:v','1','-fps_mode','vfr',str(decoded)]
 p=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',timeout=30)
 if p.returncode: raise RuntimeError(p.stderr)
 compare=['ffmpeg','-i',str(ref),'-i',str(decoded),'-lavfi','ssim','-f','null','-']
 c=subprocess.run(compare,capture_output=True,text=True,encoding='utf-8',timeout=30)
 match=re.search(r'All:([0-9.]+)',c.stderr)
 score=float(match.group(1)) if c.returncode==0 and match else None
 (folder/f'06-ssim-{frame:02d}.txt').write_text(c.stderr,encoding='utf-8')
 results.append({'frame':frame,'time':frame/30,'decoded':decoded.name,'reference':ref.name,'ssim':score,'status':'PASS' if score is not None and score>=.97 else 'FAIL','decodedSha256':hashlib.sha256(decoded.read_bytes()).hexdigest()})
report={'method':'Real H.264 video decoded by FFmpeg; compared against engine previewFrame at the exact same frame index, pose, screen-video time, resolution and Standard quality. SSIM >= .97 is an objective consistency check; user visual acceptance remains pending.','checks':results}
(folder/'06-frame-comparison.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
source=json.loads((audit/'source-baseline.json').read_text(encoding='utf-8'))
mismatches=[]
for name,digest in source['files'].items():
 p=Path(source['source'])/name
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:mismatches.append(name)
integrity={'files':len(source['files']),'changed':mismatches,'status':'PASS' if not mismatches else 'FAIL'}
(audit/'evidence/source-integrity.json').write_text(json.dumps(integrity,indent=2),encoding='utf-8')
print(json.dumps({'frameComparison':report,'sourceIntegrity':integrity},ensure_ascii=True))

