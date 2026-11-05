#!/usr/bin/env python3
"""Windows/browser proof: motion JSON -> actual GLB pose, filmstrip, scrubbing and save/reopen."""
import argparse
import json
import math
from pathlib import Path
import platform
import runpy

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TIMELINE = runpy.run_path(str(ROOT / 'scripts/test-timeline-ui.py'), run_name='timeline_helpers')
WORKER = TIMELINE['WORKER']


def pose(page):
    return page.evaluate('''() => {
      let group;
      window.__mockup?.scene.traverse(obj => { if (obj.userData.deviceIndex === 0) group = obj; });
      return group && { position: group.position.toArray(), rotation: group.rotation.toArray().slice(0,3), scale: group.scale.x };
    }''')


def verify(page, output, checks):
    def record(name):
        checks.append(name)
        print('PASS:', name, flush=True)

    page.get_by_role('button', name='生成运动计划并应用', exact=True).wait_for()
    assert page.locator('.panel .section').first.locator('.section-title').inner_text() == 'AI 导演 · 手机运动计划'
    assert not page.locator('.motion-import').evaluate('el => el.open')
    assert page.locator('#agent-media').count() == 0
    page.get_by_role('button', name='生成运动计划并应用', exact=True).click()
    page.locator('.has-motion-plan').wait_for()
    page.wait_for_function('document.querySelectorAll(".motion-frame img").length === 16', timeout=90000)
    record('primary mock generator applies 16 keyframes / 15 seconds without screen media')
    page.locator('.motion-json summary').click()
    plan = json.loads(page.locator('.motion-json pre').inner_text())
    assert plan['schema'] == 'phone-motion/1' and len(plan['keyframes']) == 16
    page.locator('.motion-json summary').click()
    page.evaluate('''() => { window.__mockup.scene.traverse(obj => {
      if (obj.material?.uniforms?.map?.value?.isVideoTexture) throw Error('unexpected screen video');
    }); }''')

    for t in (0, 3, 6, 8, 12, 15):
        frame = page.locator(f'.motion-frame[data-time="{t}"]')
        frame.click()
        page.wait_for_timeout(100)
        actual = pose(page)
        expected = plan['keyframes'][t]
        assert all(abs(a-b) < .001 for a, b in zip(actual['position'], expected['position'])), actual
        assert all(abs(a-b*math.pi/180) < .001 for a, b in zip(actual['rotation'], expected['rotationDeg'])), actual
        assert abs(actual['scale'] - expected['scale']) < .001
        assert page.locator('.time-now').inner_text() == f'{t:.2f}s'
        assert expected['description'] in page.locator('.motion-now').inner_text()
    record('clicking every representative thumbnail drives the actual phone to its JSON pose including 360 degrees')

    urls = page.locator('.motion-frame img').evaluate_all('els => els.map(el => el.src)')
    assert len(set(urls)) >= 10
    visible_pixels = page.locator('.motion-frame img').first.evaluate('''img => {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0; for(let i=3;i<pixels.length;i+=4) if(pixels[i]>20) count++;
      return count;
    }''')
    assert visible_pixels > 100, visible_pixels
    # Catch a first-thumbnail race with GLB loading / screen-material effects.
    comparison = page.evaluate('''async () => {
      const { renderMotionThumbnails } = await import('/src/ui/Timeline/motionThumbnails.ts');
      const { useProjectStore } = await import('/src/store/project.ts');
      const original = document.querySelector('.motion-frame[data-time="0"] img').src;
      const repeated = await new Promise((resolve, reject) => renderMotionThumbnails(
        useProjectStore.getState().project, [0], (_, url) => resolve(url), () => reject(Error('capture failed'))));
      return { original, repeated };
    }''')
    assert comparison['original'] == comparison['repeated'], 'first thumbnail captured an unready model'
    record('filmstrip contains actual nonempty GLB renders at different times')

    page.locator('.motion-frame[data-time="0"]').click()
    page.get_by_role('button', name='从头预览手机运动', exact=True).click()
    page.wait_for_timeout(700)
    page.get_by_role('button', name='Pause', exact=True).click()
    assert pose(page)['position'][0] > plan['keyframes'][0]['position'][0]
    record('playback interpolates the imported tracks')
    # Start near the end through the public timeline, avoiding a 15-second test wait.
    page.get_by_role('slider', name='Timeline playhead', exact=True).focus()
    page.keyboard.press('End')
    for _ in range(6):
        page.keyboard.press('ArrowLeft')
    page.get_by_role('button', name='Play', exact=True).click()
    page.get_by_role('button', name='Play', exact=True).wait_for(timeout=5000)
    assert page.locator('.time-now').inner_text() == '15.00s'
    assert abs(pose(page)['rotation'][1] - 2 * math.pi) < .001
    page.wait_for_timeout(200)
    assert page.locator('.time-now').inner_text() == '15.00s'
    record('AI motion stops at the final pose instead of jumping back to the entry pose')
    page.locator('.motion-frame[data-time="3"]').click()
    page.screenshot(path=str(output / 'motion-plan-desktop.png'))

    # Exercise sparse and subsecond plans, not just the built-in one-second demo.
    plan['duration'] = 3
    plan['title'] = '自定义 JSON 轨迹'
    plan['keyframes'] = [plan['keyframes'][i] for i in (0, 3, 8)]
    for key, t in zip(plan['keyframes'], (0, 1.25, 3)):
        key['t'] = t
        key['ease'] = 'linear'
    plan['keyframes'][1]['position'] = [.6, .1, 0]
    plan['keyframes'][1]['rotationDeg'] = [0, 90, 0]
    plan['keyframes'][1]['description'] = '在 1.25 秒到达右侧，侧面朝向镜头'
    page.locator('.motion-import summary').click()
    page.locator('#agent-source').fill('AI 运动规划：\n```json\n' + json.dumps(plan, ensure_ascii=False) + '\n```')
    page.get_by_role('button', name='应用 JSON 到主画布', exact=True).click()
    key = page.get_by_role('button', name='Device keyframe 1.25s', exact=True)
    key.click()
    page.wait_for_timeout(100)
    actual = pose(page)
    assert abs(actual['position'][0] - .6) < .001 and abs(actual['rotation'][1] - math.pi/2) < .001, actual
    page.wait_for_function('document.querySelectorAll(".motion-frame img").length === 4', timeout=60000)
    page.locator('.motion-frame[data-time="2"]').click()
    page.wait_for_timeout(100)
    assert 90 < pose(page)['rotation'][1] * 180/math.pi < 180
    record('pasted AI JSON supports fractional keyframes and interpolated per-second pictures')

    frame = page.locator('.motion-frame[data-time="2"]')
    frame.locator('img').wait_for()
    before = pose(page)
    page.locator('#agent-source').fill('{"schema":"phone-motion/1","keyframes":[]}')
    page.get_by_role('button', name='应用 JSON 到主画布', exact=True).click()
    page.get_by_role('alert').wait_for()
    assert pose(page) == before
    assert page.locator('.time-duration').input_value() == '3'
    record('invalid JSON leaves the live scene and timeline intact')

    path = output / 'custom-motion.json'
    path.write_text(json.dumps(plan, ensure_ascii=False), encoding='utf-8')
    page.locator('#agent-json-file').set_input_files(str(path))
    page.get_by_role('alert').wait_for(state='hidden')
    assert page.locator('.time-now').inner_text() == '0.00s'
    record('local JSON file import uses the same canvas compiler')

    with page.expect_download() as download:
        page.get_by_title('Save .mockup (⌘S)', exact=True).click()
    saved = output / 'motion-project.mockup'
    download.value.save_as(str(saved))
    page.reload()
    page.locator('.topbar input[type=file]').set_input_files(str(saved))
    page.get_by_role('button', name='Movie', exact=True).click()
    page.locator('.motion-frame[data-time="3"]').click()
    page.wait_for_timeout(150)
    assert abs(pose(page)['rotation'][1] - math.pi) < .001
    assert '背部朝向镜头' in page.locator('.motion-now').inner_text()
    record('.mockup save/reopen preserves executable tracks and plan annotations')
    page.get_by_role('button', name='Image', exact=True).click()
    page.get_by_role('button', name='Movie', exact=True).click()
    page.get_by_role('button', name='生成运动计划并应用', exact=True).click()
    page.get_by_title('Undo (⌘Z)', exact=True).click()
    assert page.locator('.time-duration').input_value() == '3'
    page.get_by_title('Redo (⇧⌘Z)', exact=True).click()
    assert page.locator('.time-duration').input_value() == '15'
    record('generation is one undo/redo operation')

    page.set_viewport_size({'width':1024,'height':768})
    page.wait_for_timeout(400)
    page.locator('.motion-frame[data-time="8"]').click()
    page.wait_for_function('document.querySelectorAll(".motion-frame img").length === 16', timeout=90000)
    page.screenshot(path=str(output / 'motion-plan-compact.png'))
    assert page.locator('.artboard').bounding_box()['height'] > 150
    assert page.locator('.motion-frame[data-time="8"]').is_visible()
    record('compact Windows viewport retains a usable canvas and scrollable timeline')

    # Clear during playback, then ensure no delayed thumbnail work or motion survives.
    page.get_by_role('button', name='从头预览手机运动', exact=True).click()
    page.get_by_role('button', name='一键清除 AI 动画', exact=True).click()
    page.wait_for_timeout(200)
    assert page.locator('.motion-frame').count() == 0
    assert page.locator('.keyframe').count() == 0
    assert page.locator('.motion-json').count() == 0
    assert page.locator('.time-now').inner_text() == '0.00s'
    assert page.get_by_role('button', name='一键清除 AI 动画', exact=True).is_disabled()
    static = pose(page)
    assert static == {'position': [0, 0, 0], 'rotation': [0, 0, 0], 'scale': 1}, static
    page.wait_for_timeout(300)
    assert pose(page) == static
    record('one-click clear removes AI keys/filmstrip, stops playback and centres the existing phone')
    page.screenshot(path=str(output / 'motion-cleared-compact.png'))
    page.get_by_title('Undo (⌘Z)', exact=True).click()
    assert page.locator('.motion-frame').count() == 16
    assert not page.get_by_role('button', name='一键清除 AI 动画', exact=True).is_disabled()
    page.get_by_title('Redo (⇧⌘Z)', exact=True).click()
    assert page.locator('.motion-frame').count() == 0
    record('cleared AI motion can be undone and redone')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default=str(ROOT / 'output/motion-plan-test'))
    args = parser.parse_args()
    output = Path(args.out).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {'platform': platform.platform(), 'checks': [], 'status': 'RUNNING'}
    errors = []
    try:
        with TIMELINE['serve'](None, output) as url, sync_playwright() as playwright:
            browser = playwright.chromium.launch(**WORKER['browser_options']())
            report['browser'] = browser.version
            try:
                page = browser.new_page(viewport={'width':1440,'height':960}, accept_downloads=True)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(url)
                try:
                    verify(page, output, report['checks'])
                    assert not errors, errors
                    report['status'] = 'PASS'
                except Exception:
                    page.screenshot(path=str(output / 'failure-page.png'))
                    raise
            finally:
                browser.close()
    except Exception as error:
        report['status'] = 'FAIL'
        report['error'] = str(error)
        raise
    finally:
        report['pageErrors'] = errors
        (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
