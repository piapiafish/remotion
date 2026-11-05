import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Box3, Vector3 } from 'three'
import { cameraSegments, insertCameraSegment, localCameraTracks, recordingWindow, sampleCamera, segmentedCamera } from './cameraSegments'
import { sampleTimeline } from './sample'
import { staticTrack, staticVec3 } from './tracks'
import { createDefaultProject, createDevice } from '../store/defaults'
import { migrate } from '../store/persist'
import { validateInputShape, validateProject } from '../store/projectValidation'
import { captureCameraPose, resetCameraSession, useCameraSession } from '../store/cameraSession'
import { useProjectStore } from '../store/project'
import { emptyHistory } from '../store/history'
import { packClips, clipMetrics } from '../media/screenClips'
import { focusDistance, stickerBlurRadius } from '../scene/depthOfField'
import { registerSolidBounds, removeSolidBounds } from '../scene/solidBounds'
import { scaleFromAnchor } from '../store/scaleAnchor'
import type { CameraSegment, ScreenClip, TextObject } from '../store/schema'
const ease:[number,number,number,number]=[0,0,1,1]
const segment=(id:string,start:number,end:number,x:number,to:number):CameraSegment=>({id,name:id,start,end,tracks:{...staticVec3('position',[x,0,5]),'position.x':{keys:[{t:0,v:x,ease},{t:end-start,v:to,ease}]},...staticVec3('target',[0,0,0]),fov:staticTrack(30)}})
const clip=(id:string,a:number,b:number,c=a,d=b):ScreenClip=>({clipId:id,name:id,media:{id,kind:'video',width:10,height:10,duration:10,url:''},displayRange:{start:a,end:b},playback:{in:0,out:10,start:c,stop:d,loop:false},fit:'contain'})
beforeEach(()=>{resetCameraSession();const project=createDefaultProject();useProjectStore.setState({project,playhead:0,activeDevice:0,activeObject:{kind:'device',instanceId:project.devices[0].instanceId},selectedCameraSegmentId:null,keySelection:null,history:emptyHistory,playing:false})})
afterEach(()=>{useProjectStore.getState().endEditGesture(true);resetCameraSession();removeSolidBounds('solid-focus')})

