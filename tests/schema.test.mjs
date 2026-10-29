import {test} from 'node:test';import assert from 'node:assert/strict';
import {deterministicPlan} from '../services/agent-orchestrator/planner.mjs';
import {compileShot} from '../services/compiler/compile.mjs';
import {validateStoryboard,safeAssetUri} from '../packages/video-schema/index.mjs';

test('safe relative media path rejects traversal/URL/absolute',()=>{
 for(const value of ['../etc/passwd','C:\\media\\a.mp4','/media/a.mp4','https://evil.com/a.mp4','a/../b.mp4']) assert.equal(safeAssetUri(value),false,value);
 assert.equal(safeAssetUri('assets/demo.mp4'),true);
});
test('planner generates valid 3 shot Video DSL',()=>{
 const b=deterministicPlan({brief:'智能演示；高效创作；让灵感可见'});
 assert.equal(validateStoryboard(b).ok,true);assert.equal(b.shots.length,3);
 assert.equal(b.overlays.length,3);assert.equal(b.canvas.fps,30);
});
test('unknown phone is rejected',()=>{
 const b=deterministicPlan();b.shots[0].deviceId='not-an-iphone';
 assert.equal(validateStoryboard(b).ok,false);
});
test('compiler generates exact video frame duration and nonempty model tracks',()=>{
 const b=deterministicPlan({seconds:5});
 const p=compileShot(b,b.shots[0],{kind:'video',width:480,height:960,duration:8},'/__automation__/test/screen.mp4');
 assert.equal(p.duration,5);assert.equal(p.devices[0].id,b.shots[0].deviceId);
 assert.equal(p.devices[0].transform['rotation.y'].keys.length>1,true);
 assert.equal(p.devices[0].screen.url,'/__automation__/test/screen.mp4');
});
test('time is deterministic: compilation stable except explicit instance identifiers',()=>{
 const b=deterministicPlan();const args=[b,b.shots[1],{kind:'video',width:480,height:960,duration:8},'/__automation__/test/screen.mp4'];
 assert.deepEqual(compileShot(...args),compileShot(...args));
});
test('overlay beyond film length rejected',()=>{
 const b=deterministicPlan();b.overlays[0].durationFrames=10000;
 assert.equal(validateStoryboard(b).ok,false);
});
