import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { useProjectStore } from '../src/store/project'
import { sampleTimeline } from '../src/timeline/sample'

const observations: Record<string, unknown>[] = []
const record = (id: string, details: unknown) => {
  observations.push({ id, details })
  mkdirSync('audit-results', { recursive: true })
  writeFileSync('audit-results/store-observations.json', JSON.stringify(observations, null, 2))
}
beforeEach(() => useProjectStore.getState().newProject())

describe('P1-01 existing editor behavior audit; contract failures document unresolved product gaps', () => {
  it('MAN-004: a newly added device has a distinguishable default position', () => {
    useProjectStore.getState().addDevice()
    const state = useProjectStore.getState()
    const positions = sampleTimeline(state.project, 0).devices.map(d => d.position)
    record('MAN-004', { deviceCount: state.project.devices.length, positions, activeDevice: state.activeDevice })
    expect(positions[0]).not.toEqual(positions[1])
  })
  it('MAN-003: undoing addition keeps the selected device valid', () => {
    useProjectStore.getState().addDevice()
    useProjectStore.getState().undo()
    const s = useProjectStore.getState()
    record('MAN-003', { deviceCount: s.project.devices.length, activeDevice: s.activeDevice, selectedDeviceExists: !!s.project.devices[s.activeDevice], transformPanelCanResolveDevice: !!sampleTimeline(s.project, 0).devices[s.activeDevice] })
    expect(s.activeDevice).toBeLessThan(s.project.devices.length)
  })
  it('MAN-001: changing pose at two times provides an editable animation starting point', () => {
    useProjectStore.getState().setDevicePosition([0, 0, 0])
    useProjectStore.getState().setPlayhead(1)
    useProjectStore.getState().setDevicePosition([0, 1, 0])
    const s = useProjectStore.getState()
    const keys = s.project.devices[0].transform['position.y'].keys
    record('MAN-001', { keys, at0: sampleTimeline(s.project, 0).devices[0].position, at1: sampleTimeline(s.project, 1).devices[0].position, note: 'Static-track setter intentionally preserves one key; the missing product capability is an explicit enable-animation/add-key UI.' })
    expect(keys.length).toBeGreaterThan(1)
  })
  it('MAN-005: applying a device animation can preserve an unselected device', () => {
    useProjectStore.getState().addDevice()
    useProjectStore.getState().setActiveDevice(1)
    const untouchedBefore = structuredClone(useProjectStore.getState().project.devices[0].transform)
    useProjectStore.getState().setMotionPreset('spin-y-360')
    const s = useProjectStore.getState()
    record('MAN-005', { selected: s.activeDevice, before: untouchedBefore, after: s.project.devices.map(d => d.transform), note: 'The existing preset applies globally; selected-device-only animation is a missing capability.' })
    expect(s.project.devices[0].transform).toEqual(untouchedBefore)
  })
  it('control: ordinary transform changes affect only the selected device', () => {
    useProjectStore.getState().addDevice()
    useProjectStore.getState().setActiveDevice(1)
    useProjectStore.getState().setDevicePosition([1, 0, 0])
    const positions = sampleTimeline(useProjectStore.getState().project, 0).devices.map(d => d.position)
    record('CONTROL-INDEPENDENT-POSITION', {positions})
    expect(positions).toEqual([[0, 0, 0], [1, 0, 0]])
  })
  it('control: redo of addition restores the device and ordinary removal retains a valid selection', () => {
    useProjectStore.getState().addDevice()
    useProjectStore.getState().undo()
    useProjectStore.getState().redo()
    const restored = useProjectStore.getState()
    expect(restored.project.devices.length).toBe(2)
    expect(restored.activeDevice).toBeLessThan(2)
    restored.removeDevice(1)
    const removed = useProjectStore.getState()
    record('CONTROL-REDO-REMOVE', {deviceCount: removed.project.devices.length, activeDevice: removed.activeDevice})
    expect(removed.project.devices.length).toBe(1)
    expect(removed.activeDevice).toBe(0)
  })
})

