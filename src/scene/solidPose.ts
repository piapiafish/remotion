import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { TextObject } from '../store/schema'
import { isDisplayed } from '../timeline/displayRange'
import { sampleSolidPose } from './solidBounds'
import { applyObjectPresence } from './objectPresence'
export function applySolidPose(group:Group,mesh:Mesh,text:TextObject,t:number,groundY?:number,duration=Infinity){
  const pose=sampleSolidPose(text,t,groundY)
  applyObjectPresence(group,isDisplayed(text,t,duration))
  group.position.set(...pose.position);group.rotation.set(...pose.rotation);group.scale.setScalar(pose.scale)
  mesh.visible=pose.opacity>0;mesh.scale.z=pose.depth;(mesh.material as MeshStandardMaterial).opacity=pose.opacity
}
