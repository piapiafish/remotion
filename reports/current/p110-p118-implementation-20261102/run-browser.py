from pathlib import Path
from datetime import datetime,timezone
import os,json,subprocess,socket,time,sys,urllib.request
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
label=sys.argv[1] if len(sys.argv)>1 else 'browser'
folder=OUT/label;folder.mkdir(exist_ok=True)
temp=Path(r'C:\Users\20153\Documents\ChatGPT\remotion\environment-probes\p110-p118-runtime-temp');temp.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
url='http://127.0.0.1:'+str(port)
env=dict(os.environ,TEMP=str(temp),TMP=str(temp),STUDIO_URL=url,BEGINNER_OUT=str(folder))
server_command=[r'D:\Node.js\node.exe',str(ROOT/'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',str(port),'--strictPort']
command=[r'D:\Node.js\node.exe',sys.argv[2] if len(sys.argv)>2 else 'scripts/test-beginner-studio.cjs']
start=time.monotonic();result={'date':datetime.now(timezone.utc).isoformat(),'url':url,'serverCommand':server_command,'command':command,'status':'RUNNING'}
with (OUT/(label+'-server.txt')).open('w',encoding='utf-8') as log:
 server=subprocess.Popen(server_command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:
  for attempt in range(120):
   try:
    with urllib.request.urlopen(url,timeout=1):break
   except Exception:time.sleep(.25)
  else:raise RuntimeError('Vite did not start')
  with (OUT/(label+'.txt')).open('w',encoding='utf-8') as output:run=subprocess.run(command,cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
  result.update(exitCode=run.returncode,status='PASS' if run.returncode==0 else 'FAIL')
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  result.update(serverStopped=server.poll() is not None,seconds=round(time.monotonic()-start,3))
  (OUT/(label+'.result.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
  print(json.dumps(result),flush=True)
sys.exit(result.get('exitCode',1))
