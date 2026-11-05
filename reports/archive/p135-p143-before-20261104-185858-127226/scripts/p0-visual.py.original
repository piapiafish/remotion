#!/usr/bin/env python3
"""Real browser/GLB/VideoTexture check. Saves previews; does not synthesize video."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('worker', ROOT / 'services/render-worker/worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

AUDIT = r'''async time => {
 const {getExportContext}=await import('/src/export/renderer.ts');
 const {seekScreenVideos}=await import('/src/media/screenVideo.ts');
 const ctx=getExportContext();ctx.setFrameloop('never');
 try {
  ctx.applyAt(time);await seekScreenVideos(time);
  const devices=[];
  ctx.scene.traverse(group=>{
   if(group.userData.deviceIndex===undefined)return;
   let meshCount=0,display=null;
   group.traverse(mesh=>{
    if(!mesh.isMesh)return;meshCount++;
    const map=mesh.material?.uniforms?.map?.value;
    if(map?.isVideoTexture){
     const video=map.image;
     const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
     const c=canvas.getContext('2d');c.drawImage(video,0,0);
     const data=c.getImageData(0,0,canvas.width,canvas.height).data;
     // Sample the actual decoder's pixels, not only its currentTime property.
     let checksum=2166136261;for(const value of data)checksum=Math.imul(checksum^value,16777619);
     display={currentTime:video.currentTime,readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,pixelChecksum:checksum>>>0,
       uvMin:mesh.material.uniforms.uUvMin.value.toArray(),uvSpan:mesh.material.uniforms.uUvSpan.value.toArray()};
    }
   });
   devices.push({index:group.userData.deviceIndex,meshCount,display,position:group.position.toArray(),rotation:group.rotation.toArray().slice(0,3),scale:group.scale.x});
  });
  return devices;
 } finally{ctx.setFrameloop('always')}
}'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='output/p0/models')
    parser.add_argument('--port', type=int, default=5181)
    a = parser.parse_args()
    out = (ROOT / a.out).resolve(); out.mkdir(parents=True, exist_ok=True)
    public = ROOT / 'public/__automation__/p0-visual'
    public.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'assets/demo.mp4', public / 'screen.mp4')
    models = ['iphone-17-pro','iphone-17-pro-max','pixel-9-pro-xl','galaxy-s26-ultra']
    report = {'status': 'RUNNING', 'models': [], 'errors': []}
    from playwright.sync_api import sync_playwright
    with (out / 'vite.log').open('w') as log:
        server = subprocess.Popen(worker.vite_command(a.port), cwd=ROOT, stdout=log, stderr=log)
        try:
            url = f'http://127.0.0.1:{a.port}/'
            worker.wait_for_server(url, server)
            with sync_playwright() as pw:
                browser = pw.chromium.launch(**worker.browser_options())
                report['browser'] = browser.version
                try:
                    page = browser.new_page(viewport={'width': 1280, 'height': 1000})
                    page.on('pageerror', lambda e: report['errors'].append(str(e)))
                    # Normal editor also uses local HDR lighting, without automation mode.
                    page.goto(url, wait_until='networkidle')
                    page.wait_for_function('window.__mockup?.scene.children.some(o=>o.isGroup)', timeout=30000)
                    page.screenshot(path=str(out / 'editor.png'))
                    report['editorStarted'] = True
                    for model in models:
                        page.goto(url + '?automation=1', wait_until='networkidle')
                        shot = {'shotId': model, 'deviceId': model, 'screenAssetId': 'screen', 'durationFrames': 150,
                                'template': 'hero-straight', 'motion': 'hero-reveal', 'screenFit': 'contain',
                                'screenOffsetFrames': 0, 'background': '#0b1020'}
                        project = json.loads(worker.run([worker.node_command(), 'services/compiler/compile-cli.mjs'], input=json.dumps({
                            'canvas': {'width': 540, 'height': 960, 'fps': 30}, 'shot': shot,
                            'assetInfo': {'width': 480, 'height': 960, 'duration': 8, 'kind': 'video'},
                            'publicUrl': '/__automation__/p0-visual/screen.mp4'})).stdout)
                        ready = page.evaluate('async p=>await window.__PROMO_BRIDGE__.loadProject(p)', project)
                        result = {'id': model, 'ready': ready, 'samples': []}
                        hashes = {}
                        for frame in [0, 75, 149, 75]:
                            data = page.evaluate('async f=>await window.__PROMO_BRIDGE__.previewFrame(f)', frame)
                            pixels = base64.b64decode(data.split(',', 1)[1])
                            sha = hashlib.sha256(pixels).hexdigest()
                            if frame in hashes:
                                result['sameTimeRepeatIdentical'] = sha == hashes[frame]
                            else:
                                hashes[frame] = sha
                                (out / f'{model}-{frame:03}.png').write_bytes(pixels)
                                audit = page.evaluate(AUDIT, frame / 30)
                                result['samples'].append({'frame': frame, 'pngSha256': sha, 'scene': audit})
                                if not audit or not audit[0]['display'] or abs(audit[0]['display']['currentTime'] - frame / 30) > .0001:
                                    raise RuntimeError(f'VIDEO_NOT_SYNCHRONIZED: {model} frame {frame}')
                        if not result.get('sameTimeRepeatIdentical'):
                            raise RuntimeError(f'NONDETERMINISTIC_PREVIEW: {model}')
                        if len(set(x['scene'][0]['display']['pixelChecksum'] for x in result['samples'])) < 2:
                            raise RuntimeError(f'SCREEN_PIXELS_FROZEN: {model}')
                        report['models'].append(result)
                        print(f'[OK] {model}: GLB + live VideoTexture + 0/75/149 frames + repeat determinism', flush=True)
                    report['status'] = 'DONE' if not report['errors'] else 'ERROR'
                    if report['errors']:
                        raise RuntimeError('Browser errors: ' + str(report['errors']))
                finally:
                    browser.close()
        except Exception as e:
            report['status'] = 'ERROR'; report['error'] = str(e)
            raise
        finally:
            (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
            server.terminate()
            try: server.wait(timeout=6)
            except subprocess.TimeoutExpired: server.kill(); server.wait()
            shutil.rmtree(public, ignore_errors=True)

if __name__ == '__main__':
    main()
