"""Record one authorized project validation command and its exit code."""
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import subprocess
import sys
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
label, *command = sys.argv[1:]
temp = Path(r'C:\Users\20153\Documents\ChatGPT\remotion\environment-probes\p10709-runtime-temp')
temp.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, TEMP=str(temp), TMP=str(temp), PYTHONIOENCODING='utf-8')
started = time.monotonic()
print('START ' + label, flush=True)
with (OUT / (label + '.txt')).open('w', encoding='utf-8') as log:
    run = subprocess.run(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
                         creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
result = {'date': datetime.now(timezone.utc).isoformat(), 'command': command, 'cwd': str(ROOT),
          'exitCode': run.returncode, 'seconds': round(time.monotonic() - started, 3),
          'log': label + '.txt', 'status': 'PASS' if run.returncode == 0 else 'FAIL'}
(OUT / (label + '.result.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result), flush=True)
sys.exit(run.returncode)
