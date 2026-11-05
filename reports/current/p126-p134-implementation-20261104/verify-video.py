from pathlib import Path
from datetime import datetime,timezone
import subprocess,json,re,time
ROOT=Path(__file__).resolve().parent
work=ROOT/'regression-30s';frames=[0,12,30,60,90,119];start=time.monotonic()
def run(args):
 return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',creationflags=subprocess.CREATE_NO_WINDOW)
selection="select='"+'+'.join(f'eq(n,{n})' for n in frames)+"'"
decoded=run(['ffmpeg','-v','error','-y','-i',str(work/'beginner-1080p30.mp4'),'-vf',selection,'-fps_mode','vfr',str(work/'decoded-%03d.png')])
if decoded.returncode:raise RuntimeError(decoded.stdout)
items=[]
for i,frame in enumerate(frames,1):
 for region,crop in [('full',None),('title-region','1400:220:260:40'),('right-region','260:570:1010:300')]:
  prefix=f'crop={crop},' if crop else ''
  graph=f'[0:v]{prefix}format=rgb24[a];[1:v]{prefix}format=rgb24[b];[a][b]ssim'
  result=run(['ffmpeg','-v','info','-i',str(work/f'reference-{frame:03d}.png'),'-i',str(work/f'decoded-{i:03d}.png'),'-lavfi',graph,'-f','null','-'])
  match=re.search(r'All:([0-9.]+)',result.stdout);score=float(match[1]) if match else 0
  items.append({'frame':frame,'region':region,'ssim':score,'exitCode':result.returncode,'status':'PASS' if result.returncode==0 and score>=.95 else 'FAIL'})
report={'date':datetime.now(timezone.utc).isoformat(),'command':'FFmpeg decode and SSIM against exact engine references','status':'PASS' if all(i['status']=='PASS' for i in items) else 'FAIL','comparisons':items,'minimumByRegion':{r:min(i['ssim'] for i in items if i['region']==r) for r in ['full','title-region','right-region']},'seconds':round(time.monotonic()-start,3)}
(ROOT/'video-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
raise SystemExit(0 if report['status']=='PASS' else 1)
