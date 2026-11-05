import type { EaseHandle, Keyframe, Project, TrackSet } from '../store/schema'
import { sampleTrack } from './sample'
import { EASE_LINEAR } from './easing'
import { setKey, staticTrack } from './tracks'
import { channelFallback, sameTime, targetChannels, targetTracks, type TrackTarget } from './editing'

export function animationEnabled(project: Project, target: TrackTarget): boolean {
  const item = target.kind === 'camera' ? project.camera : target.kind === 'text'
    ? project.texts?.find(d => d.instanceId === target.instanceId) : project.devices.find(d => d.instanceId === target.instanceId)
  return !!item?.animationEnabled || Object.values(targetTracks(project, target) ?? {}).some(t => t.keys.length > 1)
}
export function withObjectTracks(project: Project, target: TrackTarget, transform: TrackSet, enabled?: boolean): Project {
  const flag = enabled === undefined ? {} : { animationEnabled: enabled }
  if (target.kind === 'camera') return { ...project, camera: { ...project.camera, ...flag, preset: null, tracks: transform } }
  if (target.kind === 'text') return { ...project, texts: project.texts?.map(d => d.instanceId === target.instanceId ? { ...d, ...flag, transform } : d) }
  return { ...project, devices: project.devices.map(d => d.instanceId === target.instanceId ? { ...d, ...flag, transform } : d) }
}

export const keyPoseId = (key: {t:number;poseId?:string}) => key.poseId ?? `time:${key.t}`
export const poseMatches = (key: Keyframe, t: number, id?: string) => id ? keyPoseId(key) === id : sameTime(key.t,t)
export const sortPoseKeys = (a:Keyframe,b:Keyframe) => a.t-b.t || (a.order??0)-(b.order??0)
export function identifyPoses(tracks: TrackSet): TrackSet {
  const all=Object.values(tracks).flatMap(t=>t.keys), first=Math.min(...all.map(k=>k.t)), hasInitial=all.some(k=>k.initial)
  return Object.fromEntries(Object.entries(tracks).map(([c,t])=>[c,{...t,keys:t.keys.map(k=>({...k,poseId:keyPoseId(k),order:k.order??0,initial:k.initial??(!hasInitial&&sameTime(k.t,first))}))}]))
}
export function objectPoses(project:Project,target:TrackTarget) {
  const poses=new Map<string,{id:string;t:number;order:number;initial:boolean}>()
  for(const track of Object.values(identifyPoses(targetTracks(project,target)??{})))for(const key of track.keys){
    const id=keyPoseId(key);if(!poses.has(id))poses.set(id,{id,t:key.t,order:key.order??0,initial:!!key.initial})
  }
  return [...poses.values()].sort((a,b)=>a.t-b.t||a.order-b.order)
}
export function objectKeyTimes(project: Project, target: TrackTarget): number[] {
  return animationEnabled(project,target)?[...new Set(objectPoses(project,target).map(k=>k.t))].filter(t=>t<=project.duration+1e-6):[]
}
export function addObjectKey(project: Project, target: TrackTarget, time: number, id: string=crypto.randomUUID()): Project {
  const original=targetTracks(project,target)
  if(!original||!Number.isFinite(time))return project
  const t=Math.max(0,time),enabled=animationEnabled(project,target),tracks=identifyPoses(original)
  const order=Math.max(0,...Object.values(tracks).flatMap(t=>t.keys.map(k=>k.order??0)))+1
  for(const c of targetChannels(target)){
    if(target.kind==='text'&&project.texts?.find(x=>x.instanceId===target.instanceId)?.textKind!=='solid'&&['position.z','rotation.x','rotation.y','depth'].includes(c))continue
    const value=sampleTrack(original[c],t,channelFallback(project,target,c)),base=tracks[c]??staticTrack(value)
    const keys=!enabled?base.keys.filter(k=>!sameTime(k.t,t)):base.keys
    tracks[c]={...base,keys:[...keys,{t,v:value,ease:EASE_LINEAR,poseId:id,order,initial:!enabled&&sameTime(t,0)}].sort(sortPoseKeys)}
  }
  return {...withObjectTracks(project,target,tracks,true),version:3,duration:Math.max(project.duration,t)}
}
export function moveObjectKey(project: Project,target:TrackTarget,from:number,to:number,id?:string):Project {
  if(!Number.isFinite(to)||sameTime(from,to))return project
  const original=targetTracks(project,target);if(!original)return project
  const identified=identifyPoses(original),order=Math.max(0,...Object.values(identified).flatMap(t=>t.keys.map(k=>k.order??0)))+1
  const tracks=Object.fromEntries(Object.entries(identified).map(([c,track])=>[c,original[c].keys.some(k=>poseMatches(k,from,id))?{...track,keys:track.keys.map(k=>poseMatches(k,from,id)?{...k,t:Math.max(0,to),order}:k).sort(sortPoseKeys)}:original[c]]))
  return {...withObjectTracks(project,target,tracks),version:3,duration:Math.max(project.duration,to)}
}
export function deleteObjectKey(project:Project,target:TrackTarget,t:number,id?:string):Project {
  const original=targetTracks(project,target);if(!original)return project
  const tracks=Object.fromEntries(Object.entries(original).map(([c,track])=>{const keys=track.keys.filter(k=>!poseMatches(k,t,id));return[c,keys.length?{...track,keys}:staticTrack(sampleTrack(track,t,channelFallback(project,target,c)))]}))
  return withObjectTracks(project,target,tracks,Object.values(tracks).some(track=>track.keys.length>1))
}
export function easeObjectKey(project:Project,target:TrackTarget,t:number,ease:EaseHandle,id?:string):Project {
  const original=targetTracks(project,target);if(!original)return project
  return withObjectTracks(project,target,Object.fromEntries(Object.entries(original).map(([c,track])=>{const {interpolation:_i,...rest}=track;return[c,{...rest,keys:track.keys.map(k=>poseMatches(k,t,id)?{...k,ease}:k)}]})))
}
export function poseValueAt(tracks:TrackSet,channel:string,t:number,value:number,recording:boolean,selectedId?:string):TrackSet {
  if(selectedId){
    const all=Object.values(tracks).flatMap(t=>t.keys),existing=all.find(k=>keyPoseId(k)===selectedId)
    if(existing){const track=tracks[channel]??staticTrack(value),found=track.keys.some(k=>keyPoseId(k)===selectedId)
      return {...tracks,[channel]:{...track,keys:(found?track.keys.map(k=>keyPoseId(k)===selectedId?{...k,v:value}:k):[...track.keys,{...existing,v:value}]).sort(sortPoseKeys)}}}
  }
  const pose=recording?Object.fromEntries(Object.entries(tracks).map(([c,track])=>[c,setKey(track,t,sampleTrack(track,t,c==='scale'||c==='opacity'?1:c==='depth'?.08:0))])):tracks
  return {...pose,[channel]:recording||(tracks[channel]?.keys.length??0)>1?setKey(pose[channel],t,value):staticTrack(value)}
}
