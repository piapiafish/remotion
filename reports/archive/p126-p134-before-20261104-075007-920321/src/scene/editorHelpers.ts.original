import type { Object3D, Scene } from 'three'
/** All image, thumbnail and video exports hide editor overlays for the render only. */
export function withoutEditorHelpers<T>(scene: Scene, render: () => T): T {
  const hidden: { object: Object3D; visible: boolean }[] = []
  scene.traverse(object => {
    if (object.userData.editorOnly) { hidden.push({ object, visible: object.visible }); object.visible = false }
  })
  try { return render() } finally { for (const item of hidden) item.object.visible = item.visible }
}
