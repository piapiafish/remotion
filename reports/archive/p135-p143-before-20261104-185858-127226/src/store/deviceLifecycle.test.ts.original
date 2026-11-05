import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProject, createDevice } from './defaults'
import { emptyHistory, resetCoalescing } from './history'
import { useProjectStore } from './project'
import { sampleTimeline } from '../timeline/sample'
import { staticTrack } from '../timeline/tracks'
import { EASE_LINEAR } from '../timeline/easing'

const store = () => useProjectStore.getState()
const selectedId = () => store().project.devices[store().activeDevice]?.instanceId
const selectedPosition = () => sampleTimeline(store().project, store().playhead).devices[store().activeDevice].position

beforeEach(() => {
  resetCoalescing()
  useProjectStore.setState({ project: createDefaultProject(), history: emptyHistory, activeDevice: 0, playhead: 0, playing: false })
})

describe('device lifecycle selection', () => {
  it('keeps selection valid for every published add, undo and redo state', () => {
    const invalid: number[] = []
    const unsubscribe = useProjectStore.subscribe((s) => {
      if (!s.project.devices[s.activeDevice]) invalid.push(s.activeDevice)
    })
    try {
      store().addDevice()
      store().undo()
      expect(store().project.devices).toHaveLength(1)
      expect(store().activeDevice).toBe(0)
      store().redo()
      expect(store().project.devices).toHaveLength(2)
      store().setDeviceScale(0.8)
      expect(invalid).toEqual([])
      expect(selectedId()).toBeDefined()
    } finally {
      unsubscribe()
    }
  })

  it('keeps the same selected instance when deleting and restoring an earlier row', () => {
    store().addDevice()
    store().addDevice()
    const id = selectedId()
    store().removeDevice(0)
    expect(selectedId()).toBe(id)
    expect(store().activeDevice).toBe(1)
    store().undo()
    expect(selectedId()).toBe(id)
    expect(store().activeDevice).toBe(2)
    store().redo()
    expect(selectedId()).toBe(id)
  })

  it('chooses the adjacent surviving device when deleting the selected row', () => {
    store().addDevice()
    store().addDevice()
    const middle = store().project.devices[1].instanceId
    store().removeDevice(2)
    expect(selectedId()).toBe(middle)
    store().removeDevice(1)
    expect(store().activeDevice).toBe(0)
    const last = store().project
    store().removeDevice(0)
    expect(store().project).toBe(last)
  })

  it('ignores invalid duplicate/remove requests without changing history or selection', () => {
    const before = store()
    for (const index of [-1, 99, 0.5, Number.NaN]) {
      store().duplicateDevice(index)
      store().removeDevice(index)
    }
    expect(store().project).toBe(before.project)
    expect(store().history).toBe(before.history)
    expect(store().activeDevice).toBe(0)
  })

  it('normalizes invalid explicit selection requests', () => {
    store().addDevice()
    for (const index of [-1, 50, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      store().setActiveDevice(index)
      expect(Number.isInteger(store().activeDevice)).toBe(true)
      expect(selectedId()).toBeDefined()
    }
  })

  it('treats rapid adds and rapid duplicates as separate undoable actions', () => {
    store().addDevice()
    store().addDevice()
    expect(store().history.past).toHaveLength(2)
    store().undo()
    expect(store().project.devices).toHaveLength(2)
    store().undo()
    expect(store().project.devices).toHaveLength(1)
    store().redo()
    store().duplicateDevice(0)
    store().duplicateDevice(0)
    store().undo()
    expect(store().project.devices).toHaveLength(3)
    store().undo()
    expect(store().project.devices).toHaveLength(2)
  })

  it('does not coalesce transform edits across different selected devices', () => {
    store().addDevice()
    store().setDevicePosition([1, 0, 0])
    store().setActiveDevice(0)
    store().setDevicePosition([-1, 0, 0])
    store().undo()
    expect(sampleTimeline(store().project, 0).devices[0].position).toEqual([0, 0, 0])
    expect(sampleTimeline(store().project, 0).devices[1].position).toEqual([1, 0, 0])
  })

  it('resets selection atomically when applying a smaller template or new project', () => {
    store().addDevice()
    store().addDevice()
    const invalid: number[] = []
    const unsubscribe = useProjectStore.subscribe((s) => {
      if (!s.project.devices[s.activeDevice]) invalid.push(s.activeDevice)
    })
    try {
      store().applyTemplate('hero-straight')
      expect(store().activeDevice).toBe(0)
      store().newProject()
      expect(store().project.devices).toHaveLength(1)
      expect(store().activeDevice).toBe(0)
      expect(invalid).toEqual([])
    } finally {
      unsubscribe()
    }
  })
})

describe('new device placement', () => {
  it('adds a distinct visible pose without changing the existing document data', () => {
    const original = store().project.devices[0]
    const camera = store().project.camera
    store().addDevice()
    expect(store().activeDevice).toBe(1)
    expect(selectedPosition()).not.toEqual([0, 0, 0])
    expect(store().project.devices[0]).toBe(original)
    expect(store().project.camera).toBe(camera)
    expect(new Set(store().project.devices.map((d) => d.instanceId)).size).toBe(2)
  })

  it('separates devices across the camera view even when looking along the X axis', () => {
    store().setCameraPosition([3.2, 0, 0])
    store().addDevice()
    // World-X offsets alone would remain directly behind the original.
    expect(Math.abs(selectedPosition()[2])).toBeGreaterThan(0.1)
  })

  it('avoids exact overlap over repeated additions', () => {
    for (let i = 0; i < 4; i++) store().addDevice()
    const positions = sampleTimeline(store().project, 0).devices.map((d) => JSON.stringify(d.position))
    expect(new Set(positions).size).toBe(5)
  })

  it('preserves an animated duplicate, including media, easing and relative motion', () => {
    const project = createDefaultProject()
    const device = createDevice({
      screen: { id: 'test-image', kind: 'image', width: 100, height: 200, url: 'blob:test' },
      orientation: 'landscape',
      transform: {
        ...project.devices[0].transform,
        'position.x': { interpolation: 'continuous', keys: [
          { t: 0, v: -0.2, ease: EASE_LINEAR },
          { t: 2, v: 0.4, ease: EASE_LINEAR },
          { t: 4, v: 0.1, ease: EASE_LINEAR },
        ] },
        'rotation.y': { keys: [{ t: 0, v: 0, ease: EASE_LINEAR }, { t: 4, v: 4 * Math.PI, ease: EASE_LINEAR }] },
        scale: staticTrack(0.7),
      },
    })
    useProjectStore.setState({ project: { ...project, devices: [device] }, playhead: 2 })
    const source = JSON.stringify(device)
    store().duplicateDevice(0)
    const copy = store().project.devices[1]
    expect(copy.instanceId).not.toBe(device.instanceId)
    expect(copy.screen).toEqual(device.screen)
    expect(copy.orientation).toBe('landscape')
    expect(copy.transform['rotation.y']).toEqual(device.transform['rotation.y'])
    expect(copy.transform['position.x'].interpolation).toBe('continuous')
    const reference = sampleTimeline(store().project, 0).devices
    const offset = reference[1].position.map((v, i) => v - reference[0].position[i])
    expect(offset.some((v) => Math.abs(v) > 0.01)).toBe(true)
    for (const time of [0, 0.5, 2, 3.5, 4]) {
      const sampled = sampleTimeline(store().project, time).devices
      for (let axis = 0; axis < 3; axis++) {
        expect(sampled[1].position[axis] - sampled[0].position[axis]).toBeCloseTo(offset[axis], 8)
      }
      expect(sampled[1].rotation).toEqual(sampled[0].rotation)
    }
    expect(JSON.stringify(store().project.devices[0])).toBe(source)
  })
})

