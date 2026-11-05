import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {prepareSoundtrack,measureVolume} from '../services/agent-orchestrator/audio.mjs';
test('quiet bundled music becomes audible without changing the source or clipping',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'promo-audio-'));
 const source=path.resolve('assets/music-demo.mp3');const original=await readFile(source);
 try{
  const result=await prepareSoundtrack(source,path.join(dir,'soundtrack'));
  assert.ok(result.audit.original.meanDb < -40);
  assert.ok(result.audit.gainDb > 20);
  assert.ok(Math.abs(result.audit.prepared.meanDb+20)<.3);
  assert.ok(result.audit.prepared.peakDb < -1);
  assert.deepEqual(await readFile(source),original);
  const normal=await prepareSoundtrack(result.file,path.join(dir,'normal'));
  assert.equal(normal.audit.gainDb,0);
  assert.deepEqual(measureVolume(normal.file),result.audit.prepared);
 }finally{await rm(dir,{recursive:true,force:true})}
});
