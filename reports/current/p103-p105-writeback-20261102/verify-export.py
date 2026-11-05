import json,pathlib,re,subprocess
root=pathlib.Path(__file__).resolve().parent
out=root/'browser'
report=[]
for prefix,video,frames in [('manual','P1-03-manual-720-1080p30.mp4',[0,15,59]),('dual','P1-03-05-dual-animation-1080p30.mp4',[0,30,59])]:
 results=[]
 for frame in frames:
  stem=f'04-manual-reference-{frame}' if prefix=='manual' else f'04-reference-{frame}'
  decoded=out/f'04-{prefix}-decoded-{frame}.png'
  command=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out/video),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(decoded)]
  r=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40)
  assert r.returncode==0,r.stderr
  compare=['ffmpeg','-hide_banner','-i',str(decoded),'-i',str(out/(stem+'.png')),'-lavfi','ssim','-f','null','-']
  r=subprocess.run(compare,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40)
  assert r.returncode==0,r.stderr
  (out/f'04-{prefix}-ssim-{frame}.txt').write_text(r.stderr,encoding='utf-8')
  value=float(re.findall(r'All:([0-9.]+)',r.stderr)[-1])
  results.append({'frame':frame,'ssim':value,'threshold':.97,'status':'PASS' if value>=.97 else 'FAIL','decoded':decoded.name,'reference':stem+'.png','decode_command':command,'compare_command':compare})
 report.append({'clip':prefix,'video':video,'status':'PASS' if all(x['status']=='PASS' for x in results) else 'FAIL','frames':results})
summary={'status':'PASS' if all(x['status']=='PASS' for x in report) else 'FAIL','clips':report,'method':'FFmpeg-decoded MP4 frames compared against same-project, same-index Standard-quality engine frame exports; SSIM >=0.97.'}
(out/'frame-comparison.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True))
if summary['status']!='PASS':raise SystemExit(1)

