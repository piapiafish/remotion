import json, os, subprocess, time
from pathlib import Path
audit=Path(__file__).parent
out=audit/'evidence'/'browser-probe'
out.mkdir(exist_ok=True)
logpath=out/'launch.txt'
env={**os.environ,'TEMP':str(audit/'tmp'),'TMP':str(audit/'tmp'),'PYTHONDONTWRITEBYTECODE':'1'}
args=[r'D:\remotion\p0\MultiAgent-3D-Promo-Studio\.venv\Scripts\python.exe','-B',str(audit/'probe-browser.py')]
with logpath.open('wb') as log:
 p=subprocess.Popen(args,env=env,cwd=audit,stdout=log,stderr=subprocess.STDOUT)
 print(json.dumps({'status':'STARTED','pid':p.pid}),flush=True)
 try:
  code=p.wait(timeout=55)
  outcome={'status':'COMPLETED','exitCode':code}
 except subprocess.TimeoutExpired:
  stopped=subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],capture_output=True)
  outcome={'status':'ENVIRONMENT_BLOCKED','reason':'Browser/Playwright probe exceeded 55 seconds before completing','cleanupExitCode':stopped.returncode,'exitCode':None}
 (out/'supervisor.json').write_text(json.dumps(outcome,indent=2),encoding='utf-8')
print(json.dumps({'outcome':outcome,'log':logpath.read_text(encoding='utf-8',errors='replace')},ensure_ascii=True),flush=True)

