import json,pathlib,re,subprocess,sys
root=pathlib.Path(__file__).resolve().parent
out=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'browser'
results=[]
for frame in [0,30,72,114]:
 decoded=out/f'02-decoded-{frame}.png'
 command=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out/'P1-06-dual-timing-1080p30.mp4'),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(decoded)]
 r=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40);assert r.returncode==0,r.stderr
 compare=['ffmpeg','-hide_banner','-i',str(decoded),'-i',str(out/f'02-reference-{frame}.png'),'-lavfi','ssim','-f','null','-']
 r=subprocess.run(compare,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40);assert r.returncode==0,r.stderr
 (out/f'02-ssim-{frame}.txt').write_text(r.stderr,encoding='utf-8')
 value=float(re.findall(r'All:([0-9.]+)',r.stderr)[-1])
 results.append({'frame':frame,'ssim':value,'threshold':.97,'status':'PASS' if value>=.97 else 'FAIL','decoded':decoded.name,'reference':f'02-reference-{frame}.png','decode_command':command,'compare_command':compare})
 summary={'status':'PASS' if all(x['status']=='PASS' for x in results) else 'FAIL','frames':results,'method':'FFmpeg-decoded actual H264 vs same-frame Standard engine output, SSIM >=0.97; includes pre-start hold, active trim, loop boundary and late hold.'}
 (out/'frame-comparison.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True))
if summary['status']!='PASS':raise SystemExit(1)
