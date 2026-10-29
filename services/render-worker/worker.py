#!/usr/bin/env python3
"""Playwright -> original R3F engine -> MP4, with PNG/FFmpeg fallback."""
import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def run(args, **kwargs):
    proc = subprocess.run(args, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, **kwargs)
    if proc.returncode:
        raise RuntimeError(f"{' '.join(map(str, args))}\n{proc.stderr[-2500:]}")
    return proc

def detect_browser():
    for candidate in [os.environ.get('CHROME_PATH'), shutil.which('chromium'), shutil.which('chromium-browser'), shutil.which('google-chrome'),
                      r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                      r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']:
        if candidate and Path(candidate).is_file():
            return candidate
    return None

def wait_for_server(url, process, limit=65):
    started = time.monotonic()
    while time.monotonic() - started < limit:
        if process.poll() is not None:
            raise RuntimeError('Vite stopped before it was ready. Run npm ci first.')
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(.3)
    raise RuntimeError('Timeout waiting for the local Vite development server')

def main():
    parser = argparse.ArgumentParser()
    for flag in ('shot', 'canvas', 'asset', 'output', 'job', 'quality'):
        parser.add_argument('--' + flag, required=True)
    a = parser.parse_args()
    shot = json.loads(a.shot)
    canvas = json.loads(a.canvas)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise RuntimeError('Run: python -m pip install playwright') from e
    source = Path(a.asset).resolve()
    out = Path(a.output).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    job_name = ''.join(c for c in a.job if c.isalnum() or c in ('-', '_'))[:64]
    public = ROOT / 'public' / '__automation__' / job_name
    public.mkdir(parents=True, exist_ok=True)
    ext = source.suffix.lower()
    if ext not in ('.mp4', '.webm', '.mov', '.mkv'):
        raise ValueError('MVP only supports local screen videos (.mp4/.webm/.mov/.mkv)')
    media = public / ('screen' + ext)
    offset = (shot.get('screenOffsetFrames') or 0) / canvas['fps']
    if offset or ext != '.mp4':
        media = public / 'screen.mp4'
        command = ['ffmpeg', '-y']
        if offset:
            command += ['-ss', str(offset)]
        command += ['-i', str(source), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(media)]
        run(command)
    else:
        shutil.copyfile(source, media)
    probe = run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height,codec_type:format=duration', '-of', 'json', str(media)])
    metadata = json.loads(probe.stdout)
    stream = next((s for s in metadata['streams'] if s['codec_type'] == 'video'), None)
    if not stream:
        raise RuntimeError('MEDIA_NOT_VIDEO')
    info = {'width': stream['width'], 'height': stream['height'], 'duration': float(metadata.get('format', {}).get('duration') or 1), 'kind': 'video'}
    public_url = f'/__automation__/{job_name}/{media.name}'
    compiled = run(['node', 'services/compiler/compile-cli.mjs'], input=json.dumps({'canvas': canvas, 'shot': shot, 'assetInfo': info, 'publicUrl': public_url}))
    project = json.loads(compiled.stdout)
    out.with_suffix('.project.json').write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding='utf8')
    port = int(os.environ.get('PROMO_PORT', '5178'))
    url = f'http://127.0.0.1:{port}/?automation=1'
    npm_command = 'npm.cmd' if os.name == 'nt' else 'npm'
    server = subprocess.Popen([npm_command, 'run', 'dev', '--', '--host', '127.0.0.1', '--port', str(port), '--strictPort'],
                              cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_for_server(url, server)
        with sync_playwright() as playwright:
            chrome_path = detect_browser()
            kwargs = {'headless': True, 'args': ['--no-sandbox', '--enable-webgl', '--use-gl=angle',
                       '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']}
            if chrome_path:
                kwargs['executable_path'] = chrome_path
            browser = playwright.chromium.launch(**kwargs)
            try:
                context = browser.new_context(accept_downloads=True, viewport={'width': min(canvas['width'], 1600),
                                                  'height': min(canvas['height'], 1200)}, device_scale_factor=1)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda exc: errors.append(str(exc)))
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_function('!!window.__PROMO_BRIDGE__', timeout=30000)
                result = page.evaluate('async p => await window.__PROMO_BRIDGE__.loadProject(p)', project)
                print(f'Model ready: {result}', flush=True)
                preview = page.evaluate('async () => await window.__PROMO_BRIDGE__.previewFrame(0)')
                out.with_suffix('.preview.png').write_bytes(base64.b64decode(preview.split(',', 1)[1]))
                try:
                    with page.expect_download(timeout=600000) as pending:
                        page.evaluate('async v => await window.__PROMO_BRIDGE__.renderDownload(v.name,v.quality)', {'name': out.name, 'quality': a.quality})
                    pending.value.save_as(str(out))
                except Exception as err:
                    print(f'MP4 encoder unavailable: {err}\nTrying PNG frame sequence fallback.', file=sys.stderr, flush=True)
                    archive = out.with_suffix('.frames.zip')
                    with page.expect_download(timeout=600000) as pending:
                        page.evaluate('async quality => await window.__PROMO_BRIDGE__.framesDownload("frames.zip", quality)', a.quality)
                    pending.value.save_as(str(archive))
                    frames = out.parent / (job_name + '-frames')
                    frames.mkdir(parents=True, exist_ok=True)
                    with zipfile.ZipFile(archive) as z:
                        for entry in z.infolist():
                            if not entry.filename.startswith('frame_') or not entry.filename.endswith('.png') or '/' in entry.filename or '..' in entry.filename:
                                raise RuntimeError('Unsafe PNG sequence name')
                        z.extractall(frames)
                    run(['ffmpeg', '-y', '-framerate', str(canvas['fps']), '-i', str(frames / 'frame_%04d.png'),
                         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)])
                if errors:
                    print('Browser errors: ' + '\n'.join(errors[-3:]), file=sys.stderr)
                context.close()
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=6)
        except subprocess.TimeoutExpired:
            server.kill()
        shutil.rmtree(public, ignore_errors=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'[WORKER_ERROR] {exc}', file=sys.stderr)
        sys.exit(1)
