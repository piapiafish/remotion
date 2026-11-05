import { Vector3 } from 'three'
import type { SceneState } from '../store/schema'
export type CameraSpeed='slow'|'standard'|'fast'
export function moveCamera(pose:SceneState['camera'],held:Set<string>,seconds:number,speed:CameraSpeed='standard',fine=false):SceneState['camera']{
  const p=new Vector3(...pose.position),target=new Vector3(...pose.target),forward=target.clone().sub(p).normalize()
  const right=forward.clone().cross(new Vector3(0,1,0));if(right.lengthSq()<1e-8)right.set(1,0,0);right.normalize()
  const up=right.clone().cross(forward).normalize(),dt=Math.max(0,Math.min(.25,seconds))*(fine?.2:1),rate={slow:1,standard:3,fast:6}[speed]
  const x=Number(held.has('KeyD'))-Number(held.has('KeyA')),y=Number(held.has('KeyW'))-Number(held.has('KeyS')),z=Number(held.has('ArrowUp'))-Number(held.has('ArrowDown'))
  const divisor=Math.max(1,Math.hypot(x,y,z))
  const offset=right.multiplyScalar(x/divisor*rate*dt).addScaledVector(up,y/divisor*rate*dt)
  p.add(offset);target.add(offset)
  const distance=p.distanceTo(target),next=Math.max(.4,Math.min(30,distance-z/divisor*rate*dt))
  p.copy(target.clone().addScaledVector(forward,-next))
  const angle=(Number(held.has('ArrowLeft'))-Number(held.has('ArrowRight')))*Math.PI/4*dt*(speed==='slow'?.5:speed==='fast'?2:1)
  if(angle)p.sub(target).applyAxisAngle(new Vector3(0,1,0),angle).add(target)
  return {...pose,position:p.toArray(),target:target.toArray()}
}