describe('segmented camera clock and compatibility',()=>{
  const camera=()=>{const p=createDefaultProject();return insertCameraSegment(insertCameraSegment(p.camera,segment('a',1,3,0,2)),segment('b',6,8,2,4))}
  it.each([[1,0],[2,1],[3,2],[4.5,2],[6,2],[7,3],[8,4],[20,4]])('samples %s without moving in gaps', (t,x)=>expect(sampleCamera(camera(),t).position[0]).toBeCloseTo(x))
  it('holds the base pose before the first segment',()=>{const p=createDefaultProject();expect(sampleCamera(camera(),.5)).toEqual(sampleCamera(p.camera,0))})
  it('allows touching segments but rejects overlap',()=>{const p=createDefaultProject(),c=insertCameraSegment(p.camera,segment('a',1,3,0,2));expect(()=>insertCameraSegment(c,segment('b',3,4,2,3))).not.toThrow();expect(()=>insertCameraSegment(c,segment('b',2,4,2,3))).toThrow('重叠')})
  it('inserts earlier segments in stable time order',()=>{const p=createDefaultProject(),c=insertCameraSegment(insertCameraSegment(p.camera,segment('b',6,8,2,4)),segment('a',1,3,0,2));expect(c.segments!.map(s=>s.id)).toEqual(['a','b'])})
  it('re-recording replaces only the chosen identity',()=>{const c=camera(),b=c.segments![1],n=insertCameraSegment(c,segment('a',1,3,0,1),'a');expect(n.segments![1]).toBe(b);expect(n.segments).toHaveLength(2)})
  it('bounds new recordings by the next occupied interval',()=>{expect(recordingWindow(camera(),4,12)).toEqual({start:4,end:6});expect(recordingWindow(camera(),2,12)).toBeNull();expect(recordingWindow(camera(),2,12,'a')).toEqual({start:1,end:3})})
  it('migrates the entire legacy curve without guessing internal gaps',()=>{const p=createDefaultProject();p.camera.tracks=segment('old',0,8,0,4).tracks;const old=structuredClone(p);p.camera=segmentedCamera(p.camera);expect(cameraSegments(p.camera)).toHaveLength(1);for(const t of [0,.5,3,4.4,7.9,9])expect(sampleTimeline(p,t).camera).toEqual(sampleTimeline(old,t).camera)})
  it('uses local track time while retaining easing and interpolation',()=>{const t={x:{interpolation:'continuous' as const,keys:[{t:6,v:1,ease},{t:8,v:2,ease}]}};expect(localCameraTracks(t,6).x).toEqual({...t.x,keys:[{t:0,v:1,ease},{t:2,v:2,ease}]});expect(t.x.keys[0].t).toBe(6)})
  it.each([1,2,3,4,5] as const)('opens version %s preserving camera samples',version=>{const p=createDefaultProject();p.version=version;p.camera.tracks=segment('old',0,4,0,2).tracks;const n=migrate(p);expect(n.version).toBe(5);expect(sampleTimeline(n,2).camera).toEqual(sampleTimeline(p,2).camera);expect(()=>validateProject(n)).not.toThrow()})
  it('retains empty version-five scenes and explicit empty camera segments',()=>{const p={...createDefaultProject(),version:5 as const,devices:[],camera:camera()};p.camera.segments=[];expect(migrate(p).devices).toEqual([]);expect(migrate(p).camera.segments).toEqual([]);expect(()=>validateInputShape(p)).not.toThrow()})
  it('rejects overlapping or out-of-range local keys on import',()=>{const p=createDefaultProject();p.camera=camera();p.camera.segments![1].start=2;expect(()=>validateProject(p)).toThrow('重叠');p.camera=camera();p.camera.segments![0].tracks.fov.keys[0].t=10;expect(()=>validateProject(p)).toThrow('段内')})
})

describe('camera segment transactions and hidden point editing',()=>{
  it('adopts two independent drafts and deletes a segment in one undo',()=>{
    const s=useProjectStore.getState();s.setDuration(10)
    for(const data of [segment('a',1,3,0,2),segment('b',6,8,2,4)]){
      const draft=Object.fromEntries(Object.entries(data.tracks).map(([c,t])=>[c,{...t,keys:t.keys.map(k=>({...k,t:k.t+data.start}))}]))
      useCameraSession.setState({mode:'review',start:data.start,end:data.end,frame:data.end*30,draft});s.applyCameraRecording()
    }
    const before=useProjectStore.getState().project,segments=before.camera.segments!;expect(segments).toHaveLength(2)
    s.removeCameraSegment(segments[0].id);const next=useProjectStore.getState().project;expect(next.camera.segments).toEqual([segments[1]]);expect(next.devices).toBe(before.devices);s.undo();expect(useProjectStore.getState().project).toEqual(before)
  })
  it('captures non-frame-aligned boundaries without entering the next segment',()=>{
    useCameraSession.setState({mode:'recording',start:.515,end:.515,limit:.98,frame:-1})
    const pose={position:[0,0,5] as [number,number,number],target:[0,0,0] as [number,number,number],fov:30}
    for(const t of [.515,.53,.95,.98])captureCameraPose(pose,t,30)
    const take=useCameraSession.getState();expect(take.draft.fov.keys[0].t).toBe(.515);expect(take.end).toBe(.98);expect(take.draft.fov.keys.every(k=>k.t>=.515&&k.t<=.98)).toBe(true)
  })
  it('blocks camera key selection and object-key creation',()=>{const s=useProjectStore.getState(),p=createDefaultProject();p.camera.tracks=segment('x',0,4,0,2).tracks;useProjectStore.setState({project:p});s.selectKey({target:{kind:'camera'},channel:'position.x',t:0});expect(useProjectStore.getState().keySelection).toBeNull();s.addObjectKey({kind:'camera'});expect(useProjectStore.getState().project).toBe(p)})
  it('does not overwrite segments when moving a temporary viewing camera',()=>{const p=createDefaultProject();p.camera=insertCameraSegment(p.camera,segment('a',1,3,0,2));useProjectStore.setState({project:p});useProjectStore.getState().setCameraPose({position:[4,3,6],target:[1,2,0],fov:40});expect(useProjectStore.getState().project).toBe(p);expect(useCameraSession.getState().view?.position).toEqual([4,3,6])})
})

