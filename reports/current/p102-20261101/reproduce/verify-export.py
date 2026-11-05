import json,pathlib,re,subprocess
root=pathlib.Path(r'C:\Users\20153\AppData\Local\Temp\p102-20261101-4dizbre0');out=root/'evidence/browser'
video=out/'P1-02-dual-device-1080p30.mp4';results=[]
for frame in [0,15,29]:
 decoded=out/f'04-decoded-{frame}.png'
 command=['ffmpeg','-hide_banner','-loglevel','error','-i',str(video),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(decoded)]
 r=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=30);assert r.returncode==0,r.stderr
 compare=['ffmpeg','-hide_banner','-i',str(decoded),'-i',str(out/f'04-reference-{frame}.png'),'-lavfi','ssim','-f','null','-']
 r=subprocess.run(compare,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=30);assert r.returncode==0,r.stderr
 (out/f'04-ssim-{frame}.txt').write_text(r.stderr,encoding='utf-8')
 matches=re.findall(r'All:([0-9.]+)',r.stderr);assert matches
 value=float(matches[-1])
 results.append({'frame':frame,'ssim':value,'threshold':0.97,'status':'PASS' if value>=.97 else 'FAIL','decode_command':command,'compare_command':compare,'decoded':decoded.name,'reference':f'04-reference-{frame}.png'})
report={'status':'PASS' if all(x['status']=='PASS' for x in results) else 'FAIL','frames':results,'method':'Decode actual MP4 and compare frame indices 0, 15, 29 to same-project Standard-quality engine frame exports.'}
(out/'04-frame-comparison.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True))

