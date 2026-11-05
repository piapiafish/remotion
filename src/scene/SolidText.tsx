import { transformOwnsPointer } from './editorPointer'
import { makeSolidGeometry } from './solidGeometry'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { Group, Mesh, Plane, Vector3 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { TextObject, Vec3 } from '../store/schema'
import { solidFont, solidKey, markSolidReady } from './solidFont'
import { useProjectStore } from '../store/project'
import { useCameraSession } from '../store/cameraSession'
import { reportError } from '../store/feedback'
import { registerSolidBounds, removeSolidBounds, sampleSolidPose } from './solidBounds'
import { registerSolidInstance } from './solidInstances'

export function SolidText({text}:{text:TextObject}){
  const [font,setFont]=useState<{font:Font;key:string}|null>(null)
  const group=useRef<Group>(null),mesh=useRef<Mesh>(null)
  const drag=useRef<{plane:Plane;point:Vector3;position:Vec3;rotation:Vec3;x:number;pointer:number}|null>(null)
  const key=solidKey(text),spec=useMemo(()=>{const [content,fontSize,width,align,lineHeight,fontData]=JSON.parse(key);return {content,fontSize,width,align,lineHeight,fontData}},[key])
  useEffect(()=>{let live=true;markSolidReady(text.instanceId,null);solidFont(spec).then(f=>{if(live)setFont({font:f.font,key})}).catch(error=>{if(live)reportError('实体文字字形生成失败',error)});return()=>{live=false;markSolidReady(text.instanceId,null)}},[text.instanceId,key,spec])
  const geometry=useMemo(()=>font?.key===key?makeSolidGeometry(spec,font.font):null,[font,key,spec])
  useEffect(()=>{
    if(!geometry||!group.current||!mesh.current)return
    geometry.computeBoundingBox();registerSolidBounds(text,geometry.boundingBox!);markSolidReady(text.instanceId,key)
    const unregister=registerSolidInstance(text.instanceId,group.current,mesh.current)
    return()=>{unregister();removeSolidBounds(text.instanceId);geometry.dispose();markSolidReady(text.instanceId,null)}
  },[geometry,key,text.instanceId]) // content/style is included in key
  const end=(e:ThreeEvent<PointerEvent>,cancel=false)=>{if(!drag.current)return;drag.current=null;useProjectStore.getState().endEditGesture(cancel);(e.target as Element).releasePointerCapture?.(e.pointerId)}
  useEffect(()=>{const cancel=()=>{if(drag.current){drag.current=null;useProjectStore.getState().endEditGesture(true)}};window.addEventListener('blur',cancel);return()=>{window.removeEventListener('blur',cancel);cancel()}},[])
  return <group ref={group} userData={{textId:text.instanceId}} onPointerDown={e=>{
    if(transformOwnsPointer()){e.stopPropagation();return}
    if(e.button!==0||useCameraSession.getState().mode!=='idle')return
    e.stopPropagation();const s=useProjectStore.getState();s.selectObject({kind:'text',instanceId:text.instanceId});s.setPlaying(false)
    const pose=sampleSolidPose(text,s.playhead,s.project.environment.groundY)
    drag.current={plane:new Plane().setFromNormalAndCoplanarPoint(e.camera.getWorldDirection(new Vector3()),e.point),point:e.point.clone(),position:pose.position,rotation:pose.rotation,x:e.clientX,pointer:e.pointerId}
    s.beginEditGesture();(e.target as Element).setPointerCapture?.(e.pointerId)
  }} onPointerMove={e=>{
    const d=drag.current,s=useProjectStore.getState();if(!d||e.pointerId!==d.pointer||!s.editingGesture)return
    e.stopPropagation()
    if(s.canvasTool==='rotate')s.setTextValues({'rotation.y':d.rotation[1]+(e.clientX-d.x)*.01})
    else {const point=e.ray.intersectPlane(d.plane,new Vector3());if(point){const p=d.position.map((v,i)=>v+point.getComponent(i)-d.point.getComponent(i));s.setTextValues({'position.x':p[0],'position.y':p[1],'position.z':p[2]})}}
  }} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} onLostPointerCapture={e=>end(e)}>
    {geometry&&<mesh ref={mesh} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={text.color} roughness={.45} metalness={.05} transparent opacity={1}/></mesh>}
  </group>
}
