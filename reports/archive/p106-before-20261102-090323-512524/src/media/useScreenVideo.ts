import { useEffect, useState } from 'react'
import type * as THREE from 'three'
import type { MediaRef } from '../store/schema'
import { createScreenVideo, type ScreenVideo } from './screenVideo'

/** Browser/decoder resources belong to an effect, not render-time useMemo.
 * StrictMode replays effects and may discard memo results: creating here
 * ensures the visible texture is live and disposed registrations cannot leak.
 */
export function useScreenVideo(screen: MediaRef | null, renderer: THREE.WebGLRenderer) {
  const [video, setVideo] = useState<ScreenVideo | null>(null)
  useEffect(() => {
    if (screen?.kind !== 'video') {
      setVideo(null)
      return
    }
    const next = createScreenVideo(screen.url, screen.duration ?? 0, renderer)
    setVideo(next)
    return () => next.dispose()
  }, [screen, renderer])
  return video
}
