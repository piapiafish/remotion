#!/usr/bin/env python3
"""Exercise the real editor with mouse/touch input, GLB and demo video.

Uses the existing worker's Node/browser configuration. Starts an isolated
local Vite server unless --url is supplied. No npm dependency changes needed.
"""
import argparse
from contextlib import contextmanager
import json
import math
import platform
from pathlib import Path
import runpy
import socket
import subprocess
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORKER = runpy.run_path(str(ROOT / 'services/render-worker/worker.py'), run_name='ui_test_worker')


@contextmanager
def serve(url, output):
    if url:
        yield url
        return
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}/?automation=1'
    with (output / 'vite.log').open('w', encoding='utf-8') as log:
        server = subprocess.Popen(WORKER['vite_command'](port), cwd=ROOT,
                                  stdout=log, stderr=subprocess.STDOUT)
        try:
            WORKER['wait_for_server'](url, server)
            yield url
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)


def record(report, name, **details):
    report['checks'].append({'name': name, 'status': 'PASS', **details})
    print(f'[PASS] {name}', flush=True)


def geometry(page):
    ruler = page.locator('.ruler').bounding_box()
    lane = page.locator('.track-lane').first.bounding_box()
    assert ruler and lane, 'Timeline is not visible'
    return ruler, lane['y'] + lane['height'] / 2


def expect_time(page, expected):
    page.wait_for_function('''expected => {
      const text = document.querySelector('.time-now')?.textContent;
      return Math.abs(parseFloat(text) - expected) <= .011;
    }''', arg=expected, timeout=5000)
    return float(page.locator('.time-now').inner_text().removesuffix('s'))


def click_time(page, fraction, duration=4, ruler=False):
    box, y = geometry(page)
    x = box['x'] + min(box['width'] - .5, max(.5, fraction * box['width']))
    if ruler:
        y = box['y'] + box['height'] / 2
    page.mouse.click(x, y)
    expected = (x - box['x']) / box['width'] * duration
    actual = expect_time(page, expected)
    line = page.locator('.playhead').bounding_box()
    offset = line['x'] - x
    assert abs(offset) < 1, f'Playhead is {offset:.2f}px away from click'
    return {'expectedTime': expected, 'actualTime': actual, 'offsetPixels': offset}


def scene_state(page):
    return page.evaluate('''() => {
      let device = null, video = null;
      window.__mockup?.scene.traverse(object => {
        if (object.userData.deviceIndex === 0) device = object;
        const map = object.material?.uniforms?.map?.value;
        if (map?.isVideoTexture) video = {
          currentTime: map.image.currentTime, paused: map.image.paused,
          readyState: map.image.readyState, videoWidth: map.image.videoWidth
        };
      });
      return {rotationY: device?.rotation.y, video};
    }''')


