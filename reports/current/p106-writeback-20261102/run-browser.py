"""Run the media/project acceptance suite through an owned real Vite server."""
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
env = dict(os.environ)
temp = Path(r'C:\Users\20153\Documents\ChatGPT\remotion\environment-probes\p106-runtime-temp')
temp.mkdir(parents=True, exist_ok=True)
label = 'browser-extra' if os.environ.get('P106_EXTRA_CASES') else 'browser'
env.update(TEMP=str(temp), TMP=str(temp), P106_AUDIT_ROOT=str(OUT / label))
if os.environ.get('P106_EXTRA_CASES'):
    env['CASES'] = os.environ['P106_EXTRA_CASES']
summary = {'date': datetime.now(timezone.utc).isoformat(), 'status': 'INCOMPLETE', 'commands': []}
server = None
started = time.monotonic()
try:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    env['P106_BASE_URL'] = base
    command = [shutil.which('node'), str(ROOT / 'node_modules/vite/bin/vite.js'),
               '--host', '127.0.0.1', '--port', str(port), '--strictPort']
    summary['commands'].append(command)
    with (OUT / (label + '-vite.txt')).open('w', encoding='utf-8') as log:
        server = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
                                  creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    deadline = time.monotonic() + 45
    while True:
        try:
            with urllib.request.urlopen(base + '/__studio__/capabilities', timeout=2) as response:
                capabilities = json.load(response)
            assert capabilities.get('ok') is True
            break
        except Exception:
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Vite did not become ready')
            time.sleep(.2)
    summary.update(baseUrl=base, capabilities=capabilities)
    command = [shutil.which('node'), 'scripts/test-media-project.cjs']
    summary['commands'].append(command)
    with (OUT / (label + '.txt')).open('w', encoding='utf-8') as log:
        process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, encoding='utf-8',
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        for line in process.stdout:
            log.write(line); log.flush()
            print(line, end='', flush=True)
        code = process.wait()
    summary.update(exitCode=code, status='PASS' if code == 0 else 'FAIL')
except Exception as error:
    summary['error'] = str(error)
finally:
    if server is not None and server.poll() is None:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill(); server.wait(timeout=5)
    summary.update(serverStopped=server is None or server.poll() is not None,
                   seconds=round(time.monotonic() - started, 3))
    (OUT / (label + '.result.json')).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(summary, ensure_ascii=True), flush=True)
sys.exit(0 if summary['status'] == 'PASS' else 1)
