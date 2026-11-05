import { insertCameraSegment } from './cameraSegments'
import { EASE_LINEAR, EASE_OUT, EASE_SMOOTH } from './easing'
import { sampleTimeline, sampleTrack } from './sample'
import { staticTrack, staticVec3 } from './tracks'
import { CAMERA_PRESETS, type CameraAnglePreset, type Project, type Track, type TrackSet } from '../store/schema'

// Presets are keyframe *generators*, never a parallel runtime path (§8.2).
// Applying one writes keys into a track set and then gets out of the way, so
// anything a preset produces the user can immediately drag, retime, or
// re-ease like hand-authored animation. One code path, no "preset mode".

export type MotionPresetId =
  | 'none'
  | 'float'
  | 'spin-y-360'
  | 'tilt-in'
  | 'slide-in-left'
  | 'hero-reveal'
  | 'orbit'

export const MOTION_PRESETS: { id: MotionPresetId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'float', label: 'Float' },
  { id: 'spin-y-360', label: 'Spin 360°' },
  { id: 'tilt-in', label: 'Tilt In' },
  { id: 'slide-in-left', label: 'Slide In' },
  { id: 'hero-reveal', label: 'Hero Reveal' },
  { id: 'orbit', label: 'Orbit' },
]

const TAU = Math.PI * 2

/** Camera angle presets collapse to a single key — a static pose. */
export function cameraTracksForAngle(preset: CameraAnglePreset, fov: number): TrackSet {
  return {
    ...staticVec3('position', CAMERA_PRESETS[preset].position),
    ...staticVec3('target', [0, 0, 0]),
    fov: staticTrack(fov),
  }
}

export function applyCameraAngle(project: Project, preset: CameraAnglePreset): Project {
  return {
    ...project,
    camera: {
      ...project.camera,
      preset,
      segments: [],
      animationEnabled: false,
      tracks: cameraTracksForAngle(preset, project.camera.fov),
    },
  }
}

function restDeviceTracks(): TrackSet {
  return {
    ...staticVec3('position', [0, 0, 0]),
    ...staticVec3('rotation', [0, 0, 0]),
    scale: staticTrack(1),
  }
}

/**
 * Build the device tracks for a motion preset over `duration` seconds.
 * Every preset starts from rest and overwrites only the channels it drives,
 * so switching presets never leaves a stray key on an unrelated axis.
 */
export function deviceTracksForMotion(preset: MotionPresetId, duration: number): TrackSet {
  const d = duration
  const base = restDeviceTracks()

  switch (preset) {
    case 'none':
      return base

    case 'float':
      // Loops cleanly: same value at both ends, eased at the turnaround.
      return {
        ...base,
        'position.y': {
          keys: [
            { t: 0, v: 0, ease: EASE_SMOOTH },
            { t: d / 2, v: 0.07, ease: EASE_SMOOTH },
            { t: d, v: 0, ease: EASE_SMOOTH },
          ],
        },
      }

    case 'spin-y-360':
      // Linear, and 0 -> TAU rather than 0 -> 0. Per-axis Euler lerp means
      // this reads as exactly one revolution (§8.1).
      return {
        ...base,
        'rotation.y': {
          keys: [
            { t: 0, v: 0, ease: EASE_LINEAR },
            { t: d, v: TAU, ease: EASE_LINEAR },
          ],
        },
      }

    case 'tilt-in':
      return {
        ...base,
        'rotation.y': {
          keys: [
            { t: 0, v: -0.55, ease: EASE_OUT },
            { t: d * 0.7, v: 0, ease: EASE_SMOOTH },
          ],
        },
        'rotation.x': {
          keys: [
            { t: 0, v: 0.22, ease: EASE_OUT },
            { t: d * 0.7, v: 0, ease: EASE_SMOOTH },
          ],
        },
      }

    case 'slide-in-left':
      return {
        ...base,
        'position.x': {
          keys: [
            { t: 0, v: -2.4, ease: EASE_OUT },
            { t: d * 0.55, v: 0, ease: EASE_SMOOTH },
          ],
        },
      }

    case 'hero-reveal':
      return {
        ...base,
        scale: {
          keys: [
            { t: 0, v: 0.86, ease: EASE_SMOOTH },
            { t: d * 0.6, v: 1, ease: EASE_SMOOTH },
          ],
        },
        'position.y': {
          keys: [
            { t: 0, v: -0.28, ease: EASE_SMOOTH },
            { t: d * 0.6, v: 0, ease: EASE_SMOOTH },
          ],
        },
        'rotation.y': {
          keys: [
            { t: 0, v: 0.45, ease: EASE_SMOOTH },
            { t: d * 0.75, v: 0, ease: EASE_SMOOTH },
          ],
        },
      }

    case 'orbit':
      return base // orbit drives the camera, not the device — see below
  }
}

