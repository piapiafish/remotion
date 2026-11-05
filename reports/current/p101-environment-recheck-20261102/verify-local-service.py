"""Recheck P1-01's blocked Python driver and real localhost Vite/API path."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import runpy
import socket
import subprocess
import sys
import traceback
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
WORKER = runpy.run_path(str(ROOT / 'services/render-worker/worker.py'), run_name='env_recheck_worker')
report = {'date': datetime.now(timezone.utc).isoformat(), 'platform': platform.platform(),
          'method': 'Python Playwright and actual Vite HTTP/TCP, without request interception or offline route fulfillment.',
          'checks': [], 'pageErrors': [], 'httpErrors': [], 'status': 'RUNNING', 'commands': []}


def write():
    (OUT / 'local-service.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


def check(name, condition, **details):
    report['checks'].append({'name': name, 'status': 'PASS' if condition else 'FAIL', **details})
    write()
    print(('PASS: ' if condition else 'FAIL: ') + name, flush=True)
    if not condition:
        raise AssertionError(name)


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else None


def start(port, name):
    command = WORKER['vite_command'](port)
    report['commands'].append({'command': command, 'cwd': str(ROOT), 'log': name})
    stream = (OUT / name).open('w', encoding='utf-8')
    process = subprocess.Popen(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    stream.close()
    return process


def stop(process):
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


server = None
default_board = ROOT / 'work/storyboard.json'
default_before = digest(default_board)
try:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    url = base + '/?automation=1'
    report['baseUrl'] = base
    server = start(port, 'vite-start.txt')
    WORKER['wait_for_server'](url, server, limit=45)
    with urllib.request.urlopen(base + '/__studio__/capabilities', timeout=10) as response:
        capabilities = json.load(response)
    check('real Vite HTTP and studio API capabilities respond', capabilities.get('ok') is True,
          capabilities=capabilities)

    print('PYTHON_PLAYWRIGHT_DRIVER_STARTING', flush=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        print('PYTHON_PLAYWRIGHT_DRIVER_READY', flush=True)
        browser = playwright.chromium.launch(**WORKER['browser_options']())
        report['browser'] = browser.version
        try:
            context = browser.new_context(viewport={'width': 1440, 'height': 960}, accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(20000)
            page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
            page.on('response', lambda response: report['httpErrors'].append({'status': response.status, 'url': response.url})
                    if response.status >= 400 and '/__studio__/' not in response.url else None)
            navigation = page.goto(url, wait_until='networkidle', timeout=60000)
            check('Python Playwright loads editor through real localhost TCP', navigation.status == 200)
            page.get_by_role('button', name='Movie', exact=True).click()
            page.locator('.device-open').click()
            page.get_by_role('button', name='iPhone 17 Pro', exact=True).click()
            ready = page.evaluate('() => window.__PROMO_BRIDGE__.waitForReady(45000)')
            check('real GLB, decoder and WebGL scene become ready over HTTP', ready.get('ready') is True,
                  ready=ready)

            board = {'schemaVersion': '0.1.0', 'canvas': {'width': 540, 'height': 960, 'fps': 30},
                     'assets': [{'id': 'screen', 'kind': 'video', 'uri': 'assets/demo.mp4'}],
                     'shots': [{'shotId': 'p101-network-recheck', 'deviceId': 'iphone-17-pro',
                                'screenAssetId': 'screen', 'durationFrames': 30, 'template': 'hero-straight',
                                'motion': 'none', 'screenFit': 'contain', 'screenOffsetFrames': 0,
                                'background': '#0b1020'}], 'overlays': [], 'audio': []}
            page.locator('.motion-legacy summary').click()
            page.get_by_label('AI 分镜方案', exact=True).fill(json.dumps(board, ensure_ascii=False))
            with page.expect_response(lambda r: r.url.endswith('/__studio__/storyboards')
                                      and r.request.method == 'POST') as pending:
                page.get_by_role('button', name='导入并自动保存', exact=True).click()
            saved_response = pending.value
            saved = saved_response.json()
            check('page imports JSON and saves through the real Vite studio plugin',
                  saved_response.status == 201 and saved.get('status') == 'READY')
            board_path = (ROOT / saved['path']).resolve()
            check('saved independent storyboard bytes match submitted JSON',
                  board_path.is_relative_to((ROOT / 'work/studio').resolve())
                  and json.loads(board_path.read_text(encoding='utf-8')) == board)
            report['savedSession'] = {'id': saved['id'], 'path': saved['path'], 'outputPath': saved['outputPath'],
                                      'status': saved['status']}

            with page.expect_download() as pending_download:
                page.get_by_role('link', name='下载已保存的 JSON', exact=True).click()
            downloaded = OUT / 'downloaded-storyboard.json'
            pending_download.value.save_as(str(downloaded))
            check('browser downloads matching JSON over HTTP',
                  json.loads(downloaded.read_text(encoding='utf-8-sig')) == board)
            rejected = page.request.get(base + '/__studio__/capabilities', headers={'Origin': 'https://other.example'})
            check('real TCP API continues to reject foreign origins', rejected.status == 403)

            page.screenshot(path=str(OUT / 'editor-real-tcp.png'))
            # Keep browser storage but close the page before restarting Vite.
            # Its HMR reconnect can otherwise race an explicit page.reload().
            page.close()
            stop(server)
            server = start(port, 'vite-restart.txt')
            WORKER['wait_for_server'](url, server, limit=45)
            page = context.new_page()
            page.set_default_timeout(20000)
            page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
            page.on('response', lambda response: report['httpErrors'].append({'status': response.status, 'url': response.url})
                    if response.status >= 400 and '/__studio__/' not in response.url else None)
            page.goto(url, wait_until='networkidle', timeout=60000)
            page.locator('.motion-legacy summary').click()
            page.locator('.agent-saved').wait_for(timeout=30000)
            recovered = page.request.get(base + f"/__studio__/storyboards/{saved['id']}")
            recovered_json = recovered.json()
            check('Vite restart restores disk-saved plan and page selection', recovered.status == 200
                  and recovered_json.get('id') == saved['id'] and recovered_json.get('status') == 'READY'
                  and page.evaluate('localStorage.getItem("promo-studio:last-storyboard")') == saved['id'])
            check('no unhandled browser errors or missing HTTP resources',
                  not report['pageErrors'] and not report['httpErrors'])
            context.close()
        finally:
            browser.close()
    check('existing default storyboard remains unchanged', digest(default_board) == default_before)
    report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    report['traceback'] = traceback.format_exc()
    print(report['traceback'], flush=True)
finally:
    stop(server)
    report['serverStopped'] = server is None or server.poll() is not None
    write()
    print(json.dumps({'status': report['status'], 'checks': len(report['checks']),
                      'serverStopped': report['serverStopped']}), flush=True)
sys.exit(0 if report['status'] == 'PASS' else 1)
