import type { CameraConfig, CameraSegment, SceneState, TrackSet } from '../store/schema'
import { sampleTrack } from './sample'
import { staticTrack, staticVec3 } from './tracks'

/** Keys inside a segment use local seconds; every consumer samples this same clock. */
function poseAt(tracks: TrackSet, t: number, fov: number): SceneState['camera'] {
  const vector = (prefix: string, fallback: [number, number, number]): [number, number, number] =>
    fallback.map((v, i) => sampleTrack(tracks[prefix + '.' + 'xyz'[i]], t, v)) as [number, number, number]
  return { position: vector('position', [0, 0, 3.2]), target: vector('target', [0, 0, 0]), fov: sampleTrack(tracks.fov, t, fov) }
}
export function cameraSegments(camera: CameraConfig): CameraSegment[] {
  if (camera.segments !== undefined) return camera.segments
  const animated = Object.values(camera.tracks).some(t => t.keys.length > 1)
  const end = Math.max(0, ...Object.values(camera.tracks).flatMap(t => t.keys.map(k => k.t)))
  return animated && end > 0 ? [{ id: 'legacy-camera', name: '原有相机动画', start: 0, end, tracks: camera.tracks }] : []
}
export function sampleCamera(camera: CameraConfig, time: number): SceneState['camera'] {
  if (camera.segments === undefined) return poseAt(camera.tracks, time, camera.fov)
  let pose = poseAt(camera.tracks, 0, camera.fov)
  for (const segment of camera.segments) {
    if (time < segment.start) break
    pose = poseAt(segment.tracks, Math.min(time - segment.start, segment.end - segment.start), pose.fov)
    if (time < segment.end) break
  }
  return pose
}
export function segmentedCamera(camera: CameraConfig): CameraConfig {
  if (camera.segments !== undefined) return camera
  const base = poseAt(camera.tracks, 0, camera.fov)
  return { ...camera, segments: cameraSegments(camera), tracks: { ...staticVec3('position', base.position), ...staticVec3('target', base.target), fov: staticTrack(base.fov) } }
}
export function insertCameraSegment(camera: CameraConfig, segment: CameraSegment, replaceId?: string): CameraConfig {
  const base = segmentedCamera(camera), others = base.segments!.filter(s => s.id !== replaceId)
  if (others.some(s => s.start < segment.end - 1e-8 && segment.start < s.end - 1e-8)) throw new Error('相机动画不能重叠，请选择空白时间，或重新录制已有的一段。')
  return { ...base, preset: null, animationEnabled: true, segments: [...others, segment].sort((a, b) => a.start - b.start) }
}
export function recordingWindow(camera: CameraConfig, start: number, duration: number, replaceId?: string) {
  const segments = cameraSegments(camera), selected = segments.find(s => s.id === replaceId)
  if (selected) return selected.start>=duration?null:{ start: selected.start, end: Math.min(duration,selected.end) }
  if (segments.some(s => start >= s.start - 1e-8 && start < s.end - 1e-8)) return null
  return { start, end: Math.min(duration, ...segments.filter(s => s.start > start).map(s => s.start)) }
}
export function localCameraTracks(tracks: TrackSet, start: number): TrackSet {
  return Object.fromEntries(Object.entries(tracks).map(([c, t]) => [c, { ...t, keys: t.keys.map(k => ({ ...k, t: Math.max(0, k.t - start) })) }]))
}