/**
 * Orbit is the one preset that moves the camera instead of the device.
 * A circle can't be expressed by two bezier segments, so sample it into
 * evenly spaced linear keys — 12 steps is under half a degree of chord
 * error at any radius we use, and it stays editable as ordinary keyframes.
 */
export function cameraTracksForOrbit(radius: number, height: number, duration: number): TrackSet {
  const STEPS = 12
  const x: { t: number; v: number; ease: typeof EASE_LINEAR }[] = []
  const z: { t: number; v: number; ease: typeof EASE_LINEAR }[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * duration
    const angle = (i / STEPS) * TAU
    x.push({ t, v: Math.sin(angle) * radius, ease: EASE_LINEAR })
    z.push({ t, v: Math.cos(angle) * radius, ease: EASE_LINEAR })
  }
  return {
    'position.x': { keys: x },
    'position.y': staticTrack(height),
    'position.z': { keys: z },
    ...staticVec3('target', [0, 0, 0]),
  }
}

export type MotionPresetOptions = { deviceId?: string; start?: number; duration?: number }
export const PRESET_CHANNELS: Record<MotionPresetId, string[]> = {
  none: ['position.x', 'position.y', 'position.z', 'rotation.x', 'rotation.y', 'rotation.z', 'scale'],
  float: ['position.y'],
  'spin-y-360': ['rotation.y'],
  'tilt-in': ['rotation.x', 'rotation.y'],
  'slide-in-left': ['position.x'],
  'hero-reveal': ['scale', 'position.y', 'rotation.y'],
  orbit: ['position.x', 'position.y', 'position.z'],
}

/** Replace keys only in the chosen range; outer keys retain their values/eases and connect to the new boundary keys. */
function mergeRange(original: Track | undefined, generated: Track, start: number, duration: number): Track {
  const end = start + duration
  const keys = generated.keys.map(k => ({ ...k, t: start + k.t }))
  if (keys.at(-1)!.t < end - 1e-6) keys.push({ ...keys.at(-1)!, t: end })
  return { ...original, keys: [...(original?.keys.filter(k => k.t < start - 1e-6 || k.t > end + 1e-6) ?? []), ...keys].sort((a, b) => a.t - b.t) }
}

/** Device motion defaults to one instance. Orbit explicitly changes camera position only. */
export function applyMotionPreset(project: Project, preset: MotionPresetId, options: MotionPresetOptions = {}): Project {
  if (!Object.hasOwn(PRESET_CHANNELS, preset)) return project
  const start = options.start ?? 0
  const duration = options.duration ?? project.duration - start
  if (!Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || duration <= 0 || start + duration > project.duration + 1e-6) return project
  const state = sampleTimeline(project, start)
  if (preset === 'orbit') {
    const { position, target } = state.camera
    const dx = position[0] - target[0], dz = position[2] - target[2]
    const radius = Math.max(0.1, Math.hypot(dx, dz)), phase = Math.atan2(dx, dz)
    const motion: TrackSet = {}
    for (const channel of PRESET_CHANNELS.orbit) motion[channel] = { keys: [] }
    for (let i = 0; i <= 12; i++) {
      const angle = phase + i / 12 * TAU, t = duration * i / 12
      motion['position.x'].keys.push({ t, v: target[0] + Math.sin(angle) * radius, ease: EASE_LINEAR })
      motion['position.y'].keys.push({ t, v: position[1], ease: EASE_LINEAR })
      motion['position.z'].keys.push({ t, v: target[2] + Math.cos(angle) * radius, ease: EASE_LINEAR })
    }
    if(project.camera.segments!==undefined){const tracks={...motion,...staticVec3('target',target),fov:staticTrack(state.camera.fov)};return {...project,camera:insertCameraSegment(project.camera,{id:crypto.randomUUID(),name:'环绕镜头',start,end:start+duration,tracks})}}
    const tracks = { ...project.camera.tracks }
    for (const channel of PRESET_CHANNELS.orbit) tracks[channel] = mergeRange(tracks[channel], motion[channel], start, duration)
    return { ...project, camera: { ...project.camera, segments:undefined, preset: null, tracks } }
  }
  const deviceId = options.deviceId ?? project.devices[0]?.instanceId
  const index = project.devices.findIndex(d => d.instanceId === deviceId)
  if (index < 0) return project
  const device = project.devices[index], transform = { ...device.transform }
  const motion = deviceTracksForMotion(preset, duration)
  for (const channel of PRESET_CHANNELS[preset]) {
    const base = sampleTrack(device.transform[channel], start, channel === 'scale' ? 1 : 0)
    const generated = { keys: motion[channel].keys.map(k => ({ ...k, v: channel === 'scale' ? base * k.v : base + k.v })) }
    transform[channel] = mergeRange(device.transform[channel], generated, start, duration)
  }
  return { ...project, devices: project.devices.map(d => d.instanceId === deviceId ? { ...d, transform } : d) }
}
