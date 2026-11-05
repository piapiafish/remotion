import { Euler, Vector3 } from 'three'
import type { Project, SceneState } from '../store/schema'
import { sampleTimeline } from '../timeline/sample'
import { isDisplayed } from '../timeline/displayRange'
import { solidBounds, sampleSolidPose } from './solidBounds'

export function focusReference(project: Project) {
  const dof = project.effects?.depthOfField
  return dof?.focusObject !== undefined ? dof.focusObject : dof?.focusDevice ? { kind: 'device' as const, instanceId: dof.focusDevice } : null
}
export function focusDistance(project: Project, time: number, shownCamera?: SceneState['camera']): number {
  const dof = project.effects?.depthOfField
  if (!dof) return 3.2
  const ref = focusReference(project), state = sampleTimeline(project, time)
  let centre: Vector3 | undefined
  if (ref?.kind === 'device') {
    const index = project.devices.findIndex(d => d.instanceId === ref.instanceId)
    if (index >= 0 && state.devices[index].visible !== false) centre = new Vector3(...state.devices[index].position)
  } else if (ref?.kind === 'text') {
    const text = project.texts?.find(t => t.instanceId === ref.instanceId && t.textKind === 'solid')
    if (text && isDisplayed(text, time, project.duration)) {
      const pose = sampleSolidPose(text, time, project.environment.groundY), box = solidBounds(text)
      centre = box?.getCenter(new Vector3()) ?? new Vector3()
      centre.z *= pose.depth
      centre.multiplyScalar(pose.scale).applyEuler(new Euler(...pose.rotation)).add(new Vector3(...pose.position))
    }
  }
  if (!centre) return dof.distance
  const camera = shownCamera??state.camera, direction = new Vector3(...camera.target).sub(new Vector3(...camera.position)).normalize()
  return Math.max(.1, centre.sub(new Vector3(...camera.position)).dot(direction))
}
/** The same circle-of-confusion rule as the scene shader; radius in output pixels. */
export function stickerBlurRadius(project: Project, time: number, distance: number, height: number) {
  const dof = project.effects?.depthOfField
  if (!dof?.enabled) return 0
  const focus = focusDistance(project, time)
  return Math.min(1, Math.abs(distance - focus) / Math.max(.12, focus * .35)) * dof.strength * 30 * height / 1080
}
