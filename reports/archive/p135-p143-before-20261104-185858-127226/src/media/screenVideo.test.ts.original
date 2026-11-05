import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as THREE from 'three'
import { createScreenVideo, hasScreenVideos, screenTimeAt, seekScreenVideos, syncScreenVideos, type ScreenVideo } from './screenVideo'

/*
 * The one expression the whole video feature rests on (§8.3):
 *
 *     screenTime = clamp(t - clipOffset, 0, clipDuration)
 *
 * Preview and export must both derive video time from timeline time this
 * way. A screen that played independently would render differently every
 * time the same project was exported, which is the failure the pure-function
 * -of-time rule exists to prevent.
 */
describe('screenTimeAt', () => {
  it('maps timeline time straight onto clip time', () => {
    expect(screenTimeAt(0, 10)).toBe(0)
    expect(screenTimeAt(2.5, 10)).toBe(2.5)
  })

  it('holds the last frame past the end of a short clip', () => {
    // A 3s clip on a 5s timeline must not restart or go black at 3s.
    expect(screenTimeAt(4, 3)).toBe(3)
    expect(screenTimeAt(100, 3)).toBe(3)
  })

  it('holds the first frame before the clip starts', () => {
    expect(screenTimeAt(0.5, 10, 2)).toBe(0)
  })

  it('shifts by the clip offset', () => {
    expect(screenTimeAt(3, 10, 2)).toBe(1)
  })

  it('never returns a negative time', () => {
    // A negative currentTime throws on assignment in some browsers, so this
    // would surface as an unrelated-looking error mid-scrub.
    expect(screenTimeAt(-5, 10)).toBe(0)
  })
})

describe('preview decoder scheduling',()=>{
  let entry:ScreenVideo|null=null
  class Video extends EventTarget {
    src='';paused=true;readyState=2;seeking=false;playbackRate=1;currentTime=0;error=null
    play(){this.paused=false;return Promise.resolve()}
    pause(){this.paused=true}
    removeAttribute(){}
    load(){}
  }
  function setup(){
    const el=new Video()
    vi.stubGlobal('document',{createElement:()=>el});vi.stubGlobal('HTMLMediaElement',{HAVE_METADATA:1,HAVE_CURRENT_DATA:2})
    entry=createScreenVideo('/clip.mp4',10,{capabilities:{getMaxAnisotropy:()=>1}} as THREE.WebGLRenderer)
    return el
  }
  afterEach(()=>{entry?.dispose();entry=null;vi.unstubAllGlobals()})
  it('slows a slightly ahead decoder without seeking backwards',()=>{
    const el=setup();syncScreenVideos(0,true);el.currentTime=.3;syncScreenVideos(.04,true)
    expect(el.currentTime).toBe(.3);expect(el.playbackRate).toBeLessThan(1);expect(el.paused).toBe(false)
  })
  it('only submits the latest paused target after an in-flight seek completes',()=>{
    const el=setup();el.seeking=true;syncScreenVideos(2,false);syncScreenVideos(4,false)
    expect(el.currentTime).toBe(0);el.seeking=false;el.dispatchEvent(new Event('seeked'));expect(el.currentTime).toBe(4)
  })
  it('does not overwrite an in-flight decoder repeatedly while playing',()=>{
    const el=setup();syncScreenVideos(0,true);el.seeking=true;syncScreenVideos(3,true);syncScreenVideos(3.04,true)
    expect(el.currentTime).toBe(0)
  })
  it('exact export targeting replaces any queued preview target',async()=>{
    const el=setup();el.seeking=true;syncScreenVideos(4,false)
    const pending=seekScreenVideos(1);el.seeking=false;el.dispatchEvent(new Event('seeked'));await pending
    expect(el.currentTime).toBe(1)
  })
})

describe('exact export video seek', () => {
  let entry: ScreenVideo | null = null
  class FakeVideo extends EventTarget {
    src = ''; muted = false; playsInline = false; loop = false; preload = ''; crossOrigin = ''
    paused = true; readyState = 2; seeking = false; currentTime = 0; error = null
    pause() { this.paused = true }
    load() {}
    removeAttribute() {}
  }
  function video() {
    const el = new FakeVideo()
    vi.stubGlobal('document', { createElement: () => el })
    vi.stubGlobal('HTMLMediaElement', { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2 })
    entry = createScreenVideo('/test.mp4', 8, { capabilities: { getMaxAnisotropy: () => 1 } } as THREE.WebGLRenderer)
    return el
  }
  afterEach(() => { entry?.dispose(); entry = null; vi.unstubAllGlobals(); vi.useRealTimers() })

  it('waits for seeked and uploads exactly the requested frame', async () => {
    const el = video()
    const pending = seekScreenVideos(1.25)
    expect(el.currentTime).toBe(1.25)
    el.dispatchEvent(new Event('seeked'))
    await pending
    expect(entry!.texture.version).toBeGreaterThan(0)
  })
  it('fails instead of encoding a stale frame after a timeout', async () => {
    vi.useFakeTimers(); video()
    const check = expect(seekScreenVideos(2, 20)).rejects.toThrow('SCREEN_VIDEO_SEEK_TIMEOUT')
    await vi.advanceTimersByTimeAsync(21); await check
  })
  it('rejects an unready decoder', async () => {
    const el = video(); el.readyState = 0
    await expect(seekScreenVideos(0)).rejects.toThrow('SCREEN_VIDEO_NOT_READY')
  })
  it('allows metadata state during an in-flight seek instead of rejecting a valid decoder', async () => {
    const el=video();el.readyState=1;el.seeking=true
    const pending=seekScreenVideos(2)
    expect(el.currentTime).toBe(2)
    el.readyState=2;el.seeking=false;el.dispatchEvent(new Event('seeked'))
    await pending
    expect(entry!.texture.version).toBeGreaterThan(0)
  })
  it('rejects a decoder error', async () => {
    const el = video(); const check = expect(seekScreenVideos(2)).rejects.toThrow('SCREEN_VIDEO_DECODE_FAILED')
    el.dispatchEvent(new Event('error')); await check
  })
  it('holds the final decodable frame and removes disposed registrations', async () => {
    const el = video(); const pending = seekScreenVideos(100)
    expect(el.currentTime).toBeLessThan(8)
    expect(el.currentTime).toBeGreaterThan(7.99)
    el.dispatchEvent(new Event('seeked')); await pending
    entry!.dispose(); expect(hasScreenVideos()).toBe(false)
  })
})
