from pathlib import Path
from datetime import datetime, timezone, timedelta
import subprocess,json,re,time,hashlib
import struct
from functools import lru_cache
ROOT=Path(__file__).resolve().parent
WORK=ROOT/'workflow-ui-final';EFFECT=ROOT/'effects-final';POLISH=ROOT/'polish-verification'
started=time.monotonic();frames=[0,12,30,60,90,119]
def run(args):return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',creationflags=subprocess.CREATE_NO_WINDOW)
def compare(a,b,crop=None):
 prefix=('crop='+crop+',') if crop else ''
 graph=f'[0:v]{prefix}format=rgb24[a];[1:v]{prefix}format=rgb24[b];[a][b]ssim'
 result=run(['ffmpeg','-v','info','-i',str(a),'-i',str(b),'-lavfi',graph,'-f','null','-'])
 match=re.search(r'All:([0-9.]+)',result.stdout)
 return {'ssim':float(match.group(1)) if match else 0,'exitCode':result.returncode}
select="select='"+'+'.join('eq(n,'+str(n)+')' for n in frames)+"'"
result=run(['ffmpeg','-v','error','-y','-i',str(WORK/'beginner-1080p30.mp4'),'-vf',select,'-fps_mode','vfr',str(WORK/'decoded-%03d.png')])
if result.returncode:raise RuntimeError(result.stdout)
comparisons=[]
for i,frame in enumerate(frames,1):
 for name,crop in [('full',None),('title','1400:220:260:40'),('right-screen','260:570:1010:300')]:
  item=compare(WORK/f'reference-{frame:03d}.png',WORK/f'decoded-{i:03d}.png',crop)
  comparisons.append(dict(frame=frame,region=name,**item,status='PASS' if item['exitCode']==0 and item['ssim']>=.95 else 'FAIL'))
static=compare(POLISH/'none.png',POLISH/'blur.png')
@lru_cache(maxsize=8)
def pixels(file,fmt='rgb24'):
 raw=Path(file).read_bytes();w,h=struct.unpack('>II',raw[16:24])
 decoded=subprocess.run(['ffmpeg','-v','error','-i',str(file),'-f','rawvideo','-pix_fmt',fmt,'pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW,check=True).stdout
 return w,h,decoded
w,h,rgba=pixels(POLISH/'text-only-transparent.png','rgba');alpha=rgba[3::4]
transparent={'minimum':min(alpha),'maximum':max(alpha),'visiblePixels':sum(v>0 for v in alpha)}
def energy(file,box):
 w,h,data=pixels(file);left,top,right,bottom=box;total=0
 def luminance(x,y):
  i=(y*w+x)*3;return (77*data[i]+150*data[i+1]+29*data[i+2])>>8
 for y in range(top,bottom-1):
  for x in range(left,right-1):
   v=luminance(x,y);total+=(luminance(x+1,y)-v)**2+(luminance(x,y+1)-v)**2
 return total/((right-left-1)*(bottom-top-1))
sharpness={}
for name,box in [('near',(180,50,415,490)),('far',(520,90,725,450))]:
 normal=energy(EFFECT/'03-no-effects.png',box);blurred=energy(EFFECT/'04-depth-of-field.png',box);sharpness[name]={'normal':normal,'withDof':blurred,'ratio':blurred/normal if normal else 0,'roi':box}
w,h,a=pixels(EFFECT/'03-no-effects.png');_,_,b=pixels(EFFECT/'04-depth-of-field.png')
white=[(x,y) for y in range(40,100) for x in range(300,700) if min(a[(y*w+x)*3:(y*w+x)*3+3])>245]
unchanged=sum(a[(y*w+x)*3:(y*w+x)*3+3]==b[(y*w+x)*3:(y*w+x)*3+3] for x,y in white)
title={'whitePixels':len(white),'unchanged':unchanged,'fraction':unchanged/len(white) if white else 0}
repeat=(EFFECT/'05-motion-blur.png').read_bytes()==(EFFECT/'05b-motion-repeat.png').read_bytes()
checks={
 'encodedFramesMatchReferences':all(r['status']=='PASS' for r in comparisons),
 'staticMotionBlurDoesNotBlurWholeImage':static['exitCode']==0 and static['ssim']>=.99,
 'textOnlyPngHasTransparentBackgroundAndVisibleText':transparent['minimum']==0 and transparent['maximum']>200 and transparent['visiblePixels']>100,
 'depthOfFieldBlursFarObjectMore':sharpness['far']['ratio']<sharpness['near']['ratio'] and sharpness['far']['ratio']<.8,
 'titleStaysCrisp':title['fraction']>.99,
 'temporalSamplesRepeatExactly':repeat,
}
report={'date':datetime.now(timezone(timedelta(hours=8))).isoformat(),'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'frameComparisons':comparisons,'minimumByRegion':{name:min(r['ssim'] for r in comparisons if r['region']==name) for name in ['full','title','right-screen']},'staticBlurComparison':static,'transparentTitle':transparent,'depthOfFieldSharpness':sharpness,'titlePixels':title,'seconds':round(time.monotonic()-started,3)}
(ROOT/'artifact-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
raise SystemExit(0 if all(checks.values()) else 1)
