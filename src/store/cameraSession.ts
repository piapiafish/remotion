import { create } from 'zustand'
import type { SceneState, TrackSet, Project } from './schema'

type CameraPose = SceneState['camera']
export const useCameraSession = create<{
  limit:number
  replaceId:string|null
  speed:'slow'|'standard'|'fast'
  mode:'idle'|'ready'|'countdown'|'recording'|'review'
  view:CameraPose|null
  draft:TrackSet
  start:number
  end:number
  frame:number
}>(()=>({limit:Infinity,replaceId:null,speed:'standard',mode:'idle',view:null,draft:{},start:0,end:0,frame:-1}))
export function resetCameraSession(){useCameraSession.setState({mode:'idle',view:null,draft:{},start:0,end:0,frame:-1,replaceId:null,limit:Infinity})}
export function captureCameraPose(pose:CameraPose,time:number,fps:number){
  const s=useCameraSession.getState(),t=Math.max(s.start,Math.min(s.limit,time>=s.limit-1e-8?s.limit:Math.round(time*fps)/fps)),frame=Math.round(t*fps)
  if(s.mode!=='recording'||frame===s.frame&&Math.abs(t-s.end)<1e-8)return
  const id=`camera-${t}`,draft={...s.draft}
  const values:Record<string,number>={fov:pose.fov}
  for(let i=0;i<3;i++){values[`position.${'xyz'[i]}`]=pose.position[i];values[`target.${'xyz'[i]}`]=pose.target[i]}
  for(const [c,v] of Object.entries(values))draft[c]={keys:[...(draft[c]?.keys??[]),{t,v,ease:[0,0,1,1],poseId:id,order:frame,initial:frame===Math.round(s.start*fps)}]}
  useCameraSession.setState({draft,frame,end:t})
}

/** Transient viewing/recording poses never become saved project data. */
export function previewCameraProject(project:Project):Project {
  const session=useCameraSession.getState()
  if(session.mode==='review')return {...project,camera:{...project.camera,segments:undefined,tracks:session.draft}}
  if(!session.view)return project
  const tracks:TrackSet={fov:{keys:[{t:0,v:session.view.fov,ease:[0,0,1,1]}]}}
  for(const prefix of ['position','target'] as const)for(let i=0;i<3;i++)tracks[prefix+'.'+'xyz'[i]]={keys:[{t:0,v:session.view[prefix][i],ease:[0,0,1,1]}]}
  return {...project,camera:{...project.camera,segments:[],tracks}}
}
