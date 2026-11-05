import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProject, createDevice } from '../store/defaults'
import { useProjectStore as useStore } from '../store/project'
import { emptyHistory, resetCoalescing } from '../store/history'
import { applyMotionPreset, PRESET_CHANNELS, type MotionPresetId } from './presets'
import { EASE_LINEAR } from './easing'
import { sampleTimeline } from './sample'
import { staticTrack } from './tracks'
function project() {
  const p = createDefaultProject()
  return { ...p, duration: 8, devices: [p.devices[0], createDevice()] }
}
describe('instance-scoped presets', () => {
  for (const preset of Object.keys(PRESET_CHANNELS).filter(p => p !== 'orbit') as MotionPresetId[]) {
    it(preset + ' changes only its declared channels on the chosen instance', () => {
      const p = project(), original = p.devices[1].transform
      const after = applyMotionPreset(p, preset, { deviceId: p.devices[1].instanceId, start: 2, duration: 3 })
      expect(after.devices[0]).toBe(p.devices[0]); expect(after.camera).toBe(p.camera)
      for (const channel of Object.keys(original)) {
        if (!PRESET_CHANNELS[preset].includes(channel)) expect(after.devices[1].transform[channel]).toBe(original[channel])
      }
      expect(after.devices[1].instanceId).toBe(p.devices[1].instanceId)
      expect(after.devices[1].screen).toBe(p.devices[1].screen)
    })
  }
  it('preserves outer keys and uses the sampled pose at the insertion time', () => {
    const p = project(), ease = EASE_LINEAR
    p.devices[1].transform['rotation.y'] = { keys: [{ t: 0, v: 1, ease }, { t: 1, v: 2, ease }, { t: 7, v: 3, ease }] }
    const base = sampleTimeline(p, 2).devices[1].rotation[1]
    const after = applyMotionPreset(p, 'spin-y-360', { deviceId: p.devices[1].instanceId, start: 2, duration: 3 })
    const keys = after.devices[1].transform['rotation.y'].keys
    expect(keys.map(k => k.t)).toEqual([0, 1, 2, 5, 7])
    expect(keys[0]).toEqual(p.devices[1].transform['rotation.y'].keys[0])
    expect(keys.at(-1)).toEqual(p.devices[1].transform['rotation.y'].keys.at(-1))
    expect(keys[2].v).toBeCloseTo(base)
    expect(keys[3].v - keys[2].v).toBeCloseTo(Math.PI * 2)
  })
  it('orbits the actual camera about its sampled target while protecting devices, lens and target tracks', () => {
    const p = project()
    p.camera.preset = null
    p.camera.tracks['position.x'] = staticTrack(2)
    p.camera.tracks['position.z'] = staticTrack(3)
    p.camera.tracks['target.x'] = staticTrack(.6)
    const after = applyMotionPreset(p, 'orbit', { start: 1, duration: 4 })
    expect(after.devices).toBe(p.devices)
    expect(after.camera.tracks.fov).toBe(p.camera.tracks.fov)
    expect(after.camera.tracks['target.x']).toBe(p.camera.tracks['target.x'])
    const atStart = sampleTimeline(after, 1), atEnd = sampleTimeline(after, 5)
    atStart.camera.position.forEach((v, i) => expect(v).toBeCloseTo(sampleTimeline(p, 1).camera.position[i]))
    atStart.camera.position.forEach((v, i) => expect(v).toBeCloseTo(atEnd.camera.position[i]))
  })
  it('rejects out-of-range intervals and unknown instances without changing the project', () => {
    const p = project()
    for (const options of [{start:-1}, {start:8}, {start:7,duration:2}, {duration:NaN}, {deviceId:'missing'}]) {
      expect(applyMotionPreset(p, 'float', options)).toBe(p)
    }
  })
})
describe('preset history and device identity', () => {
  beforeEach(() => { useStore.getState().endEditGesture(true); resetCoalescing(); useStore.setState({ project: project(), history: emptyHistory, activeDevice: 1, playhead: 2, keySelection: null }) })
  it('defaults to the active instance at the playhead and undoes each application independently', () => {
    const s = () => useStore.getState()
    const original = s().project
    s().setMotionPreset('spin-y-360', 2, 3); const first = s().project
    expect(first.devices[0]).toBe(original.devices[0])
    expect(first.devices[1].transform['rotation.y'].keys.some(k => k.t === 2)).toBe(true)
    s().setMotionPreset('float', 0, 2); s().undo(); expect(s().project).toBe(first)
    s().undo(); expect(s().project).toBe(original)
    s().redo(); expect(s().project).toBe(first)
  })
})
