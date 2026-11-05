import { Euler, type Quaternion } from 'three'
import type { Vec3 } from '../store/schema'

/** Lift quaternion decompositions to the nearest equivalent Euler branch, retaining full turns. */
export function nearestEuler(quaternion: Quaternion, previous: Vec3): Vec3 {
  const e = new Euler().setFromQuaternion(quaternion, 'XYZ')
  const candidates = [[e.x, e.y, e.z], [e.x + Math.PI, Math.PI - e.y, e.z + Math.PI]]
  const lifted = candidates.map(values => values.map((v, i) =>
    v + Math.round((previous[i] - v) / (2 * Math.PI)) * 2 * Math.PI) as Vec3)
  return lifted.reduce((a, b) => b.reduce((sum, v, i) => sum + (v - previous[i]) ** 2, 0)
    < a.reduce((sum, v, i) => sum + (v - previous[i]) ** 2, 0) ? b : a)
}
/** A handle on any scale axis changes the one uniform scale in the document. */
export function uniformScale(values: Vec3, initial: number): number {
  const changed = values.reduce((a, b) => Math.abs(b - initial) > Math.abs(a - initial) ? b : a)
  return Math.max(0.05, Number.isFinite(changed) ? changed : initial)
}
