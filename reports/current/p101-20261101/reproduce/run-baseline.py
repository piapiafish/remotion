import json, os, platform, subprocess, time
from pathlib import Path
audit=Path(__file__).parent
root=audit/'project'
out=audit/'evidence'/'baseline'
out.mkdir(exist_ok=True)
env={**os.environ,'TEMP':str(audit/'tmp'),'TMP':str(audit/'tmp'),'PYTHONDONTWRITEBYTECODE':'1','NO_COLOR':'1'}
commands=[('frontend-tests',['npm.cmd','test','--','--reporter=dot']),('build',['npm.cmd','run','build']),('lint',['npm.cmd','run','lint']),('agent-tests',['npm.cmd','run','agent:test'])]
results={'platform':platform.platform(),'source':r'D:\remotion\p0\MultiAgent-3D-Promo-Studio','executionRoot':str(root),'checks':[]}
for name,args in commands:
 print('START '+name,flush=True)
 started=time.monotonic()
 try:
  p=subprocess.run(args,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=240)
  output=p.stdout.decode('utf-8',errors='replace')
  code=p.returncode
 except subprocess.TimeoutExpired as e:
  output=(e.stdout or b'').decode('utf-8',errors='replace')+'\nAUDIT_COMMAND_TIMEOUT'
  code=None
 (out/(name+'.txt')).write_text(output,encoding='utf-8')
 item={'name':name,'command':' '.join(args),'exitCode':code,'status':'PASS' if code==0 else 'FAIL','seconds':round(time.monotonic()-started,2),'log':str((out/(name+'.txt')).relative_to(audit))}
 results['checks'].append(item)
 (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
 print(json.dumps(item),flush=True)
print(json.dumps({'status':'BASELINE_FINISHED','results':results}),flush=True)

