"""Compare this installation's real exported MP4 to its engine reference frames."""
import json
from pathlib import Path
import re
import subprocess
import sys

out = Path(__file__).resolve().parent / 'evidence/browser'
video = out / 'P1-02-dual-device-1080p30.mp4'
results = []
for frame in (0, 15, 29):
    decoded = out / f'04-decoded-{frame}.png'
    decode = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(video),
              '-vf', f'select=eq(n\\,{frame})', '-frames:v', '1', str(decoded)]
    compare = ['ffmpeg', '-hide_banner', '-i', str(decoded), '-i', str(out / f'04-reference-{frame}.png'),
               '-lavfi', 'ssim', '-f', 'null', '-']
    commands = []
    score = None
    for command in (decode, compare):
        run = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45)
        commands.append({'command': command, 'exit_code': run.returncode})
        if run.returncode:
            (out / f'04-failed-{frame}.txt').write_text(run.stderr, encoding='utf-8')
            break
        if command is compare:
            (out / f'04-ssim-{frame}.txt').write_text(run.stderr, encoding='utf-8')
            matches = re.findall(r'All:([0-9.]+)', run.stderr)
            if matches:
                score = float(matches[-1])
    results.append({'frame': frame, 'ssim': score, 'threshold': 0.97,
                    'status': 'PASS' if score is not None and score >= 0.97 else 'FAIL', 'commands': commands})
report = {'status': 'PASS' if all(item['status'] == 'PASS' for item in results) else 'FAIL', 'frames': results,
          'method': 'Decode installed-project MP4 and compare indices 0, 15, 29 to same-project Standard-quality engine frames.'}
(out / '04-frame-comparison.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
sys.exit(0 if report['status'] == 'PASS' else 1)
