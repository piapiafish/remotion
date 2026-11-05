import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as THREE from 'three'
import { normalizePlayback, videoTimeAt } from './videoTiming'
import { createScreenVideo, seekScreenVideos, syncScreenVideos, type ScreenVideo } from './screenVideo'

describe('per-instance source ranges and timeline clock', () => {
  it('keeps old projects on the full source with no loop', () => {
    expect(normalizePlayback(10)).toEqual({ in: 0, out: 10, start: 0, loop: false })
    expect(videoTimeAt(2.5, 10).time).toBe(2.5)
  })
  it('holds the source in point before a delayed start', () => {
    expect(videoTimeAt(1, 10, { in: 3, out: 6, start: 2 })).toMatchObject({ time: 3, active: false })
    expect(videoTimeAt(2.5, 10, { in: 3, out: 6, start: 2 })).toMatchObject({ time: 3.5, active: true })
  })
  it('holds the final decodable frame inside the trimmed range', () => {
    const clock = videoTimeAt(20, 10, { in: 3, out: 6, start: 2 })
    expect(clock.active).toBe(false)
    expect(clock.time).toBeLessThan(6)
    expect(clock.time).toBeGreaterThan(5.999)
  })
  it('loops only the selected range, including an exact wrap boundary', () => {
    const p = { in: 2, out: 4, start: 1, loop: true }
    expect(videoTimeAt(0, 10, p)).toMatchObject({ time: 2, active: false })
    expect(videoTimeAt(3, 10, p)).toMatchObject({ time: 2, active: true })
    expect(videoTimeAt(5.5, 10, p).time).toBe(2.5)
    expect(videoTimeAt(2.4, 10, { in: 4, out: 5.3, start: 1.1, loop: true }).time).toBe(4)
  })
  it('maps shared source bytes independently for each device', () => {
    expect(videoTimeAt(3, 10, { in: 1, out: 5, start: 0 }).time).toBe(4)
    expect(videoTimeAt(3, 10, { in: 6, out: 9, start: 2 }).time).toBe(7)
  })
  it('clamps a relinked shorter recording without nonfinite or zero ranges', () => {
    const p = normalizePlayback(1, { in: 3, out: 9, start: 2, loop: true })
    expect(p.in).toBeLessThan(p.out); expect(p.out).toBe(1)
    expect(videoTimeAt(20, 1, p).time).toBeLessThan(1)
    expect(normalizePlayback(NaN, { in: Infinity, out: NaN, start: -1 })).toEqual({ in: 0, out: 0, start: 0, loop: false })
  })
})

describe('actual preview/export consumers', () => {
  const entries: ScreenVideo[] = []
  class FakeVideo extends EventTarget {
    src = ''; muted = false; playsInline = false; loop = false; preload = ''; crossOrigin = ''
    paused = true; readyState = 2; seeking = false; currentTime = 0; error = null
    pause() { this.paused = true }
    play() { this.paused = false; return Promise.resolve() }
    load() {}
    removeAttribute() {}
  }
  function add(playback: ScreenVideo['playback']) {
    const el = new FakeVideo()
    vi.stubGlobal('document', { createElement: () => el })
    vi.stubGlobal('HTMLMediaElement', { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2 })
    const entry = createScreenVideo('/shared.mp4', 10, { capabilities: { getMaxAnisotropy: () => 1 } } as THREE.WebGLRenderer, playback)
    entries.push(entry); return entry
  }
  afterEach(() => { entries.splice(0).forEach(e => e.dispose()); vi.unstubAllGlobals() })
  it('does not start a delayed device early, and uses independent decoders', () => {
    const a = add({ in: 1, out: 4, start: 0, loop: false })
    const b = add({ in: 6, out: 9, start: 2, loop: false })
    syncScreenVideos(1, true)
    expect(a.el.currentTime).toBe(2); expect(a.el.paused).toBe(false)
    expect(b.el.currentTime).toBe(6); expect(b.el.paused).toBe(true)
    syncScreenVideos(4, true)
    expect(a.el.paused).toBe(true); expect(a.el.currentTime).toBeLessThan(4)
    expect(b.el.currentTime).toBe(8); expect(b.el.paused).toBe(false)
  })
  it('follows a paused one-frame scrub smaller than the playing drift tolerance', () => {
    const a = add(undefined)
    syncScreenVideos(1 / 30, false)
    expect(a.el.currentTime).toBeCloseTo(1 / 30)
  })
  it('uses the same source mapping for exact export seeking', async () => {
    const a = add({ in: 2, out: 4, start: 1, loop: true })
    const b = add({ in: 6, out: 9, start: 2, loop: false })
    const pending = seekScreenVideos(3.5)
    expect(a.el.currentTime).toBe(2.5); expect(b.el.currentTime).toBe(7.5)
    a.el.dispatchEvent(new Event('seeked')); b.el.dispatchEvent(new Event('seeked')); await pending
  })
})
