import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Box3, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3 } from 'three'
import { createDefaultProject, createDevice } from '../store/defaults'
import { useProjectStore } from '../store/project'
import { emptyHistory } from '../store/history'
import { staticTrack, staticVec3 } from './tracks'
import { clipPlayback, clipError, deviceClips, packClips } from '../media/screenClips'
import { videoTimeAt } from '../media/videoTiming'
import { applySceneState } from '../scene/applySceneState'
import { sampleSolidPose, registerSolidBounds, removeSolidBounds } from '../scene/solidBounds'
import { applySolidPose } from '../scene/solidPose'
import { scaleFromAnchor } from '../store/scaleAnchor'
import { sampleDevice } from './sample'
import { changeDisplayRange } from './displayRange'
import { moveCamera } from '../scene/cameraMotion'
import { migrate, stripRuntimeFields, mediaRefs } from '../store/persist'
import { validateProject, validateInputShape } from '../store/projectValidation'
import type { Project, ScreenClip, TextObject } from '../store/schema'
const linear=[0,0,1,1] as [number,number,number,number]
const clip=(id:string,start=1,end=7):ScreenClip=>({clipId:id,name:id,media:{id:'source-'+id,kind:'video',width:100,height:200,duration:10,url:'blob:'+id},displayRange:{start,end},playback:{in:1,out:9,start,stop:end,loop:false,rate:1},fit:'contain'})
const timed=(id:string)=>({...clip(id),playback:{...clip(id).playback,start:2,stop:5}})
const reset=()=>{const s=useProjectStore.getState();s.endEditGesture(true);const project=createDefaultProject();useProjectStore.setState({project,playhead:0,playing:false,activeDevice:0,activeObject:{kind:'device',instanceId:project.devices[0].instanceId},activeClipId:null,keySelection:null,history:emptyHistory,fileBusy:false})}
beforeEach(reset)
afterEach(()=>useProjectStore.getState().endEditGesture(true))