describe('all video time controls determine lane collisions',()=>{
  it('keeps disjoint blue ranges apart when orange ranges intersect',()=>expect(packClips([clip('a',0,2,0,5),clip('b',3,6,4,6)]).count).toBe(2))
  it('shares a lane only after both ranges separate',()=>expect(packClips([clip('a',0,2,0,5),clip('b',6,8,6,8)]).count).toBe(1))
  it('includes click width when adjacent times are visually too close',()=>{const cs=[clip('a',0,2),clip('b',2,4)];expect(packClips(cs).count).toBe(1);expect(packClips(cs,.01).count).toBe(2)})
  it('fans out endpoints without changing any media clock',()=>{const c=clip('x',1,1+1/30,1,1+1/30),copy=structuredClone(c),m=clipMetrics(c,.01);expect(m.blueNear&&m.playNear).toBe(true);expect(m.height).toBeGreaterThan(72);expect(c).toEqual(copy)})
})

describe('placed centre and per-object depth of field',()=>{
  it.each([-.9,.9])('keeps a phone at x=%s while scaling down',x=>{const d=createDevice({scaleAnchor:[0,0,0],transform:{...staticVec3('position',[x,1,.5]),scale:staticTrack(1)}}),n=scaleFromAnchor(d,0,.5);expect(sampleTimeline({...createDefaultProject(),devices:[n]},0).devices[0].position).toEqual([x,1,.5])})
  const solid=():TextObject=>({instanceId:'solid-focus',textKind:'solid',name:'Focus',content:'文字',color:'#ffffff',fontSize:64,fontWeight:400,align:'left',lineHeight:1.3,width:.8,transform:{...staticVec3('position',[0,1,0]),...staticVec3('rotation',[0,0,0]),scale:staticTrack(1),depth:staticTrack(.2)}})
  it('focuses the transformed glyph centre rather than the anchor',()=>{const p=createDefaultProject(),t=solid();p.texts=[t];p.camera.tracks={...staticVec3('position',[0,1,5]),...staticVec3('target',[0,1,0])};registerSolidBounds(t,new Box3(new Vector3(0,0,-.5),new Vector3(2,1,.5)));p.effects={depthOfField:{enabled:true,focusDevice:null,focusObject:{kind:'text',instanceId:t.instanceId},distance:2,strength:.5},motionBlur:{enabled:false,strength:.5,samples:2}};expect(focusDistance(p,0)).toBeCloseTo(5);t.transform['position.z']=staticTrack(1);expect(focusDistance(p,0)).toBeCloseTo(4)})
  it('uses fixed distance for an absent target and restores clear stickers when disabled',()=>{const p=createDefaultProject();p.effects={depthOfField:{enabled:true,focusDevice:null,focusObject:{kind:'text',instanceId:'missing'},distance:3,strength:1},motionBlur:{enabled:false,strength:.5,samples:2}};expect(focusDistance(p,0)).toBe(3);expect(stickerBlurRadius(p,0,3,1080)).toBe(0);expect(stickerBlurRadius(p,0,7,1080)).toBe(30);p.effects.depthOfField.enabled=false;expect(stickerBlurRadius(p,0,7,1080)).toBe(0)})
  it('falls back safely when a focused solid leaves its display interval',()=>{const p=createDefaultProject(),t={...solid(),displayRange:{start:1,end:2}};p.texts=[t];p.effects={depthOfField:{enabled:true,focusDevice:null,focusObject:{kind:'text',instanceId:t.instanceId},distance:2.3,strength:.5},motionBlur:{enabled:false,strength:.5,samples:2}};expect(focusDistance(p,.5)).toBe(2.3);expect(focusDistance(p,3)).toBe(2.3)})
})
