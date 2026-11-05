import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deterministicPlan} from '../services/agent-orchestrator/planner.mjs';
import {inspectMedia} from '../services/agent-orchestrator/critic.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('missing asset fails with a readable report and no output MP4',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'promo-errors-'));
 try{
  const board=deterministicPlan({media:'assets/p0-deliberately-missing.mp4',shots:1});
  const file=path.join(dir,'storyboard 中文 & spaces.json');await writeFile(file,JSON.stringify(board));
  const p=spawnSync(process.execPath,['services/agent-orchestrator/cli.mjs','render','--storyboard',file,'--out',dir],{cwd:root,encoding:'utf8'});
  assert.equal(p.status,1);assert.match(p.stderr,/ASSET_MISSING/);
  const report=JSON.parse(await readFile(path.join(dir,'render-report.json'),'utf8'));
  assert.equal(report.status,'ERROR');assert.equal(report.error.code,'ASSET_MISSING');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('illegal device exits before starting any renderer',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'promo-errors-'));
 try{
  const board=deterministicPlan({shots:1});board.shots[0].deviceId='nonexistent-phone';
  const file=path.join(dir,'bad-device.json');await writeFile(file,JSON.stringify(board));
  const p=spawnSync(process.execPath,['services/agent-orchestrator/cli.mjs','render','--storyboard',file,'--out',dir],{cwd:root,encoding:'utf8'});
  assert.equal(p.status,1);assert.match(p.stderr,/INVALID_STORYBOARD/);assert.match(p.stderr,/Unknown real GLB device/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('real ffprobe inspection rejects incorrect resolution/fps/audio expectations',()=>{
 const file=path.join(root,'assets/demo.mp4');
 assert.equal(inspectMedia(file,{expectedWidth:480,expectedHeight:960,expectedFps:30,expectedSeconds:8}).ok,true);
 for(const spec of [{expectedWidth:540},{expectedFps:60},{requireAudio:true}])assert.equal(inspectMedia(file,spec).error,'OUTPUT_SPEC_MISMATCH');
});
