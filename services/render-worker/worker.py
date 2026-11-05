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

def node_command():
    node = os.environ.get('NODE_BINARY') or shutil.which('node')
    if not node:
        raise RuntimeError('NODE_MISSING: install Node.js 22+')
    return node

def vite_command(port):
    # Invoke the JS entry point directly. Windows cannot Popen npm.cmd without
    # cmd.exe, which would re-interpret quotes and special characters.
    return [node_command(), str(ROOT / 'node_modules/vite/bin/vite.js'),
            '--host', '127.0.0.1', '--port', str(port), '--strictPort']

def extract_frames(archive, destination, count):
    expected = [f'frame_{i:04d}.png' for i in range(count)]
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if sorted(names) != sorted(expected) or any(x.file_size == 0 for x in z.infolist()):
            raise RuntimeError('INVALID_FRAME_SEQUENCE: expected consecutive nonempty frame_0000.png files')
        # A previous failed export must not leave extra frames in the new clip.
        shutil.rmtree(destination, ignore_errors=True)
        destination.mkdir(parents=True)
        z.extractall(destination)

def verify_output(file, canvas, count):
    result = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(file)]).stdout)
    video = next((s for s in result['streams'] if s['codec_type'] == 'video'), {})
    fps = video.get('avg_frame_rate', '0/1').split('/')
    rate = float(fps[0]) / max(1, float(fps[-1]))
    duration = float(result.get('format', {}).get('duration', 0))
    if (video.get('width') != canvas['width'] or video.get('height') != canvas['height'] or
            abs(rate - canvas['fps']) > .01 or abs(duration - count / canvas['fps']) > .15 or
            int(video.get('nb_frames', 0)) != count):
        raise RuntimeError('OUTPUT_SPEC_MISMATCH: ' + json.dumps(result))
    return result

def run(args, **kwargs):
    kwargs.setdefault('encoding', 'utf8')
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

def browser_options():
    options = {'headless': True, 'timeout': 30000, 'args': ['--no-sandbox', '--enable-webgl', '--use-gl=angle',
               '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']}
    chrome = detect_browser()
    if os.environ.get('CHROME_PATH') and chrome != os.environ['CHROME_PATH']:
        raise RuntimeError('CHROME_PATH does not point to an existing browser executable')
    if chrome:
        options['executable_path'] = chrome
    return options