describe('three independent media time ranges',()=>{
  it.each([[1.2,1],[2.5,1.5],[5.2,4],[6.9,4]])('maps %s seconds including paused holds', (t,expected)=>expect(videoTimeAt(t,10,clipPlayback(timed('a'))).time).toBeCloseTo(expected))
  it('legacy visibility follows duration until explicitly trimmed',()=>{const p=createDefaultProject(),d=p.devices[0];d.screen=clip('old').media;const migrated=migrate(p);migrated.duration=8;expect(deviceClips(migrated.devices[0],8)[0].displayRange.end).toBe(8);const s=useProjectStore.getState();useProjectStore.setState({project:migrated,activeDevice:0});const c=migrated.devices[0].screenClips![0];s.updateScreenClip(c.clipId,{displayRange:{start:1,end:3}});s.setDuration(12);expect(deviceClips(useProjectStore.getState().project.devices[0],12)[0].displayRange).toEqual({start:1,end:3})})
  it('does not restart the play clock when visibility starts later',()=>{const c={...clip('a',4,8),playback:timed('a').playback};expect(videoTimeAt(4,10,clipPlayback(c)).time).toBe(3)})
  it('holds source end when the playback interval is longer than the source',()=>{const c=clip('a');c.playback={in:2,out:3,start:2,stop:8,rate:2,loop:false};expect(videoTimeAt(7,10,clipPlayback(c)).time).toBeCloseTo(3,4);expect(videoTimeAt(7,10,clipPlayback(c)).active).toBe(false)})
  it('changing only fill keeps the old looping clock intact',()=>{const s=useProjectStore.getState(),p=createDefaultProject(),c=clip('legacy');c.playback={in:2,out:4,start:1,loop:true};p.devices[0].screenClips=[c];useProjectStore.setState({project:p,activeDevice:0});s.updateScreenClip(c.clipId,{fit:'cover'});const updated=useProjectStore.getState().project.devices[0].screenClips![0];expect(updated.playback).toEqual(c.playback);expect(videoTimeAt(5.5,10,clipPlayback(updated)).time).toBe(2.5)})
  it('preserves unedited legacy looping',()=>{const c=clip('old');c.playback={in:2,out:4,start:1,loop:true};expect(clipPlayback(c).stop).toBeUndefined();expect(videoTimeAt(5.5,10,clipPlayback(c)).time).toBe(2.5)})
  it('explains invalid display and pause fields',()=>{expect(clipError({...clip('a'),displayRange:{start:1,end:1}},30)).toContain('视频显示');expect(clipError({...clip('a'),playback:{...clip('a').playback,stop:1}},30)).toContain('暂停')})
  it('packs disjoint sources and touching boundaries into one lane',()=>{const layout=packClips([clip('a',0,1),clip('b',1,2),clip('c',3,4)]);expect(layout.count).toBe(1)})
  it('keeps overlapping depth order stable while reusing disjoint lanes',()=>{const cs=[clip('a',0,2),clip('b',1,3),clip('c',4,5)],layout=packClips(cs);expect(layout.rows.get('a')).toBe(0);expect(layout.rows.get('b')).toBe(1);expect(layout.rows.get('c')).toBe(0);expect(cs.map(c=>c.clipId)).toEqual(['a','b','c'])})
  it('retains overlap depth through a chain that cannot fit two stable lanes',()=>{const layout=packClips([clip('a',0,2),clip('b',1,3),clip('c',2,4)]);expect(layout.rows.get('c')).toBe(2)})
  it('adding and editing one clip is undoable without changing other clocks',()=>{const s=useProjectStore.getState();s.addScreenClip(clip('a').media,'A');const a=s.project;const first=useProjectStore.getState().project.devices[0].screenClips![0];useProjectStore.getState().addScreenClip(clip('b').media,'B');const before=useProjectStore.getState().project.devices[0].screenClips!;s.beginEditGesture();s.updateScreenClip(first.clipId,{displayRange:{start:1,end:8},playback:{start:2,stop:5}});s.endEditGesture();const after=useProjectStore.getState().project.devices[0].screenClips!;expect(after.find(c=>c.name==='B')).toEqual(before.find(c=>c.name==='B'));s.undo();expect(useProjectStore.getState().project.devices[0].screenClips).toEqual(before);expect(a.devices[0].screenClips).toBeUndefined()})
  it('moves all four clip endpoints with the object body, without changing source bounds',()=>{const p=createDefaultProject(),d=p.devices[0];d.screenClips=[timed('a')];const next=changeDisplayRange(p,{kind:'device',instanceId:d.instanceId},{start:2,end:9},2),c=next.devices[0].screenClips![0];expect(c.displayRange).toEqual({start:3,end:9});expect(c.playback).toMatchObject({start:4,stop:7,in:1,out:9});expect(next.duration).toBe(9)})
  it('copies clip identities while sharing only immutable source media',()=>{const s=useProjectStore.getState();s.addScreenClip(clip('a').media,'A');const original=useProjectStore.getState().project.devices[0];s.duplicateDevice(0);const copy=useProjectStore.getState().project.devices[1];expect(copy.screenClips![0].clipId).not.toBe(original.screenClips![0].clipId);expect(copy.screenClips![0].media.id).toBe(original.screenClips![0].media.id);expect(copy.scaleAnchor).not.toEqual(original.scaleAnchor)})
  it('reordering changes depth but leaves media times and identities intact',()=>{const s=useProjectStore.getState();s.addScreenClip(clip('a').media,'A');s.addScreenClip(clip('b').media,'B');const before=useProjectStore.getState().project.devices[0].screenClips!;s.moveScreenClip(before[1].clipId,-1);expect(useProjectStore.getState().project.devices[0].screenClips).toEqual([before[1],before[0]]);s.undo();expect(useProjectStore.getState().project.devices[0].screenClips).toEqual(before)})
})

