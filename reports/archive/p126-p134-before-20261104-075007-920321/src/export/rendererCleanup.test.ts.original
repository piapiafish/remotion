import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { beginFrameExport, isFrameExportActive } from './frameRenderer'

afterEach(() => vi.unstubAllGlobals())
function fake() {
  let size = new THREE.Vector2(640, 480), ratio = 2, alpha = .6
  const renderer = {
    capabilities: { maxTextureSize: 8192 }, getSize: (v: THREE.Vector2) => v.copy(size),
    getPixelRatio: () => ratio, getClearAlpha: () => alpha,
    setPixelRatio: (v: number) => { ratio = v }, setClearAlpha: (v: number) => { alpha = v },
    setSize: vi.fn((w: number, h: number) => { size = new THREE.Vector2(w, h) }),
  }
  return { renderer, read: () => ({ size: size.toArray(), ratio, alpha }) }
}
describe('renderer setup failure restores preview', () => {
  it('restores size, ratio, alpha, aspect and loop after allocation failure', () => {
    const f = fake(), loop = vi.fn(), camera = new THREE.PerspectiveCamera(30, 4 / 3)
    vi.stubGlobal('OffscreenCanvas', class { constructor() { throw new Error('allocation failed') } })
    expect(() => beginFrameExport({ renderer: f.renderer as unknown as THREE.WebGLRenderer,
      camera, scene: new THREE.Scene(), width: 320, height: 180, backdrop: null, setFrameloop: loop })).toThrow('allocation')
    expect(f.read()).toEqual({ size: [640, 480], ratio: 2, alpha: .6 })
    expect(camera.aspect).toBeCloseTo(4 / 3)
    expect(loop.mock.calls).toEqual([['never'], ['always']])
    expect(isFrameExportActive()).toBe(false)
  })
  it('releases canvases and restores only once', () => {
    const f = fake(), canvases: { width: number; height: number }[] = []
    vi.stubGlobal('OffscreenCanvas', class {
      width: number; height: number
      constructor(w: number, h: number) { this.width = w; this.height = h; canvases.push(this) }
      getContext() { return {} }
    })
    const loop = vi.fn()
    const exporter = beginFrameExport({ renderer: f.renderer as unknown as THREE.WebGLRenderer, camera: new THREE.PerspectiveCamera(),
      scene: new THREE.Scene(), width: 320, height: 180, backdrop: null, setFrameloop: loop })
    expect(isFrameExportActive()).toBe(true)
    exporter.dispose(); exporter.dispose()
    expect(canvases.every(c => c.width === 0 && c.height === 0)).toBe(true)
    expect(loop.mock.calls.filter(c => c[0] === 'always')).toHaveLength(1)
    expect(isFrameExportActive()).toBe(false)
  })
})

