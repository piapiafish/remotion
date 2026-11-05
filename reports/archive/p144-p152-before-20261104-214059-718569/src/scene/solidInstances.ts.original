import type { Group, Mesh } from 'three'
import type { Project } from '../store/schema'
import { applySolidPose } from './solidPose'
const instances=new Map<string,{group:Group;mesh:Mesh}>()
export function registerSolidInstance(id:string,group:Group,mesh:Mesh){instances.set(id,{group,mesh});return ()=>{if(instances.get(id)?.group===group)instances.delete(id)}}
export function getSolidInstance(id:string){return instances.get(id)}
export function applySolidInstances(project:Project,t:number){for(const text of project.texts??[]){const entry=instances.get(text.instanceId);if(entry)applySolidPose(entry.group,entry.mesh,text,t,project.environment.groundY,project.duration)}}