def verify(page, report, output, suffix):
    page.get_by_role('button', name='Movie', exact=True).click()
    page.get_by_role('combobox', name='Add animation', exact=True).select_option('spin-y-360')
    assert page.locator('.keyframe').count() >= 2
    record(report, f'{suffix}: preset still generates keyframes')

    samples = [click_time(page, fraction) for fraction in (0, .1, .5, .9, 1)]
    record(report, f'{suffix}: track click alignment', samples=samples)
    samples = [click_time(page, fraction, ruler=True) for fraction in (.15, .65)]
    record(report, f'{suffix}: ruler click alignment', samples=samples)

    box, y = geometry(page)
    page.mouse.move(box['x'] + box['width'] * .2, y)
    page.mouse.down()
    for fraction in (.3, .45, .6, .8):
        page.mouse.move(box['x'] + box['width'] * fraction, y, steps=3)
        expect_time(page, fraction * 4)
    page.mouse.up()
    record(report, f'{suffix}: continuous mouse scrubbing', endTime=expect_time(page, 3.2))

    # The small grip is pointer-transparent, so this also exercises event
    # routing from its visible position to the ruler/track hit areas.
    click_time(page, .35)
    grip = page.locator('.playhead-grip').bounding_box()
    page.mouse.move(grip['x'] + grip['width'] / 2, grip['y'] + grip['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] * .7, y, steps=8)
    page.mouse.up()
    record(report, f'{suffix}: drag visible grip', endTime=expect_time(page, 2.8))

    page.mouse.move(box['x'] + box['width'] * .4, y)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] * .6, box['y'] - 60, steps=6)
    expect_time(page, 2.4)
    page.mouse.move(box['x'] - 50, box['y'] - 60, steps=4)
    expect_time(page, 0)
    page.mouse.move(box['x'] + box['width'] + 30, box['y'] - 60, steps=8)
    expect_time(page, 4)
    page.mouse.up()
    page.mouse.move(box['x'] + box['width'] * .2, y, steps=3)
    record(report, f'{suffix}: capture outside track, clamp ends, release', endTime=expect_time(page, 4))

    click_time(page, .4)
    page.mouse.click(box['x'] + box['width'] * .8, y, button='right')
    page.keyboard.press('Escape')
    record(report, f'{suffix}: ignore right button', endTime=expect_time(page, 1.6))
    label = page.locator('.track-label').first
    label.click()
    record(report, f'{suffix}: labels do not seek', endTime=expect_time(page, 1.6))

    for event in ('pointercancel', 'lostpointercapture'):
        page.mouse.move(box['x'] + box['width'] * .3, y)
        page.mouse.down()
        expect_time(page, 1.2)
        # Capture is pending until the next pointer event. Establish it
        # before forcing a genuine lostpointercapture event.
        page.mouse.move(box['x'] + box['width'] * .3 + .1, y)
        if event == 'pointercancel':
            page.locator('.tracks').dispatch_event(event, {'pointerId': 1})
        else:
            page.locator('.tracks').evaluate('el => el.releasePointerCapture(1)')
        page.mouse.move(box['x'] + box['width'] * .8, y, steps=4)
        page.mouse.up()
        record(report, f'{suffix}: {event} ends scrub', endTime=expect_time(page, 1.2))

    cdp = page.context.new_cdp_session(page)
    def touch(kind, fraction):
        points = [] if kind == 'touchEnd' else [{'x':box['x'] + box['width'] * fraction,
                                                'y':y, 'id':7}]
        cdp.send('Input.dispatchTouchEvent', {'type':kind, 'touchPoints':points})
    touch('touchStart', .2)
    expect_time(page, .8)
    touch('touchMove', .5)
    expect_time(page, 2)
    touch('touchMove', .75)
    expect_time(page, 3)
    touch('touchEnd', .75)
    cdp.detach()
    record(report, f'{suffix}: touch scrubbing', endTime=expect_time(page, 3))

    timeline = page.get_by_role('slider', name='Timeline playhead')
    timeline.focus()
    timeline.press('Home')
    expect_time(page, 0)
    timeline.press('ArrowRight')
    expect_time(page, 1 / 30)
    timeline.press('End')
    expect_time(page, 4)
    timeline.press('ArrowLeft')
    expect_time(page, 4 - 1 / 30)
    record(report, f'{suffix}: frame stepping and Home/End')

    page.get_by_role('button', name='Play', exact=True).click()
    page.get_by_role('button', name='Pause', exact=True).wait_for()
    click_time(page, .5)
    page.get_by_role('button', name='Play', exact=True).wait_for()
    record(report, f'{suffix}: scrubbing pauses playback', endTime=expect_time(page, 2))

    duration_input = page.locator('.time-duration')
    duration_input.fill('7.5')
    duration_input.press('Tab')
    record(report, f'{suffix}: changed duration alignment', **click_time(page, .6, duration=7.5))
    click_time(page, 0, duration=7.5)
    duration_input.fill('4')
    duration_input.press('Tab')

    # Check native popup colours even when the OS/browser prefers light UI.
    select = page.get_by_role('combobox', name='Add animation', exact=True)
    colours = select.evaluate('''el => ({
      scheme: getComputedStyle(el).colorScheme,
      options: [...el.options].map(option => ({
        label: option.textContent.trim(), colour: getComputedStyle(option).color,
        background: getComputedStyle(option).backgroundColor
      }))
    })''')
    assert colours['scheme'] == 'dark'
    assert all(option['background'] == 'rgb(26, 26, 30)' and
               option['colour'] == 'rgb(236, 236, 240)' for option in colours['options'])
    select.click()
    page.screenshot(path=str(output / f'{suffix}-menu.png'))
    page.keyboard.press('Escape')
    record(report, f'{suffix}: readable native options', **colours)

    page.locator('.device-open').click()
    page.get_by_role('button', name='iPhone 17 Pro', exact=True).click()
    page.locator('.dropzone input[type=file]').set_input_files(str(ROOT / 'assets/demo.mp4'))
    page.wait_for_function('''() => {
      let ready = false;
      window.__mockup?.scene.traverse(object => {
        const map = object.material?.uniforms?.map?.value;
        if (map?.isVideoTexture && map.image.readyState >= 2) ready = true;
      });
      return ready;
    }''', timeout=60000)
    states = []
    for fraction in (.2, .7):
        click_time(page, fraction)
        expected = 4 * fraction
        deadline = time.monotonic() + 10
        state = scene_state(page)
        while time.monotonic() < deadline and (
            not state['video'] or abs(state['video']['currentTime'] - expected) > .13 or
            state['rotationY'] is None or abs(state['rotationY'] - fraction * 2 * math.pi) > .02
        ):
            page.wait_for_timeout(100)
            state = scene_state(page)
        assert state['video'] and abs(state['video']['currentTime'] - expected) <= .13, state
        assert state['video']['paused'] and state['video']['videoWidth'] > 0, state
        assert abs(state['rotationY'] - fraction * 2 * math.pi) <= .02, state
        states.append(state)
    page.screenshot(path=str(output / f'{suffix}-video.png'))
    record(report, f'{suffix}: real GLB pose and decoded recording follow scrub', states=states)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', help='Use an existing local Vite server instead of starting one')
    parser.add_argument('--out', default=str(ROOT / 'output/ui-timeline'))
    args = parser.parse_args()
    output = Path(args.out).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {'platform': platform.platform(), 'checks': [], 'status': 'RUNNING'}
    try:
        with serve(args.url, output) as url, sync_playwright() as playwright:
            browser = playwright.chromium.launch(**WORKER['browser_options']())
            report['browser'] = browser.version
            try:
                for width, height, scale, scheme in ((1440, 960, 1, 'light'), (1024, 768, 1.25, 'dark')):
                    context = browser.new_context(viewport={'width':width, 'height':height},
                                                  device_scale_factor=scale, color_scheme=scheme,
                                                  has_touch=True)
                    try:
                        page = context.new_page()
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        page.goto(url, wait_until='networkidle', timeout=60000)
                        suffix = f'{width}x{height}-dpr{scale}'
                        verify(page, report, output, suffix)
                        assert not errors, errors
                        record(report, f'{suffix}: no browser page errors')
                    except Exception:
                        page.screenshot(path=str(output / 'failure.png'))
                        report['lastReadout'] = page.locator('.time-now').inner_text()
                        report['pageErrors'] = errors
                        raise
                    finally:
                        context.close()
            finally:
                browser.close()
        report['status'] = 'PASS'
    except Exception as error:
        report['status'] = 'FAIL'
        report['error'] = str(error)
        raise
    finally:
        (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
