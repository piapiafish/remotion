import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {deterministicPlan} from '../services/agent-orchestrator/planner.mjs';
import {shotFingerprint} from '../services/agent-orchestrator/cache.mjs';

test('shot cache tracks media/model/engine/pose, while subtitle-only edits keep it reusable',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'promo-cache-'));
 try{
  const source=path.join(dir,'screen.mp4'),model=path.join(dir,'phone.glb');
  await writeFile(source,'original-media');await writeFile(model,'original-model');
  const board=deterministicPlan();
  const args={shot:board.shots[0],canvas:board.canvas,quality:'standard',engine:'v1',source,model};
  const first=await shotFingerprint(args);
  board.overlays[0].text='字幕修改不应重渲 3D';
  assert.equal(await shotFingerprint(args),first);
  assert.notEqual(await shotFingerprint({...args,engine:'v2'}),first);
  assert.notEqual(await shotFingerprint({...args,shot:{...args.shot,motion:'none'}}),first);
  assert.notEqual(await shotFingerprint({...args,forcePng:true}),first);
  await writeFile(model,'updated-model');assert.notEqual(await shotFingerprint(args),first);
  await writeFile(model,'original-model');await writeFile(source,'updated-media');assert.notEqual(await shotFingerprint(args),first);
 }finally{await rm(dir,{recursive:true,force:true})}
});