describe('actual render-tree membership',()=>{
  it('removes and restores the same phone node including children',()=>{const scene=new Scene(),g=new Group(),mesh=new Mesh();g.add(mesh);scene.add(g);const camera=new PerspectiveCamera(),state={camera:{position:[0,0,3] as [number,number,number],target:[0,0,0] as [number,number,number],fov:30},devices:[{position:[0,0,0] as [number,number,number],rotation:[0,0,0] as [number,number,number],scale:1,visible:false}]};applySceneState(state,[g],camera);expect(scene.getObjectById(mesh.id)).toBeUndefined();expect(g.parent).toBeNull();applySceneState({...state,devices:[{...state.devices[0],visible:true}]},[g],camera);expect(scene.getObjectById(mesh.id)).toBe(mesh);expect(g.parent).toBe(scene)})
  it('reattaches solid text on an arbitrary backwards export sample',()=>{const scene=new Scene(),g=new Group(),mesh=new Mesh(undefined,new MeshBasicMaterial());g.add(mesh);scene.add(g);const text={...solid(),displayRange:{start:1,end:2}};applySolidPose(g,mesh,text,3);expect(g.parent).toBeNull();applySolidPose(g,mesh,text,1);expect(g.parent).toBe(scene);expect(mesh.visible).toBe(true)})
})
function solid():TextObject{return {instanceId:'bounds-test',textKind:'solid',name:'T',content:'中文',fontSize:64,fontWeight:400,color:'#ffffff',align:'left',lineHeight:1.3,width:.8,transform:{...staticVec3('position',[0,-10,0]),...staticVec3('rotation',[0,0,0]),scale:staticTrack(1),depth:staticTrack(.4)}}}
describe('solid text ground contact',()=>{
  it.each([0,Math.PI/2,Math.PI,Math.PI*1.5])('constrains actual asymmetric glyph bounds at rotation %s',angle=>{const t=solid();t.transform['rotation.z']=staticTrack(angle);const box=new Box3(new Vector3(-.2,-.3,-.5),new Vector3(2,1,.5)),pose=sampleSolidPose(t,0,0,box);const group=new Group();group.position.set(...pose.position);group.rotation.set(...pose.rotation);group.scale.setScalar(pose.scale);group.updateMatrixWorld();let lowest=Infinity;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])lowest=Math.min(lowest,new Vector3(x,y,z*pose.depth).applyMatrix4(group.matrixWorld).y);expect(lowest).toBeCloseTo(.002)})
  it('takes thickness into account when text is laid flat',()=>{const t=solid();t.transform['rotation.x']=staticTrack(Math.PI/2);const box=new Box3(new Vector3(0,-.3,-.5),new Vector3(2,1,.5));expect(sampleSolidPose(t,0,0,box).position[1]).toBeCloseTo(.202)})
  it('does not use stale bounds after content changes',()=>{const t=solid();registerSolidBounds(t,new Box3(new Vector3(-1,-1,-.5),new Vector3(1,1,.5)));expect(sampleSolidPose(t,0,0).position[1]).toBeCloseTo(1.002);expect(sampleSolidPose({...t,content:'different'},0,0).position[1]).toBe(-10);removeSolidBounds(t.instanceId)})
})
describe('placed-centre scale, superseding the initial anchor rule',()=>{
  it('uses the selected stacked pose when scaling without modifying the upper pose',()=>{
    const d=createDevice({animationEnabled:true,scaleAnchor:[0,0,0],transform:{
      'position.x':{keys:[{t:0,v:2,ease:linear,poseId:'lower',order:1},{t:0,v:8,ease:linear,poseId:'upper',order:2}]},
      scale:{keys:[{t:0,v:1,ease:linear,poseId:'lower',order:1},{t:0,v:2,ease:linear,poseId:'upper',order:2}]}
    }})
    const next=scaleFromAnchor(d,0,.5,undefined,'lower')
    expect(next.transform['position.x'].keys.find(k=>k.poseId==='lower')?.v).toBe(2)
    expect(next.transform['position.x'].keys.find(k=>k.poseId==='upper')?.v).toBe(8)
    expect(next.transform.scale.keys.find(k=>k.poseId==='upper')?.v).toBe(2)
  })
  it('keeps the current position after a later move',()=>{const d=createDevice({scaleAnchor:[0,1,0],transform:{...staticVec3('position',[2,1,0]),scale:staticTrack(1)}});const next=scaleFromAnchor(d,0,.5);expect(sampleDevice(next,0).position).toEqual([2,1,0]);expect(next.scaleAnchor).toEqual([0,1,0]);expect(sampleDevice(scaleFromAnchor(next,0,1),0).position).toEqual([2,1,0])})
  it('writes matching native position/scale poses without touching other times',()=>{const d=createDevice({animationEnabled:true,scaleAnchor:[0,0,0],transform:{...staticVec3('position',[2,1,0]),scale:{keys:[{t:0,v:1,ease:linear},{t:4,v:1,ease:linear}]}}});const next=scaleFromAnchor(d,2,.5);expect(sampleDevice(next,0).scale).toBe(1);expect(sampleDevice(next,2).position[0]).toBe(2);expect(sampleDevice(next,4).scale).toBe(1)})
  it('opening an old project preserves its sampled animation',()=>{const p=createDefaultProject();p.devices[0].transform.scale={keys:[{t:0,v:.6,ease:linear},{t:4,v:1.5,ease:linear}]};expect(sampleDevice(migrate(p).devices[0],2)).toEqual(sampleDevice(p.devices[0],2))})
})
describe('camera keyboard coordinate rules',()=>{
  const pose={position:[0,0,5] as [number,number,number],target:[0,0,0] as [number,number,number],fov:32}
  const run=(keys:string[],speed:'slow'|'standard'='standard')=>{let p=pose;for(let i=0;i<60;i++)p=moveCamera(p,new Set(keys),1/60,speed);return p}
  it('W moves camera and target up three units per second',()=>{const p=run(['KeyW']);expect(p.position[1]).toBeCloseTo(3);expect(p.target[1]).toBeCloseTo(3)})
  it.each([15,30,60])('keeps the same velocity at %s frames per second',fps=>{let next=pose;for(let i=0;i<fps;i++)next=moveCamera(next,new Set(['KeyD']),1/fps);expect(next.position[0]).toBeCloseTo(3)})
  it('normalizes diagonal travel',()=>{const p=run(['KeyW','KeyD']);expect(Math.hypot(p.target[0],p.target[1])).toBeCloseTo(3)})
  it('arrow forward keeps the orbit target and a positive distance',()=>{const p=run(['ArrowUp']);expect(p.position[2]).toBeCloseTo(2);expect(p.target).toEqual(pose.target)})
  it('left/right orbit preserve target, height and radius',()=>{const p=run(['ArrowLeft']);expect(Math.hypot(...p.position)).toBeCloseTo(5);expect(p.target).toEqual(pose.target);expect(p.position[1]).toBe(0);expect(p.position[0]).not.toBe(0)})
})
describe('version 4 portability',()=>{
  it('migrates one legacy source without changing loop timing',()=>{const p=createDefaultProject();p.devices[0].screen=clip('a').media;p.devices[0].screenPlayback={in:2,out:5,start:1,loop:true};const n=migrate(p);expect(n.version).toBe(5);expect(n.devices[0].screenClips).toHaveLength(1);expect(clipPlayback(n.devices[0].screenClips![0])).toMatchObject(p.devices[0].screenPlayback!)})
  it('strips all clip URLs and missing markers, and collects every source',()=>{const p=createDefaultProject();p.version=4;p.devices[0].screenClips=[clip('a'),{...clip('b'),media:{...clip('b').media,missing:true}}];const n=stripRuntimeFields(p);expect(JSON.stringify(n)).not.toContain('blob:');expect(n.devices[0].screenClips![1].media.missing).toBeUndefined();expect(mediaRefs(p)).toHaveLength(2)})
  it('accepts empty modern projects and rejects invalid clip identities/times',()=>{const p:Project={...createDefaultProject(),version:4,devices:[]};expect(()=>validateInputShape(p)).not.toThrow();expect(()=>validateProject(p)).not.toThrow();const n={...p,devices:[createDevice({screenClips:[clip('a'),clip('a')]})]};expect(()=>validateProject(n)).toThrow('视频片段');n.devices[0].screenClips=[{...clip('a'),playback:{...clip('a').playback,stop:1}}];expect(()=>validateProject(n)).toThrow('暂停')})
})
