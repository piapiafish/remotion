import type { DeviceInstance, Vec3 } from './schema'
import { sampleDevice } from '../timeline/sample'
import { constrainGroundPose } from '../scene/deviceBounds'
import { poseValueAt } from '../timeline/objectEditing'
export function freezeScaleAnchor(device:DeviceInstance,groundY?:number,time=0):DeviceInstance {
  return {...device,scaleAnchor:[...constrainGroundPose(sampleDevice(device,time),device,groundY).position]}
}
/** A new scale edit preserves the currently placed world centre, including stacked poses. */
export function scaleFromAnchor(device:DeviceInstance,time:number,value:number,groundY?:number,poseId?:string):DeviceInstance {
  const sampled=sampleDevice(device,time)
  if(poseId){
    const selected=(c:string,f:number)=>device.transform[c]?.keys.find(k=>k.poseId===poseId&&Math.abs(k.t-time)<1e-6)?.v??f
    sampled.position=sampled.position.map((v,i)=>selected('position.'+'xyz'[i],v)) as Vec3
    sampled.scale=selected('scale',sampled.scale)
  }
  const old=constrainGroundPose(sampled,device,groundY),scale=Math.max(.05,Math.min(20,value))
  const position=old.position
  let transform=poseValueAt(device.transform,'scale',time,scale,!!device.animationEnabled,poseId)
  for(let i=0;i<3;i++)transform=poseValueAt(transform,'position.'+'xyz'[i],time,position[i],!!device.animationEnabled,poseId)
  return {...device,transform}
}
