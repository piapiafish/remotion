import { setEditorControls, releaseEditorControls, setEditorOutline, applyEditorPresence } from './editorPointer'
import { useCameraSession } from '../store/cameraSession'
import { TransformControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitImpl, TransformControls as TransformImpl } from 'three-stdlib'
import { useProjectStore } from '../store/project'
import { sampleTimeline } from '../timeline/sample'
import { nearestEuler } from './transformValues'
import { getSolidInstance } from './solidInstances'
import { sampleSolidPose } from './solidBounds'
import { isDisplayed } from '../timeline/displayRange'

/** Phone and solid text share one set of editor-only selection and axis controls. */
export function DeviceControls({ deviceRefs, orbitingRef, controlsRef }: {
  deviceRefs: RefObject<(THREE.Group | null)[]>;orbitingRef: RefObject<boolean>;controlsRef: RefObject<OrbitImpl | null>
}) {
  const s=useProjectStore(),tool=s.canvasTool,ref=s.activeObject
  const proxy=useMemo(()=>new THREE.Group(),[])
  const outline=useMemo(()=>{const h=new THREE.BoxHelper(new THREE.Group(),0x80aaff);h.userData.editorOnly=true;h.raycast=()=>{};return h},[])
  const controls=useRef<TransformImpl>(null),drag=useRef<{id:string;rotation:[number,number,number]}|null>(null)
  function finish(cancel=false){if(!drag.current)return;drag.current=null;useProjectStore.getState().endEditGesture(cancel);if(cancel)controls.current?.reset()}
  useEffect(()=>{const cancel=()=>finish(true),key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel()};window.addEventListener('keydown',key);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);finish(true)}},[ref?.instanceId,tool])
  useEffect(()=>{setEditorOutline(outline);return()=>{setEditorOutline(null);outline.geometry.dispose();(outline.material as THREE.Material).dispose()}},[outline])
  const assignControls=useCallback((v:TransformImpl|null)=>{const previous=controls.current;if(previous&&previous!==v){releaseEditorControls(previous);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();previous.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}if(v){v.userData.editorOnly=true;setEditorControls(v)}controls.current=v},[])
  useFrame(()=>{
    const state=useProjectStore.getState(),active=state.activeObject,text=active?.kind==='text'?state.project.texts?.find(t=>t.instanceId===active.instanceId):undefined
    if(controlsRef.current)controlsRef.current.enabled=!active&&(!state.editingGesture||orbitingRef.current)
    const scene=sampleTimeline(state.project,state.playhead),session=useCameraSession.getState()
    if(!orbitingRef.current)controlsRef.current?.target.set(...(session.view??scene.camera).target)
    const group=active?.kind==='device'?deviceRefs.current[state.activeDevice]:active?getSolidInstance(active.instanceId)?.group:undefined
    const owner=active?.kind==='device'?state.project.devices[state.activeDevice]:text
    const activeNow=!!owner&&isDisplayed(owner,state.playhead,state.project.duration)&&!!group?.parent&&!state.playing&&session.mode==='idle'
    applyEditorPresence(activeNow)
    outline.visible=activeNow
    if(group&&outline.visible)outline.setFromObject(group)
    const pose=text?.textKind==='solid'?sampleSolidPose(text,state.playhead,state.project.environment.groundY):active?.kind==='device'?scene.devices[state.activeDevice]:undefined
    if(!pose||drag.current)return
    proxy.position.set(...pose.position);proxy.rotation.set(...pose.rotation);proxy.scale.setScalar(pose.scale);proxy.updateMatrixWorld()
  })
  return <><primitive object={proxy}/><primitive object={outline}/>{(tool==='translate'||tool==='rotate')&&<TransformControls object={proxy} ref={assignControls} mode={tool} space="local" size={.8}
    onMouseDown={()=>{const active=useProjectStore.getState().activeObject;if(!active)return;useProjectStore.getState().beginEditGesture();drag.current={id:active.instanceId,rotation:proxy.rotation.toArray().slice(0,3) as [number,number,number]}}}
    onObjectChange={()=>{
      const d=drag.current,state=useProjectStore.getState();if(!d||!state.editingGesture||state.activeObject?.instanceId!==d.id)return
      if(tool==='translate'){const p=proxy.position.toArray();if(state.activeObject?.kind==='device')state.setDevicePosition(p);else state.setTextValues({'position.x':p[0],'position.y':p[1],'position.z':p[2]})}
      if(tool==='rotate'){d.rotation=nearestEuler(proxy.quaternion,d.rotation);if(state.activeObject?.kind==='device')state.setDeviceRotation(d.rotation);else state.setTextValues(Object.fromEntries(d.rotation.map((v,i)=>['rotation.'+'xyz'[i],v])))}
    }} onMouseUp={()=>finish()}/>}</>
}
