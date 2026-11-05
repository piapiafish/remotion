import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { MediaRef, ScreenClip } from '../store/schema'
import { useProjectStore } from '../store/project'
import { isDisplayed } from '../timeline/displayRange'
import { clipPlayback, clipVisible, deviceClips } from './screenClips'
import { createScreenVideo, registerScreenPipeline, type ScreenVideo, updateScreenPlayback } from './screenVideo'

/** One reusable screen texture, with per-clip decoders outside the Three render tree. */
export function useMultiScreen(instanceId:string|undefined,aspect:number,gl:THREE.WebGLRenderer,enabled:boolean) {
  const runtime=useMemo(()=>{
    if(!enabled||!instanceId)return null
    const height=1920,width=Math.max(256,Math.round(height*aspect))
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
    const ctx=canvas.getContext('2d')!
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=gl.capabilities.getMaxAnisotropy()
    const ref:MediaRef={id:'composite-'+instanceId,kind:'image',width,height,url:'studio-composite:'+instanceId}
    return {canvas,ctx,texture,ref}
  },[enabled,instanceId,aspect,gl])
  useEffect(()=>{
    if(!runtime||!instanceId)return
    const videos=new Map<string,{source:string;video:ScreenVideo}>()
    let image:HTMLImageElement|null=null,imageUrl=''
    const device=()=>useProjectStore.getState().project.devices.find(d=>d.instanceId===instanceId)
    const prepare=(time:number)=>{
      const d=device(),clips=d?deviceClips(d,useProjectStore.getState().project.duration):[]
      const range=d?.displayRange??{start:0,end:useProjectStore.getState().project.duration}
      const warm=!!d&&time>=range.start-.5&&time<range.end
      const wanted=new Set<string>()
      for(const clip of clips){
        if(!warm||time<clip.displayRange.start-.5||time>=clip.displayRange.end||clip.media.missing||!clip.media.url)continue
        wanted.add(clip.clipId);let entry=videos.get(clip.clipId)
        if(entry?.source!==clip.media.url){entry?.video.dispose();const video=createScreenVideo(clip.media.url,clip.media.duration??0,gl,clipPlayback(clip));video.clipId=clip.clipId;video.instanceId=instanceId
          video.activeAt=t=>{const current=device(),c=current?deviceClips(current,useProjectStore.getState().project.duration).find(c=>c.clipId===clip.clipId):undefined;return !!current&&!!c&&isDisplayed(current,t,useProjectStore.getState().project.duration)&&clipVisible(c,t)}
          entry={source:clip.media.url,video};videos.set(clip.clipId,entry)
        }
        updateScreenPlayback(entry.video,clipPlayback(clip))
      }
      for(const [id,entry] of videos)if(!wanted.has(id)){entry.video.dispose();videos.delete(id)}
      const url=d?.screen?.kind==='image'&&!d.screen.missing?d.screen.url:''
      if(url!==imageUrl){imageUrl=url;image=url?new Image():null;if(image)image.src=url}
    }
    const draw=(source:CanvasImageSource,w:number,h:number,fit:'cover'|'contain')=>{
      const {ctx,canvas}=runtime
      const ratio=Math.abs(w/h-aspect)/aspect<=.15?null:fit==='contain'?Math.min(canvas.width/w,canvas.height/h):Math.max(canvas.width/w,canvas.height/h)
      if(ratio===null)ctx.drawImage(source,0,0,canvas.width,canvas.height)
      else {const dw=w*ratio,dh=h*ratio;ctx.drawImage(source,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh)}
    }
    let paintedDevice:ReturnType<typeof device>|null=null,paintedKey=''
    const paint=(time:number)=>{
      const {ctx,canvas,texture}=runtime,d=device()
      const key=String(image?.complete)+':'+String(image?.naturalWidth)+':'+(d&&isDisplayed(d,time,useProjectStore.getState().project.duration)?deviceClips(d,useProjectStore.getState().project.duration).filter(c=>clipVisible(c,time)).map(c=>{const v=videos.get(c.clipId)?.video.el;return c.clipId+':'+v?.currentTime+':'+v?.seeking+':'+v?.readyState}).join('|'):'absent')
      if(paintedDevice===d&&paintedKey===key)return
      paintedDevice=d;paintedKey=key;ctx.fillStyle='#0a0a0c';ctx.fillRect(0,0,canvas.width,canvas.height)
      if(image?.complete&&image.naturalWidth)draw(image,image.naturalWidth,image.naturalHeight,d?.screenFit??'contain')
      if(d&&isDisplayed(d,time,useProjectStore.getState().project.duration))for(const clip of deviceClips(d,useProjectStore.getState().project.duration).reverse()){
        const v=videos.get(clip.clipId)?.video.el
        if(clipVisible(clip,time)&&v&&v.readyState>=2)draw(v,v.videoWidth,v.videoHeight,clip.fit)
      }
      texture.needsUpdate=true
    }
    const unregister=registerScreenPipeline({prepare,paint,ready:time=>{
      const d=device();if(!d||!isDisplayed(d,time,useProjectStore.getState().project.duration))return true
      if(imageUrl&&(!image?.complete||!image.naturalWidth))return false
      return deviceClips(d,useProjectStore.getState().project.duration).filter(c=>clipVisible(c,time)).every((c:ScreenClip)=>{const v=videos.get(c.clipId)?.video.el;return !!v&&v.readyState>=2&&!v.error})
    }})
    return()=>{unregister();for(const entry of videos.values())entry.video.dispose();if(image)image.src='';runtime.texture.dispose()}
  },[runtime,instanceId,gl])
  return runtime
}
