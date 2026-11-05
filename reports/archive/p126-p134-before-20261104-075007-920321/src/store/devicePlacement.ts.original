import { Euler, PerspectiveCamera, Vector3 } from 'three'
import { getManifest } from '../devices/manifest'
import { sampleTimeline } from '../timeline/sample'
import { staticTrack } from '../timeline/tracks'
import type { DeviceInstance, DeviceState, Project, Vec3 } from './schema'

type Bounds = { left: number; right: number; bottom: number; top: number }
const viewport: Bounds = { left: -0.96, right: 0.96, bottom: -0.96, top: 0.96 }
const area = (b: Bounds) => Math.max(0, b.right - b.left) * Math.max(0, b.top - b.bottom)
const overlap = (a: Bounds, b: Bounds) => area({
  left: Math.max(a.left, b.left), right: Math.min(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom), top: Math.min(a.top, b.top),
})

/** Project measured body corners; this also accounts for landscape, pose and scale. */
function bounds(device: DeviceInstance, pose: DeviceState, position: Vector3, camera: PerspectiveCamera): Bounds {
  const size = getManifest(device.id).bodySize
  const rotation = new Euler(...pose.rotation)
  const result: Bounds = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity }
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = new Vector3(x * size[0] / 2, y * size[1] / 2, z * size[2] / 2)
    if (device.orientation === 'landscape') corner.applyAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
    corner.multiplyScalar(pose.scale).applyEuler(rotation).add(position).project(camera)
    result.left = Math.min(result.left, corner.x)
    result.right = Math.max(result.right, corner.x)
    result.bottom = Math.min(result.bottom, corner.y)
    result.top = Math.max(result.top, corner.y)
  }
  return result
}

/**
 * Place only the new instance, in the current camera's screen plane.
 * Existing poses/camera stay untouched. A constant offset on every position
 * key preserves an animated duplicate's timing, easing and relative motion.
 */
export function placeNewDevice(project: Project, device: DeviceInstance, time: number, anchorIndex: number): DeviceInstance {
  const scene = sampleTimeline(project, time)
  const pose = sampleTimeline({ ...project, devices: [device] }, time).devices[0]
  const camera = new PerspectiveCamera(scene.camera.fov, project.output.width / project.output.height, 0.01, 1000)
  camera.position.fromArray(scene.camera.position)
  camera.lookAt(new Vector3(...scene.camera.target))
  camera.updateMatrixWorld(true)
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  const forward = camera.getWorldDirection(new Vector3())
  let anchor = new Vector3(...(scene.devices[anchorIndex]?.position ?? scene.camera.target))
  let depth = anchor.clone().sub(camera.position).dot(forward)
  if (depth < 0.1) {
    anchor = new Vector3(...scene.camera.target)
    depth = Math.max(0.1, anchor.clone().sub(camera.position).dot(forward))
  }
  const halfHeight = Math.tan(scene.camera.fov * Math.PI / 360) * depth
  const halfWidth = halfHeight * camera.aspect
  // Start near the selected instance, but pull an off-screen anchor into view.
  const ndc = anchor.clone().project(camera)
  anchor.addScaledVector(right, (Math.max(-0.55, Math.min(0.55, ndc.x)) - ndc.x) * halfWidth)
  anchor.addScaledVector(up, (Math.max(-0.55, Math.min(0.55, ndc.y)) - ndc.y) * halfHeight)
  ndc.copy(anchor).project(camera)

  const initial = bounds(device, pose, anchor, camera)
  const stepX = Math.max(0.15, (initial.right - initial.left + 0.08) * halfWidth)
  const stepY = Math.max(0.15, (initial.top - initial.bottom + 0.08) * halfHeight)
  const occupied = project.devices.map((d, i) => bounds(d, scene.devices[i], new Vector3(...scene.devices[i].position), camera))
  const candidates: Vector3[] = []
  // Prefer a free neighbour to the right, then left, before trying other rows.
  for (const y of [0, -1, 1, -2, 2]) for (const x of [1, -1, 2, -2, 3, -3, 0]) {
    if (x || y) candidates.push(anchor.clone().addScaledVector(right, x * stepX).addScaledVector(up, y * stepY))
  }
  // Crowded/narrow canvases: favour visible partial separation over leaving the frame.
  for (const x of [0.7, -0.7, 0.35, -0.35, 0]) for (const y of [0, -0.35, 0.35]) {
    candidates.push(anchor.clone().addScaledVector(right, (x - ndc.x) * halfWidth).addScaledVector(up, (y - ndc.y) * halfHeight))
  }
  let best = candidates[0]
  let bestScore = Infinity
  for (const candidate of candidates) {
    const box = bounds(device, pose, candidate, camera)
    const outside = Math.max(0, area(box) - overlap(box, viewport))
    const covered = occupied.reduce((total, old) => total + overlap(box, old), 0)
    const identical = scene.devices.some((old) => candidate.distanceToSquared(new Vector3(...old.position)) < 1e-8)
    const score = (outside > 1e-6 ? 1000 : 0) + outside * 10 + covered + (identical ? 100 : 0) + candidate.distanceToSquared(anchor) * 1e-5
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }
  const offset = best.clone().sub(new Vector3(...pose.position)).toArray() as Vec3
  const transform = { ...device.transform }
  for (const [axis, delta] of offset.entries()) {
    const channel = 'position.' + 'xyz'[axis]
    const track = transform[channel]
    transform[channel] = track?.keys.length
      ? { ...track, keys: track.keys.map((key) => ({ ...key, v: key.v + delta })) }
      : staticTrack(delta)
  }
  return { ...device, transform }
}

