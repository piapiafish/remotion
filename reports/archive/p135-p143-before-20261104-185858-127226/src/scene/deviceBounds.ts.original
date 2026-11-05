import { Euler, Matrix4 } from 'three'
import type { DeviceInstance, DeviceState, Vec3 } from '../store/schema'
import { getManifest } from '../devices/manifest'

/** Extent of a rotated, centred box along world Y. */
export function verticalHalfExtent(size: Vec3, rotation: Vec3): number {
  const [rx, ry, rz] = rotation, cx=Math.cos(rx), sx=Math.sin(rx), cy=Math.cos(ry), sy=Math.sin(ry), cz=Math.cos(rz), sz=Math.sin(rz)
  return .5*(Math.abs(cx*sz+sx*sy*cz)*size[0]+Math.abs(cx*cz-sx*sy*sz)*size[1]+Math.abs(-sx*cy)*size[2])
}

/** bodySize is measured after the manifest correction. Conjugate the legacy
 * inner landscape turn into that coordinate system before the user's Euler. */
export function deviceHalfHeight(device: DeviceInstance, pose: DeviceState): number {
  const manifest=getManifest(device.id)
  if(device.orientation!=='landscape')return verticalHalfExtent(manifest.bodySize,pose.rotation)*pose.scale
  const correction=new Matrix4().makeRotationFromEuler(new Euler(...(manifest.modelTransform?.rotation??[0,0,0])))
  const rotation=new Matrix4().makeRotationFromEuler(new Euler(...pose.rotation))
    .multiply(correction).multiply(new Matrix4().makeRotationZ(Math.PI/2)).multiply(correction.clone().invert())
  const e=rotation.elements,s=manifest.bodySize
  return .5*(Math.abs(e[1])*s[0]+Math.abs(e[5])*s[1]+Math.abs(e[9])*s[2])*pose.scale
}

export const CONTACT_GAP=.002
export function constrainGroundPose(pose: DeviceState, device: DeviceInstance, groundY?: number): DeviceState {
  if(groundY===undefined||!Number.isFinite(groundY))return pose
  const y=Math.max(pose.position[1],groundY+deviceHalfHeight(device,pose)+CONTACT_GAP)
  return y===pose.position[1]?pose:{...pose,position:[pose.position[0],y,pose.position[2]]}
}
