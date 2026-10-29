/** Private localhost browser bridge used by Playwright worker. Never expose on public deployments. */
import { DEVICE_LIST } from '../devices/manifest'
import { getExportContext } from '../export/renderer'
import { loadBackdrop } from '../export/backdrop'
import { exportVideo, supportedVideoFormats } from '../export/video'
import { exportPngSequence } from '../export/sequence'
import { exportStillPng } from '../export/still'
import { useProjectStore } from '../store/project'
import { hasScreenVideos, seekScreenVideos, waitForScreenVideosReady } from '../media/screenVideo'
import type { Project } from '../store/schema'
import type { ExportQuality } from '../export/frameRenderer'

function wait(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)) }
function assertLocalUrl(project: Project) {
  for(const device of project.devices) {
    const url=device.screen?.url
    if(url && (!url.startsWith('/__automation__/') || url.includes('..') || url.includes('\\'))) throw new Error('Automation only accepts local /__automation__/ assets')
  }
}
function download(blob: Blob, filename: string) {
 const url=URL.createObjectURL(blob)
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove()
 // Delayed cleanup is essential: immediate revoke may cancel browser downloads.
 setTimeout(()=>URL.revokeObjectURL(url),30000)
}
async function waitForReady(timeoutMs=45000){
 const started=performance.now();
 while(performance.now()-started<timeoutMs){
  const ctx=getExportContext();
  if(ctx){
   let hasDevice=false;
   ctx.scene.traverse(obj=>{
     if(obj.userData?.deviceIndex !== undefined){
       obj.traverse(inner=>{if('isMesh' in inner && inner.isMesh) hasDevice=true})
     }
   })
   if(hasDevice){
     const needsVideo=useProjectStore.getState().project.devices.some(d=>d.screen?.kind==='video')
     const videosReady=needsVideo ? (hasScreenVideos() && await waitForScreenVideosReady(750)) : true
     if(videosReady){
       // Wait for React material effects to apply before first frame.
       await wait(200);return {ready:true,deviceCount:useProjectStore.getState().project.devices.length};
     }
   }
  }
  await wait(120)
 }
 throw new Error('MODEL_OR_VIDEO_NOT_READY: timed out waiting for device meshes and decoded screen frame')
}
async function commonParams(quality:ExportQuality){
 const ctx=getExportContext();if(!ctx)throw new Error('RENDER_CONTEXT_MISSING')
 const p=useProjectStore.getState().project
 return {
  renderer:ctx.renderer,scene:ctx.scene,camera:ctx.camera,
  setFrameloop:ctx.setFrameloop,applyAt:ctx.applyAt,
  width:p.output.width,height:p.output.height,duration:p.duration,fps:p.fps,
  backdrop:await loadBackdrop(p.background),quality,
 }
}
async function previewFrame(frameIndex=0,quality:ExportQuality='standard'){
 await waitForReady()
 const p=useProjectStore.getState().project
 const ctx=getExportContext();if(!ctx)throw new Error('RENDER_CONTEXT_MISSING')
 const t=Math.max(0,Math.min(frameIndex,p.duration*p.fps-1))/p.fps
 ctx.applyAt(t)
 if(hasScreenVideos())await seekScreenVideos(t)
 const params=await commonParams(quality)
 const blob=await exportStillPng(params)
 const base64=await new Promise<string>((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(String(f.result));f.onerror=()=>reject(f.error);f.readAsDataURL(blob)})
 return base64
}
export function installAutomationBridge(){
 // The bridge exists only on localhost and opt-in ?automation=1; external sites never get it.
 if(!new URLSearchParams(location.search).has('automation') || !['localhost','127.0.0.1'].includes(location.hostname))return
 const api={
  ping:()=>({ok:true,version:'0.1.0'}),
  listDevices:()=>DEVICE_LIST.filter(d=>d.glb).map(d=>({id:d.id,name:d.name,category:d.category})),
  async loadProject(project:Project){
    if(!project || project.version!==1 || !Array.isArray(project.devices) || project.devices.length!==1) throw new Error('INVALID_PROJECT')
    assertLocalUrl(project)
    useProjectStore.setState({project,editorMode:'movie',playhead:0,playing:false})
    // Allow the subscription to commit the newly selected GLB before probing readiness.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))
    return await waitForReady()
  },
  waitForReady,
  previewFrame,
  async renderDownload(filename='shot.mp4',quality:ExportQuality='standard'){
   await waitForReady()
   const params=await commonParams(quality)
   const formats=await supportedVideoFormats(params.width,params.height,params.fps,quality)
   if(!formats.includes('mp4')) throw new Error('MP4_UNSUPPORTED: fallback to frame ZIP')
   const video=await exportVideo({...params,format:'mp4'})
   if(video.size<1024)throw new Error('OUTPUT_EMPTY')
   download(video,filename)
   return {ok:true,size:video.size,format:'mp4'}
  },
  async framesDownload(filename='frames.zip',quality:ExportQuality='standard'){
   await waitForReady();const params=await commonParams(quality)
   const frames=await exportPngSequence(params)
   if(frames.size<1024) throw new Error('FRAME_ZIP_EMPTY')
   download(frames,filename)
   return {ok:true,size:frames.size,format:'png-zip'}
  },
 }
 Object.defineProperty(window,'__PROMO_BRIDGE__',{value:api,configurable:false,enumerable:false})
}
