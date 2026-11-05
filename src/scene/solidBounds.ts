import { create } from 'zustand'
import { Box3, Euler, Matrix4, Vector3 } from 'three'
import type { DeviceState, TextObject } from '../store/schema'
import { sampleTrack } from '../timeline/sample'
import { solidKey } from './solidFont'
import { CONTACT_GAP } from './deviceBounds'
export const useSolidBoundsRevision=create<{revision:number}>(()=>({revision:0}))
const notify=()=>useSolidBoundsRevision.setState(s=>({revision:s.revision+1}))
const boxes = new Map<string, { key: string; box: Box3 }>()
export function registerSolidBounds(text: TextObject, box: Box3) { boxes.set(text.instanceId, { key: solidKey(text), box: box.clone() });notify() }
export function removeSolidBounds(id: string) { if(boxes.delete(id))notify() }
export function solidBounds(text: TextObject) { const entry=boxes.get(text.instanceId);return entry?.key===solidKey(text)?entry.box:undefined }
export function sampleSolidPose(text: TextObject, t: number, groundY?: number, box=solidBounds(text)): DeviceState & { depth: number; opacity: number } {
  const v=(c:string,f=0)=>sampleTrack(text.transform[c],t,f)
  const pose={position:[v('position.x'),v('position.y'),v('position.z')] as [number,number,number],rotation:[v('rotation.x'),v('rotation.y'),v('rotation.z')] as [number,number,number],scale:v('scale',1),depth:Math.max(.001,v('depth',.08)),opacity:Math.max(0,Math.min(1,v('opacity',1)))}
  if(box&&!box.isEmpty()&&groundY!==undefined) {
    const rotation=new Matrix4().makeRotationFromEuler(new Euler(...pose.rotation))
    let lowest=Infinity
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
      lowest=Math.min(lowest,new Vector3(x,y,z*pose.depth).multiplyScalar(pose.scale).applyMatrix4(rotation).y)
    pose.position[1]=Math.max(pose.position[1],groundY-lowest+CONTACT_GAP)
  }
  return pose
}
