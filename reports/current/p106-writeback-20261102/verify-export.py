"""Compare decoded export frames, including screen crops, with engine frames."""
import json
from pathlib import Path
import re
import subprocess

OUT = Path(__file__).resolve().parent
BROWSER = OUT / 'browser'
report = json.loads((BROWSER / 'report.json').read_text(encoding='utf-8'))
results = []


def run(command):
    process = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45)
    if process.returncode:
        raise RuntimeError(process.stderr)
    return process.stderr


for item in report['references']:
    frame = item['frame']
    reference = BROWSER / f'02-reference-{frame}.png'
    decoded = BROWSER / f'02-decoded-{frame}.png'
    decode = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-threads', '1',
              '-i', str(BROWSER / 'P1-06-dual-timing-1080p30.mp4'), '-vf', f'select=eq(n\,{frame})',
              '-frames:v', '1', str(decoded)]
    run(decode)
    regions = [('full', 'ssim', .97),
               ('iphone-screen', '[0:v]crop=188:390:570:340[a];[1:v]crop=188:390:570:340[b];[a][b]ssim', .95)]
    # The Pixel rotates through 720 degrees. Its screen is visible at these
    # front-facing samples; the independent clocks are checked at loop edges.
    if frame in (0, 119):
        regions.append(('pixel-screen', '[0:v]crop=160:360:1164:342[a];[1:v]crop=160:360:1164:342[b];[a][b]ssim', .95))
    for region, filtergraph, threshold in regions:
        command = ['ffmpeg', '-hide_banner', '-threads', '1', '-i', str(decoded), '-i', str(reference),
                   '-filter_complex', filtergraph, '-f', 'null', '-']
        log = run(command)
        (BROWSER / f'02-ssim-{frame}-{region}.txt').write_text(log, encoding='utf-8')
        ssim = float(re.findall(r'All:([0-9.]+)', log)[-1])
        result = {'frame': frame, 'region': region, 'ssim': ssim, 'threshold': threshold,
                  'status': 'PASS' if ssim >= threshold else 'FAIL', 'decodeCommand': decode, 'compareCommand': command}
        results.append(result)
        print(json.dumps({k: result[k] for k in ('frame', 'region', 'ssim', 'status')}), flush=True)
    summary = {'status': 'PASS' if all(r['status'] == 'PASS' for r in results) else 'FAIL',
               'frameCount': len({r['frame'] for r in results}), 'comparisons': len(results), 'results': results,
               'method': 'Actual H264 decoded by FFmpeg versus same-frame Standard engine output; full image and visible screen crops. Source times are independently asserted in browser/report.json.'}
    (BROWSER / 'frame-comparison.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps({'status': summary['status'], 'frames': summary['frameCount'], 'comparisons': len(results),
                  'minimumFull': min(r['ssim'] for r in results if r['region'] == 'full'),
                  'minimumScreen': min(r['ssim'] for r in results if r['region'] != 'full')}), flush=True)
raise SystemExit(0 if summary['status'] == 'PASS' else 1)