def browser_doctor():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**browser_options())
        try:
            page = browser.new_page()
            supported = page.evaluate('!!document.createElement("canvas").getContext("webgl2")')
            print(json.dumps({'browser': browser.version, 'path': detect_browser() or 'Playwright managed', 'webgl2': supported}))
            if not supported:
                raise RuntimeError('WEBGL2_UNAVAILABLE')
        finally:
            browser.close()

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
    parser.add_argument('--doctor', action='store_true')
    parser.add_argument('--job-file')
    parser.add_argument('--force-png', action='store_true')
    parser.add_argument('--no-png-fallback', action='store_true')
    for flag in ('shot', 'canvas', 'asset', 'output', 'job', 'quality'):
        parser.add_argument('--' + flag)
    a = parser.parse_args()
    if a.doctor:
        browser_doctor()
        return
    if a.job_file:
        job = json.loads(Path(a.job_file).read_text(encoding='utf8'))
        for key in ('shot', 'canvas', 'asset', 'output', 'job', 'quality'):
            setattr(a, key, json.dumps(job[key]) if key in ('shot', 'canvas') else job[key])
        a.force_png = job.get('forcePng', a.force_png)
        a.no_png_fallback = not job.get('allowPngFallback', not a.no_png_fallback)
    if any(getattr(a, key) is None for key in ('shot', 'canvas', 'asset', 'output', 'job', 'quality')):
        parser.error('provide --job-file, or all six original job flags')
    shot = json.loads(a.shot)
    canvas = json.loads(a.canvas)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise RuntimeError('Run: python -m pip install playwright') from e
    source = Path(a.asset).resolve()
    if not source.is_file():
        raise RuntimeError(f'ASSET_MISSING: {source}')
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
    compiled = run([node_command(), 'services/compiler/compile-cli.mjs'], input=json.dumps({'canvas': canvas, 'shot': shot, 'assetInfo': info, 'publicUrl': public_url}))
    project = json.loads(compiled.stdout)
    out.with_suffix('.project.json').write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding='utf8')
    port = int(os.environ.get('PROMO_PORT', '5178'))
    url = f'http://127.0.0.1:{port}/?automation=1'
    diagnostics = {'status': 'RUNNING', 'shotId': shot['shotId'], 'frameCount': shot['durationFrames'], 'forcePng': a.force_png}
    temporary = out.with_name(out.stem + '.partial.mp4')
    server_log = out.with_suffix('.vite.log').open('w', encoding='utf8')
    server = subprocess.Popen(vite_command(port), cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
    try:
        wait_for_server(url, server)
        with sync_playwright() as playwright:
            chrome_path = detect_browser()
            browser = playwright.chromium.launch(**browser_options())
            diagnostics['browser'] = {'version': browser.version, 'path': chrome_path or 'Playwright managed Chromium'}
            try:
                context = browser.new_context(accept_downloads=True, viewport={'width': min(canvas['width'], 1600),
                                                  'height': min(canvas['height'], 1200)}, device_scale_factor=1)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda exc: errors.append(str(exc)))
                page.on('console', lambda msg: print(f'Browser {msg.type}: {msg.text}', flush=True) if msg.type == 'error' else None)
                page.on('requestfailed', lambda request: print(f'Request failed: {request.url}: {request.failure}', flush=True))
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_function('!!window.__PROMO_BRIDGE__', timeout=30000)
                result = page.evaluate('async p => await window.__PROMO_BRIDGE__.loadProject(p)', project)
                diagnostics['ready'] = result
                print(f'Model ready: {result}', flush=True)
                preview = page.evaluate('async () => await window.__PROMO_BRIDGE__.previewFrame(0)')
                out.with_suffix('.preview.png').write_bytes(base64.b64decode(preview.split(',', 1)[1]))
                try:
                    if a.force_png:
                        raise RuntimeError('PNG fallback explicitly requested for regression verification')
                    with page.expect_download(timeout=600000) as pending:
                        page.evaluate('async v => await window.__PROMO_BRIDGE__.renderDownload(v.name,v.quality)', {'name': out.name, 'quality': a.quality})
                    pending.value.save_as(str(temporary))
                    diagnostics['exportPath'] = 'webcodecs-mp4'
                except Exception as err:
                    if a.no_png_fallback:
                        raise
                    diagnostics['fallbackReason'] = str(err)
                    diagnostics['exportPath'] = 'png-ffmpeg'
                    print(f'MP4 encoder unavailable: {err}\nTrying PNG frame sequence fallback.', file=sys.stderr, flush=True)
                    archive = out.with_suffix('.frames.zip')
                    with page.expect_download(timeout=600000) as pending:
                        page.evaluate('async quality => await window.__PROMO_BRIDGE__.framesDownload("frames.zip", quality)', a.quality)
                    pending.value.save_as(str(archive))
                    frames = out.parent / (job_name + '-frames')
                    frames.mkdir(parents=True, exist_ok=True)
                    extract_frames(archive, frames, shot['durationFrames'])
                    run(['ffmpeg', '-y', '-framerate', str(canvas['fps']), '-start_number', '0', '-i', str(frames / 'frame_%04d.png'),
                         '-frames:v', str(shot['durationFrames']), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(temporary)])
                if errors:
                    raise RuntimeError('BROWSER_ERRORS: ' + '\n'.join(errors[-3:]))
                diagnostics['ffprobe'] = verify_output(temporary, canvas, shot['durationFrames'])
                temporary.replace(out)
                diagnostics['status'] = 'DONE'
                context.close()
            finally:
                browser.close()
    except Exception as exc:
        diagnostics['status'] = 'ERROR'
        diagnostics['error'] = str(exc)
        raise
    finally:
        out.with_suffix('.render.json').write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2), encoding='utf8')
        temporary.unlink(missing_ok=True)
        server.terminate()
        try:
            server.wait(timeout=6)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        server_log.close()
        shutil.rmtree(public, ignore_errors=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'[WORKER_ERROR] {exc}', file=sys.stderr)
        sys.exit(1)
