import { useFrame } from '@react-three/fiber'
import { useProjectStore } from '../store/project'
import { useExportSession } from '../export/session'
import { isDisplayed } from '../timeline/displayRange'
import { useEffect, useState } from 'react'
import type * as THREE from 'three'
import type { MediaRef, ScreenPlayback } from '../store/schema'
import { createScreenVideo, updateScreenPlayback, type ScreenVideo } from './screenVideo'

/** Browser/decoder resources belong to an effect, not render-time useMemo.
 * StrictMode replays effects and may discard memo results: creating here
 * ensures the visible texture is live and disposed registrations cannot leak.
 */
export function useScreenVideo(screen: MediaRef | null, renderer: THREE.WebGLRenderer, playback?: ScreenPlayback, instanceId?:string) {
  const [awake,setAwake]=useState(true),busy=useExportSession(s=>s.busy)
  const [video, setVideo] = useState<ScreenVideo | null>(null)
  useFrame(()=>{const s=useProjectStore.getState(),device=s.project.devices.find(d=>d.instanceId===instanceId);const on=!device?.displayRange||s.playhead>=device.displayRange.start-.5&&s.playhead<device.displayRange.end;if(on!==awake)setAwake(on)})
  useEffect(() => {
    if ((!awake&&!busy)||screen?.kind !== 'video' || screen.missing || !screen.url) {
      setVideo(null)
      return
    }
    const next = createScreenVideo(screen.url, screen.duration ?? 0, renderer)
    next.activeAt=t=>{const d=useProjectStore.getState().project.devices.find(d=>d.instanceId===instanceId);return !d||isDisplayed(d,t,useProjectStore.getState().project.duration)}
    setVideo(next)
    return () => next.dispose()
  }, [screen?.id, screen?.url, screen?.duration, screen?.kind, screen?.missing, renderer,awake,busy,instanceId])
  useEffect(() => { if (video) updateScreenPlayback(video, playback) }, [video, playback])
  return video
}
