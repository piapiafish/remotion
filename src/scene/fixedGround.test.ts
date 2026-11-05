import { describe,it,expect,afterEach } from 'vitest'
import { Box3,BoxGeometry,Euler,Matrix4,Vector3 } from 'three'
import { createDefaultProject,createDevice } from '../store/defaults'
import { ensureFixedGround,groundConstraintConflicts,projectGroundY } from './groundPlane'
import { constrainGroundPose,deviceHalfHeight,CONTACT_GAP } from './deviceBounds'
import { sampleTimeline } from '../timeline/sample'
import { staticTrack } from '../timeline/tracks'
import { DEVICE_LIST,getManifest } from '../devices/manifest'
import { useProjectStore } from '../store/project'
import { emptyHistory } from '../store/history'
import { previewPixelRatio } from './previewResolution'

describe('fixed floor and full poses',()=>{
  const original=useProjectStore.getState()
  afterEach(()=>useProjectStore.setState(original))
  it('freezes the legacy ground and keeps it after device, duration and scale edits',()=>{
    const p=ensureFixedGround(createDefaultProject()),y=projectGroundY(p)
    const next={...p,duration:60,devices:[{...p.devices[0],transform:{...p.devices[0].transform,scale:staticTrack(8)}}]}
    expect(projectGroundY(next)).toBe(y);expect(ensureFixedGround(next)).toBe(next)
  })
  it('matches transformed corners for every model and legacy orientation',()=>{
    for(const manifest of DEVICE_LIST)for(const orientation of ['portrait','landscape'] as const){
      const d=createDevice({id:manifest.id,orientation}),pose={position:[0,0,0] as [number,number,number],rotation:[.7,1.2,-.5] as [number,number,number],scale:1.7}
      const fix=new Matrix4().makeRotationFromEuler(new Euler(...(manifest.modelTransform?.rotation??[0,0,0])))
      const matrix=new Matrix4().makeRotationFromEuler(new Euler(...pose.rotation)).multiply(fix)
        .multiply(new Matrix4().makeRotationZ(orientation==='landscape'?Math.PI/2:0)).multiply(fix.clone().invert()).scale(new Vector3(1.7,1.7,1.7))
      const geometry=new BoxGeometry(...manifest.bodySize);geometry.applyMatrix4(matrix);geometry.computeBoundingBox()
      expect(deviceHalfHeight(d,pose)).toBeCloseTo(new Box3().copy(geometry.boundingBox!).max.y,6);geometry.dispose()
    }
  })
  it('constrains all intermediate rotation frames while preserving Euler turns',()=>{
    const p=ensureFixedGround(createDefaultProject()),d=p.devices[0]
    d.transform['position.y']=staticTrack(-20)
    d.transform['rotation.z']={keys:[{t:0,v:0,ease:[0,0,1,1]},{t:4,v:Math.PI*4,ease:[0,0,1,1]}]}
    for(let i=0;i<=240;i++){const pose=sampleTimeline(p,i/60).devices[0];expect(pose.position[1]-deviceHalfHeight(d,pose)).toBeGreaterThanOrEqual(p.environment.groundY!+CONTACT_GAP-1e-9)}
    expect(sampleTimeline(p,4).devices[0].rotation[2]).toBe(Math.PI*4)
  })
  it('writes the corrected height with a scale gesture and undoes it together',()=>{
    const p=ensureFixedGround(createDefaultProject());p.devices.push(createDevice());useProjectStore.setState({project:p,activeDevice:0,activeObject:{kind:'device',instanceId:p.devices[0].instanceId},playhead:0,history:emptyHistory})
    const s=useProjectStore.getState();s.beginEditGesture();s.setDeviceScale(3);s.setDeviceScale(4);s.endEditGesture()
    const after=useProjectStore.getState().project,pose=sampleTimeline(after,0).devices[0]
    expect(after.environment.groundY).toBe(p.environment.groundY);expect(after.devices[1]).toBe(p.devices[1])
    expect(pose.position[1]).toBeGreaterThan(0);expect(pose.position[1]-deviceHalfHeight(after.devices[0],pose)).toBeCloseTo(p.environment.groundY!+CONTACT_GAP)
    useProjectStore.getState().undo();expect(useProjectStore.getState().project).toBe(p)
  })
  it('leaves unconstrained legacy sampling unchanged until migration',()=>{
    const d=createDevice(),pose={position:[0,-5,0] as [number,number,number],rotation:[0,0,0] as [number,number,number],scale:1}
    expect(constrainGroundPose(pose,d)).toBe(pose);expect(getManifest(d.id)).toBeDefined()
  })
  it('raises low-DPI detail within the preview pixel budget',()=>{
    expect(previewPixelRatio(1000,600,1)).toBe(1.5)
    expect(previewPixelRatio(1000,600,3)).toBe(2)
    expect(previewPixelRatio(1920,1080,2)**2*1920*1080).toBeLessThanOrEqual(3_200_000.001)
  })
  it('identifies a short authored dip without rewriting its keys',()=>{
    const p=ensureFixedGround(createDefaultProject()),d=p.devices[0]
    d.name='旧手机';d.transform['position.y']={keys:[{t:0,v:0,ease:[0,0,1,1]},{t:.1,v:-10,ease:[0,0,1,1]},{t:.2,v:0,ease:[0,0,1,1]}]}
    const before=JSON.stringify(p)
    expect(groundConstraintConflicts(p)).toEqual(['旧手机']);expect(JSON.stringify(p)).toBe(before)
    expect(sampleTimeline(p,.1).devices[0].position[1]).toBeGreaterThan(-10)
  })
})
