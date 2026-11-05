import type { Group, Object3D } from 'three'
/** Retain the owner outside the render tree so arbitrary export samples can reattach synchronously. */
const parents = new WeakMap<Object3D, Object3D>()
export function applyObjectPresence(group: Group, active: boolean) {
  if (group.parent) parents.set(group, group.parent)
  if (active) { if (!group.parent) parents.get(group)?.add(group) }
  else group.removeFromParent()
  group.visible = active
}
