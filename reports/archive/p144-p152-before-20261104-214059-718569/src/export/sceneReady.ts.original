import type { Mesh, Scene, ShaderMaterial, Texture } from 'three'
import type { Project } from '../store/schema'
import { getManifest } from '../devices/manifest'
import { isModelReady } from '../scene/modelReadiness'
import { ExportFailure } from './exportError'
import { isDisplayed } from '../timeline/displayRange'

/** Only objects belonging to this sample must be in the render tree. */
export function assertSceneReady(scene:Scene,project:Project,time=0) {
  const expected=project.devices.map((d,i)=>isDisplayed(d,time,project.duration)?i:-1).filter(i=>i>=0),ready=new Set<number>()
  scene.traverse(group=>{
    const index=group.userData.deviceIndex
    if(typeof index!=='number'||!expected.includes(index))return
    const d=project.devices[index],manifest=getManifest(d.id)
    let modelReady=!manifest.glb,screenReady=d.screenClips!==undefined||!d.screen
    group.traverse(obj=>{
      if(manifest.glb&&isModelReady(obj,manifest.glb))modelReady=true
      if(!(obj as Mesh).isMesh)return
      const m=(obj as Mesh).material
      for(const mat of Array.isArray(m)?m:[m]){
        const material=mat as ShaderMaterial&{map?:Texture},texture=material.uniforms?.map?.value??material.map,image=texture?.image
        if(!d.screen||!image||(image.currentSrc||image.src)!==d.screen.url)continue
        if(d.screen.kind==='video'?image.readyState>=2&&image.videoWidth>0:image.width>0&&image.height>0)screenReady=true
      }
    })
    if(modelReady&&screenReady)ready.add(index)
  })
  if(ready.size!==expected.length)throw new ExportFailure('prepare','模型或屏幕素材尚未就绪，请等待加载完成后重试')
}
export async function waitForSceneReady(scene:Scene,project:Project,timeoutMs=10000,signal?:AbortSignal,time=0){
  const start=performance.now()
  for(;;){signal?.throwIfAborted();try{assertSceneReady(scene,project,time);return}catch(error){if(performance.now()-start>=timeoutMs)throw error;await new Promise(resolve=>setTimeout(resolve,30))}}
}
