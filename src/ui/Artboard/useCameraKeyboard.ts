import { useEffect } from 'react'
import { useProjectStore } from '../../store/project'
import { useCameraSession } from '../../store/cameraSession'
import { sampleTimeline } from '../../timeline/sample'
import { useExportSession } from '../../export/session'
import { useReplacement } from '../../store/replacement'
import { moveCamera } from '../../scene/cameraMotion'
const keys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])
export function useCameraKeyboard(board:React.RefObject<HTMLDivElement|null>){
  useEffect(()=>{
    const held=new Set<string>(),cancelled=new Set<string>();let frame=0,last=0,fine=false,initialView=useCameraSession.getState().view
    const stop=(cancel=false)=>{if(cancel)held.forEach(code=>cancelled.add(code));held.clear();cancelAnimationFrame(frame);frame=0;last=0;if(useCameraSession.getState().mode==='idle'){useProjectStore.getState().endEditGesture(cancel);if(cancel)useCameraSession.setState({view:initialView})}}
    const tick=(now:number)=>{
      const s=useProjectStore.getState(),session=useCameraSession.getState()
      if(session.mode==='countdown'||session.mode==='review'||!held.size||useExportSession.getState().busy||useReplacement.getState().pending||document.querySelector('[aria-modal=true]')||!board.current?.contains(document.activeElement)){stop();return}
      const dt=last?Math.min(.25,(now-last)/1000):1/60;last=now
      const pose=moveCamera(session.view??sampleTimeline(s.project,s.playhead).camera,held,dt,session.speed,fine)
      s.setCameraPose(pose);frame=requestAnimationFrame(tick)
    }
    const down=(e:KeyboardEvent)=>{
      // Global undo may already have consumed Escape. Still stop this controller immediately.
      if(e.key==='Escape'&&held.size){e.preventDefault();stop(true);return}
      if(cancelled.has(e.code)){if(e.repeat)return;cancelled.delete(e.code)}
      if(e.isComposing||e.defaultPrevented||/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)||(e.target as HTMLElement).isContentEditable||e.ctrlKey||e.metaKey||e.altKey)return
      if(e.key==='Shift'){fine=true;return}
      const s=useProjectStore.getState();if(!board.current?.contains(document.activeElement)||!keys.has(e.code)||useExportSession.getState().busy||useReplacement.getState().pending||document.querySelector('[aria-modal=true]'))return
      if(['countdown','review'].includes(useCameraSession.getState().mode))return
      e.preventDefault();fine=e.shiftKey;held.add(e.code)
      if(!frame){initialView=useCameraSession.getState().view;if(useCameraSession.getState().mode==='idle')s.beginEditGesture();frame=requestAnimationFrame(tick)}
    }
    const up=(e:KeyboardEvent)=>{held.delete(e.code);cancelled.delete(e.code);fine=e.shiftKey;if(!held.size&&frame)stop()}
    const blur=()=>{held.forEach(code=>cancelled.add(code));stop()};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur)
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);stop()}
  },[board])
}
