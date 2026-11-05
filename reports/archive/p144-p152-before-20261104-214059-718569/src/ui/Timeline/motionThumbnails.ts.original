import * as THREE from 'three'
import { getExportContext } from '../../export/renderer'
import { isFrameExportActive } from '../../export/frameRenderer'
import { getManifest } from '../../devices/manifest'
import { isModelReady } from '../../scene/modelReadiness'
import { useProjectStore } from '../../store/project'
import type { Project } from '../../store/schema'

/** Read the real preview scene into a small offscreen target; never seek the UI playhead. */
function capture(t: number, project: Project): string | null {
  const context = getExportContext()
  if (!context || useProjectStore.getState().project !== project) return null
  const { renderer, scene, camera, applyAt } = context
  // Models and their materials arrive asynchronously after a plan is applied.
  let ready = false
  scene.traverseVisible(obj => {
    if (obj.userData.deviceIndex !== 0) return
    obj.traverseVisible(child => {
      if (isModelReady(child, getManifest(project.devices[0].id).glb!)) ready = true
    })
  })
  if (!ready || !(camera instanceof THREE.PerspectiveCamera)) return null
  const ratio = project.output.width / project.output.height
  const width = Math.round(128 * Math.min(1, ratio))
  const height = Math.round(width / ratio)
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true })
  target.texture.colorSpace = THREE.SRGBColorSpace
  const previousTarget = renderer.getRenderTarget()
  try {
    applyAt(t)
    const thumbnailCamera = camera.clone()
    thumbnailCamera.aspect = ratio
    thumbnailCamera.updateProjectionMatrix()
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, thumbnailCamera)
    const pixels = new Uint8Array(width * height * 4)
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const image = ctx.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      image.data.set(pixels.subarray((height - y - 1) * width * 4, (height - y) * width * 4), y * width * 4)
    }
    ctx.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png')
  } finally {
    renderer.setRenderTarget(previousTarget)
    applyAt(useProjectStore.getState().playhead)
    target.dispose()
  }
}

/** Cancel stale work on edits. Yield between frames so playback and scrubbing stay responsive. */
export function renderMotionThumbnails(
  project: Project,
  times: number[],
  onFrame: (t: number, url: string) => void,
  onError: () => void,
): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout>
  let index = 0
  let waitingSince = performance.now()
  function next() {
    if (cancelled || useProjectStore.getState().project !== project) return
    if (isFrameExportActive() || useProjectStore.getState().playing) {
      waitingSince = performance.now()
      timer = setTimeout(next, 150)
      return
    }
    try {
      const result = capture(times[index], project)
      if (result) { onFrame(times[index], result); index++; waitingSince = performance.now() }
      if (index < times.length) {
        if (performance.now() - waitingSince > 45000) { onError(); return }
        timer = setTimeout(next, result ? 30 : 150)
      }
    } catch { onError() }
  }
  timer = setTimeout(next, 300)
  return () => { cancelled = true; clearTimeout(timer) }
}
