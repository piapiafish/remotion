import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const h = vi.hoisted(() => ({
  fail: '', dispose: vi.fn(), render: vi.fn(), begin: vi.fn(), frames: [] as { close: ReturnType<typeof vi.fn> }[],
  encoders: [] as { state: string; close: ReturnType<typeof vi.fn> }[],
  controller: undefined as AbortController | undefined,
}))
vi.mock('./frameRenderer', () => ({ beginFrameExport: h.begin }))
vi.mock('../media/screenVideo', () => ({ hasScreenVideos: () => h.fail === 'seek', seekScreenVideos: async () => { throw new Error('seek failed') } }))
vi.mock('mp4-muxer', () => ({
  ArrayBufferTarget: class { buffer = new ArrayBuffer(32) },
  Muxer: class { addVideoChunk() { if (h.fail === 'mux') throw new Error('mux failed') } finalize() { if (h.fail === 'finalize') throw new Error('finalize failed') } },
}))
vi.mock('webm-muxer', () => ({ ArrayBufferTarget: class {}, Muxer: class {} }))
import { exportVideo } from './video'
import type { VideoExportParams } from './video'

class Encoder extends EventTarget {
  state = 'unconfigured'
  close = vi.fn(() => { this.state = 'closed' })
  encodeQueueSize = 0
  init: VideoEncoderInit
  constructor(init: VideoEncoderInit) { super(); this.init = init; h.encoders.push(this) }
  configure() { if (h.fail === 'configure') throw new Error('configure failed'); this.state = 'configured' }
  encode() {
    if (h.fail === 'encode') throw new Error('encode failed')
    if (h.fail === 'async') this.init.error(new DOMException('async encoder failure'))
    if (h.fail === 'queue') { this.encodeQueueSize = 12; setTimeout(() => h.controller?.abort(), 0) }
    this.init.output({} as EncodedVideoChunk, {})
  }
  async flush() {
    if (h.fail === 'flush') throw new Error('flush failed')
    if (h.fail === 'stall') { setTimeout(() => h.controller?.abort(), 0); return new Promise<void>(() => {}) }
  }
}
const params = () => ({
  width: 320, height: 180, fps: 30, duration: .1, format: 'mp4', applyAt: vi.fn(),
  signal: h.controller?.signal,
}) as unknown as VideoExportParams

beforeEach(() => {
  h.fail = ''; h.frames = []; h.encoders = []; h.controller = new AbortController()
  h.dispose.mockReset(); h.render.mockReset(); h.render.mockReturnValue({})
  h.begin.mockReset(); h.begin.mockImplementation(() => {
    if (h.fail === 'setup') throw new Error('renderer setup failed')
    return { renderFrame: h.render, dispose: h.dispose }
  })
  vi.stubGlobal('VideoEncoder', Encoder)
  vi.stubGlobal('VideoFrame', class { close = vi.fn(); constructor() { h.frames.push(this) } })
})
afterEach(() => vi.unstubAllGlobals())

describe('export failure cleanup and cancellation', () => {
  it.each([
    ['configure', 'configure'], ['setup', 'render'], ['seek', 'media'],
    ['encode', 'encode'], ['async', 'encode'], ['mux', 'output'], ['flush', 'encode'], ['finalize', 'output'],
  ])('reports %s failure and closes every created encoder/frame', async (fail, stage) => {
    h.fail = fail
    await expect(exportVideo(params())).rejects.toMatchObject({ name: 'ExportFailure', stage })
    expect(h.encoders).toHaveLength(1)
    expect(h.encoders[0].close).toHaveBeenCalledOnce()
    for (const frame of h.frames) expect(frame.close).toHaveBeenCalledOnce()
    expect(h.dispose).toHaveBeenCalledTimes(['configure', 'setup'].includes(fail) ? 0 : 1)
  })
  it.each(['queue', 'stall'])('cancels while %s is blocked', async fail => {
    h.fail = fail
    await expect(exportVideo(params())).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.encoders[0].close).toHaveBeenCalledOnce()
    expect(h.dispose).toHaveBeenCalledOnce()
  })
  it('pre-aborted exports never create an encoder or touch the renderer', async () => {
    h.controller!.abort()
    await expect(exportVideo(params())).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.begin).not.toHaveBeenCalled()
    expect(h.encoders).toHaveLength(0)
  })
  it('can retry after a failure and completes all frames', async () => {
    h.fail = 'configure'
    await expect(exportVideo(params())).rejects.toThrow()
    h.fail = ''
    const blob = await exportVideo(params())
    expect(blob.type).toBe('video/mp4')
    expect(h.frames).toHaveLength(3)
    for (const frame of h.frames) expect(frame.close).toHaveBeenCalledOnce()
    expect(h.encoders.every(e => e.state === 'closed')).toBe(true)
  })
})

