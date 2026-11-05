#!/usr/bin/env python3
"""Real browser import -> saved storyboard -> CLI -> Remotion -> downloaded MP4.

Requires the existing root/Remotion npm dependencies and render-worker Python
requirements. Uses PYTHON/CHROME_PATH exactly like the existing worker.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import runpy
import socket
import subprocess
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORKER = runpy.run_path(str(ROOT / 'services/render-worker/worker.py'), run_name='agent_flow_worker')


class LocalServer:
    def __init__(self, output):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.url = f'http://127.0.0.1:{self.port}'
        self.output = output
        self.process = None
        self.log = None

    def start(self):
        self.log = (self.output / 'vite.log').open('a', encoding='utf-8')
        self.process = subprocess.Popen(WORKER['vite_command'](self.port), cwd=ROOT,
                                        stdout=self.log, stderr=subprocess.STDOUT)
        WORKER['wait_for_server'](self.url + '/__studio__/capabilities', self.process)

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        if self.log:
            self.log.close()


def record(report, label, **details):
    report['checks'].append({'name': label, 'status': 'PASS', **details})
    print(f'[PASS] {label}', flush=True)


def open_panel(page, url):
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.locator('.motion-legacy summary').click()


def import_text(page, text):
    page.get_by_label('AI 分镜方案', exact=True).fill(text)
    with page.expect_response(lambda response: response.url.endswith('/__studio__/storyboards') and response.request.method == 'POST') as pending:
        page.get_by_role('button', name='导入并自动保存', exact=True).click()
    return pending.value


def get_session(page, server, session_id):
    response = page.request.get(f'{server.url}/__studio__/storyboards/{session_id}')
    assert response.ok, response.text()
    return response.json()


def wait_render(page, server, session_id, timeout, refresh=False):
    started = time.monotonic()
    last = None
    refreshed = False
    while time.monotonic() - started < timeout:
        session = get_session(page, server, session_id)
        stage = (session['status'], session['progress']['done'], session['progress']['composing'])
        if stage != last:
            print('[RENDER]', stage, flush=True)
            last = stage
        if session['status'] == 'ERROR':
            raise AssertionError(json.dumps(session, ensure_ascii=False))
        if session['status'] == 'DONE':
            return session
        if refresh and not refreshed and time.monotonic() - started > 2:
            open_panel(page, server.url)
            page.locator('.agent-saved').wait_for()
            assert page.evaluate('localStorage.getItem("promo-studio:last-storyboard")') == session_id
            refreshed = True
        page.wait_for_timeout(1000)
    raise AssertionError(f'Render timed out after {timeout}s: {session_id}')


def verify(page, server, output, report, timeout):
    open_panel(page, server.url)
    response = import_text(page, '这是一段给 AI 的提示词，并不是分镜 JSON。')
    assert response.status == 422
    page.get_by_role('alert').filter(has_text='未找到 Video DSL').wait_for()
    record(report, 'invalid AI content is rejected in the page')

    page.get_by_text('没有分镜？生成离线方案', exact=True).click()
    page.get_by_label('产品宣传重点', exact=True).fill('智能分析；自动规划；精彩呈现')
    with page.expect_response(lambda response: response.url.endswith('/__studio__/plans')) as pending:
        page.get_by_role('button', name='生成并保存 15 秒方案', exact=True).click()
    planned = pending.value.json()
    assert pending.value.status == 201
    assert planned['summary']['seconds'] == 15 and len(planned['summary']['shots']) == 3
    assert planned['summary']['width'] == 540 and planned['summary']['height'] == 960
    saved = ROOT / planned['path']
    assert json.loads(saved.read_text(encoding='utf-8')) == planned['storyboard']
    record(report, 'offline planner automatically writes validated storyboard', path=planned['path'])

    with page.expect_download() as pending:
        page.get_by_role('link', name='下载已保存的 JSON', exact=True).click()
    json_file = output / 'downloaded-storyboard.json'
    pending.value.save_as(str(json_file))
    assert json.loads(json_file.read_text(encoding='utf-8')) == planned['storyboard']
    record(report, 'saved JSON downloads correctly')

    with page.expect_response(lambda response: response.url.endswith('/__studio__/storyboards') and response.request.method == 'POST') as pending:
        page.locator('#storyboard-json-file').set_input_files(str(json_file))
    imported_file = pending.value.json()
    assert pending.value.status == 201 and imported_file['id'] != planned['id']
    assert json.loads(saved.read_text(encoding='utf-8')) == planned['storyboard']
    record(report, 'JSON file imports automatically without overwriting earlier work')

    invalid = json.loads(json.dumps(planned['storyboard']))
    invalid['shots'][0]['deviceId'] = 'invented-device'
    assert import_text(page, json.dumps(invalid)).status == 422
    page.get_by_role('alert').filter(has_text='deviceId').wait_for()
    invalid = json.loads(json.dumps(planned['storyboard']))
    invalid['assets'][0]['uri'] = 'assets/does-not-exist.mp4'
    assert import_text(page, json.dumps(invalid)).status == 422
    page.get_by_role('alert').filter(has_text='does-not-exist.mp4').wait_for()
    record(report, 'illegal device and missing asset have readable page errors')

    value = planned['storyboard']
    value['overlays'][0]['text'] = 'AI 方案自动导入'
    source = '这是设计好的宣传片方案：\n```json\n' + json.dumps(value, ensure_ascii=False, indent=2) + '\n```\n可按这份方案生成。'
    response = import_text(page, source)
    assert response.status == 201
    imported = response.json()
    session_id = imported['id']
    report['sessionId'] = session_id
    assert json.loads((ROOT / imported['path']).read_text(encoding='utf-8')) == value
    record(report, 'AI prose plus fenced JSON imports, validates and saves', path=imported['path'])

    open_panel(page, server.url)
    page.locator('.agent-saved').wait_for()
    assert page.evaluate('localStorage.getItem("promo-studio:last-storyboard")') == session_id
    record(report, 'refresh restores the saved storyboard')

    with page.expect_response(lambda response: response.url.endswith(f'/storyboards/{session_id}/render')) as pending:
        page.get_by_role('button', name='生成已保存方案的视频', exact=True).click()
    assert pending.value.status == 202
    completed = wait_render(page, server, session_id, timeout, refresh=True)
    assert completed['renderReport']['status'] == 'DONE'
    assert completed['renderReport']['compositor'] == 'remotion'
    assert len(completed['renderReport']['jobs']) == 3
    assert all(job['status'] == 'DONE' for job in completed['renderReport']['jobs'])
    record(report, 'page-triggered real three-shot rendering and Remotion composition pass', renderReport=completed['renderReport'])

    page.get_by_role('link', name='下载 final.mp4', exact=True).wait_for(timeout=20000)
    video = page.locator('.agent-video')
    video.scroll_into_view_if_needed()
    page.wait_for_function('document.querySelector(".agent-video")?.readyState >= 1')
    playback = video.evaluate('async el => { el.muted=true; await el.play(); await new Promise(r=>setTimeout(r,600)); el.pause(); return {time:el.currentTime,duration:el.duration,width:el.videoWidth,height:el.videoHeight}; }')
    assert playback['time'] > 0 and abs(playback['duration'] - 15) < .15
    assert playback['width'] == 540 and playback['height'] == 960
    video.evaluate('el => { el.currentTime=11; }')
    page.wait_for_function('Math.abs(document.querySelector(".agent-video").currentTime-11)<.05 && !document.querySelector(".agent-video").seeking')
    record(report, 'final MP4 plays in the panel and seeks', **playback)
    page.screenshot(path=str(output / 'completed-page.png'))

    with page.expect_download() as pending:
        page.get_by_role('link', name='下载 final.mp4', exact=True).click()
    video_file = output / 'Agent-Flow-Test.mp4'
    pending.value.save_as(str(video_file))
    final = WORKER['verify_output'](video_file, {'width':540,'height':960,'fps':30}, 450)
    assert any(stream['codec_type'] == 'audio' for stream in final['streams'])
    subprocess.run(['ffmpeg','-v','error','-i',str(video_file),'-f','null','-'], check=True, capture_output=True)
    report['ffprobe'] = final
    report['videoSHA256'] = hashlib.sha256(video_file.read_bytes()).hexdigest()
    record(report, 'downloaded video passes FFprobe and full decoding', bytes=video_file.stat().st_size)
    partial = page.request.get(server.url + completed['videoUrl'], headers={'Range':'bytes=0-1023'})
    assert partial.status == 206 and len(partial.body()) == 1024
    record(report, 'video range requests support browser seeking')

    with page.expect_response(lambda response: response.url.endswith(f'/storyboards/{session_id}/render')):
        page.get_by_role('button', name='重新生成视频（复用缓存）', exact=True).click()
    cached = wait_render(page, server, session_id, timeout)
    assert all(job['status'] == 'CACHED' for job in cached['renderReport']['jobs'])
    record(report, 'repeated page rendering reuses all three shot caches', renderReport=cached['renderReport'])

    server.stop()
    server.start()
    open_panel(page, server.url)
    page.get_by_role('link', name='下载 final.mp4', exact=True).wait_for(timeout=20000)
    restored = get_session(page, server, session_id)
    assert restored['status'] == 'DONE' and restored['videoUrl']
    record(report, 'server restart restores completed work and download access')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default=str(ROOT / 'output/agent-flow-test'))
    parser.add_argument('--timeout', type=int, default=1200)
    args = parser.parse_args()
    output = Path(args.out).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {'status':'RUNNING','checks':[]}
    server = LocalServer(output)
    try:
        server.start()
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(**WORKER['browser_options']())
            try:
                context = browser.new_context(viewport={'width':1440,'height':960},accept_downloads=True)
                page = context.new_page()
                errors = []
                page.on('pageerror',lambda error:errors.append(str(error)))
                report['browser'] = browser.version
                try:
                    verify(page, server, output, report, args.timeout)
                    assert not errors, errors
                    record(report, 'no browser page errors')
                except Exception:
                    page.screenshot(path=str(output / 'failure-page.png'))
                    report['pageErrors'] = errors
                    raise
            finally:
                browser.close()
        report['status'] = 'PASS'
    except Exception as error:
        report['status'] = 'FAIL'
        report['error'] = str(error)
        raise
    finally:
        server.stop()
        (output / 'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    main()
