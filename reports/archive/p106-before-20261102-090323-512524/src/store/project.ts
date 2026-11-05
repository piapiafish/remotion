import { create } from 'zustand'
import { createDefaultProject, createDevice } from './defaults'
import { placeNewDevice } from './devicePlacement'
import { applyTemplateToDevices, getTemplate, templateCamera } from '../timeline/templates'
import { emptyHistory, record, redo, resetCoalescing, undo, type History } from './history'
import type { ExportQuality } from '../export/frameRenderer'
import { deserializeProject, downloadProject, pruneUnreferencedMedia, serializeProject } from './persist'
import { applyCameraAngle, applyMotionPreset, type MotionPresetId } from '../timeline/presets'
import { setKey, setVec3At, setValueAt } from '../timeline/tracks'
import { addEditableKey, channelFallback, deleteEditableKey, easeEditableKey, editChannel, moveEditableKey, targetTracks, validSelection, type KeySelection, type TrackTarget } from '../timeline/editing'
import { sampleTrack } from '../timeline/sample'
import type { EaseHandle } from './schema'
import { getManifest } from '../devices/manifest'
import { applyMotionPlan as compileMotionPlan, clearMotionPlan } from '../timeline/motionPlan'
import type {
  BackgroundConfig,
  CameraAnglePreset,
  DeviceId,
  DeviceInstance,
  DeviceOrientation,
  MediaRef,
  Project,
  ScreenFit,
  Vec3,
} from './schema'

type ProjectStore = {
  project: Project
  /** Playhead position in seconds. Transient UI state, not part of the document. */
  playhead: number
  playing: boolean
  motionPreset: MotionPresetId

  /** 'image' hides the timeline entirely — a still has no time axis. */
  editorMode: 'movie' | 'image'
  exportQuality: ExportQuality
  setExportQuality: (q: ExportQuality) => void
  /**
   * Size the export from the screenshot rather than from the chosen output
   * size. Opt-in: enabling it can create a much larger file, so the chosen
   * canvas dimensions remain authoritative unless the user asks otherwise.
   */
  matchSource: boolean
  setMatchSource: (on: boolean) => void
  history: History
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
  newProject: () => void
  saveProject: () => Promise<void>
  openProject: (file: Blob) => Promise<void>
  setEditorMode: (mode: 'movie' | 'image') => void
  setName: (name: string) => void
  setPlayhead: (t: number) => void
  setPlaying: (playing: boolean) => void
  setDuration: (seconds: number) => void
  setFps: (fps: 30 | 60) => void

  /** Index of the device the inspector edits. Transient, not part of the doc. */
  activeDevice: number
  setActiveDevice: (index: number) => void
  addDevice: () => void
  duplicateDevice: (index: number) => void
  removeDevice: (index: number) => void
  applyTemplate: (templateId: string) => void
  applyMotionPlan: (plan: unknown) => void
  clearMotionPlan: () => void

  setScreenMedia: (ref: MediaRef | null) => void
  setScreenFit: (fit: ScreenFit) => void
  setDeviceId: (id: DeviceId) => void
  setColorway: (id: string) => void
  setOrientation: (o: DeviceOrientation) => void

  setBackground: (bg: BackgroundConfig) => void
  setEnvironment: (patch: Partial<Project['environment']>) => void
  setOutput: (patch: Partial<Project['output']>) => void

  setCameraPreset: (preset: CameraAnglePreset) => void
  setCameraPosition: (v: Vec3) => void
  setCameraFov: (fov: number) => void
  setDeviceRotation: (v: Vec3) => void
  setDevicePosition: (v: Vec3) => void
  setDeviceScale: (v: number) => void
  setMotionPreset: (preset: MotionPresetId, start?: number, duration?: number) => void
  keySelection: KeySelection | null
  selectKey: (selection: KeySelection | null) => void
  addTimelineKey: (target: TrackTarget, channel: string) => void
  moveTimelineKey: (selection: KeySelection, to: number) => void
  deleteTimelineKey: () => void
  setTimelineKeyValue: (value: number) => void
  setTimelineKeyEase: (ease: EaseHandle) => void
  editingGesture: boolean
  beginEditGesture: () => void
  endEditGesture: (cancel?: boolean) => void
  canvasTool: 'select' | 'translate' | 'rotate' | 'scale' | 'orbit'
  setCanvasTool: (tool: ProjectStore['canvasTool']) => void
  setCameraTarget: (v: Vec3) => void
}

// Narrow selectors are used at call sites (§14 trap 10) — components should
// subscribe to the slice they need, not the whole project object, or every
// timeline scrub re-renders the scene tree.
function clampSelection(index: number, count: number): number {
  return Math.max(0, Math.min(Number.isFinite(index) ? Math.trunc(index) : 0, count - 1))
}

function retainSelection(previous: Project, next: Project, index: number): number {
  const id = previous.devices[index]?.instanceId
  const retained = id ? next.devices.findIndex((device) => device.instanceId === id) : -1
  return retained >= 0 ? retained : clampSelection(index, next.devices.length)
}

type EditUi = Partial<Pick<ProjectStore, 'activeDevice' | 'playhead' | 'playing' | 'editorMode' | 'motionPreset' | 'keySelection'>>

export const useProjectStore = create<ProjectStore>((set, get) => {
  let gesture: { project: Project; history: History; selection: KeySelection | null } | null = null
  /**
   * Every document mutation goes through here, so undo coverage can't drift
   * out of sync with the set of actions. `label` groups a continuous gesture
   * (a field drag, a slider) into one history entry.
   */
  const edit = (label: string, update: (p: Project) => Project, ui: EditUi | ((p: Project) => EditUi) = {}) =>
    set((s) => {
      const project = update(s.project)
      if (project === s.project) return s
      const patch = typeof ui === 'function' ? ui(project) : ui
      return {
        ...patch,
        project,
        history: gesture
          ? (s.project === gesture.project ? record(gesture.history, gesture.project) : s.history)
          : record(s.history, s.project, label),
        keySelection: validSelection(project, patch.keySelection === undefined ? s.keySelection : patch.keySelection),
        activeDevice: patch.activeDevice === undefined
          ? retainSelection(s.project, project, s.activeDevice)
          : clampSelection(patch.activeDevice, project.devices.length),
      }
    })

  // Device-list buttons are distinct actions, even when clicked within 500ms.
  const editDevices = (label: string, update: (p: Project) => Project, ui?: (p: Project) => EditUi) => {
    resetCoalescing()
    edit(label, update, ui)
    resetCoalescing()
  }

  /** Edit one device instance in place, leaving the rest of the list alone. */
  const editDevice = (label: string, update: (d: DeviceInstance) => DeviceInstance) =>
    edit(label, (p) => ({
      ...p,
      devices: p.devices.map((d, i) => (i === get().activeDevice ? update(d) : d)),
    }))

  const replace = (project: Project) => {
    resetCoalescing()
    gesture = null
    set({ project, history: emptyHistory, playhead: 0, playing: false, activeDevice: 0, keySelection: null, editingGesture: false, motionPreset: 'none' })
  }

  return {
  project: createDefaultProject(),
  history: emptyHistory,

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
  undo: () => {
    get().endEditGesture()
    resetCoalescing()
    set((s) => {
      const result = undo(s.history, s.project)
      return result ? { ...result, keySelection: null, activeDevice: retainSelection(s.project, result.project, s.activeDevice) } : s
    })
  },
  redo: () => {
    get().endEditGesture()
    resetCoalescing()
    set((s) => {
      const result = redo(s.history, s.project)
      return result ? { ...result, keySelection: null, activeDevice: retainSelection(s.project, result.project, s.activeDevice) } : s
    })
  },

  newProject: () => replace(createDefaultProject()),
  saveProject: async () => {
    const project = get().project
    downloadProject(await serializeProject(project), project.name)
  },
  openProject: async (file) => {
    const project = await deserializeProject(file)
    replace(project)
    void pruneUnreferencedMedia(project)
  },

  playhead: 0,
  playing: false,
  motionPreset: 'none',
  editorMode: 'image',
  activeDevice: 0,
  keySelection: null,
  editingGesture: false,
  canvasTool: 'select',
  selectKey: (selection) => {
    resetCoalescing()
    set(s => ({ keySelection: validSelection(s.project, selection), ...(selection ? { playing: false, playhead: selection.t } : {}) }))
  },
  setCanvasTool: (canvasTool) => { get().endEditGesture(true); set({ canvasTool, playing: false }) },
  beginEditGesture: () => {
    if (gesture) get().endEditGesture()
    resetCoalescing()
    gesture = { project: get().project, history: get().history, selection: get().keySelection }
    set({ editingGesture: true, playing: false })
  },
  endEditGesture: (cancel = false) => {
    const previous = gesture
    gesture = null
    resetCoalescing()
    set(cancel && previous
      ? { project: previous.project, history: previous.history, keySelection: previous.selection, editingGesture: false }
      : { editingGesture: false })
  },
  addTimelineKey: (target, channel) => {
    const t = Math.min(get().project.duration, get().playhead)
    resetCoalescing()
    edit('addKey', p => addEditableKey(p, target, channel, t), { keySelection: { target, channel, t }, playing: false })
    resetCoalescing()
  },
  moveTimelineKey: (selection, to) => {
    if (!Number.isFinite(to)) return
    const t = Math.max(0, Math.min(get().project.duration, to))
    const baseline = gesture?.project ?? get().project
    const original = targetTracks(baseline, selection.target)?.[selection.channel]
    const moved = moveEditableKey(original, selection.t, t)
    if (!moved) return
    edit('moveKey', p => editChannel(p, selection.target, selection.channel, () => moved),
      { keySelection: { ...selection, t }, playhead: t, playing: false })
  },
  deleteTimelineKey: () => {
    const selection = validSelection(get().project, get().keySelection)
    if (!selection) return
    resetCoalescing()
    edit('deleteKey', p => {
      const fallback = sampleTrack(targetTracks(p, selection.target)?.[selection.channel], selection.t, channelFallback(p, selection.target, selection.channel))
      return editChannel(p, selection.target, selection.channel, track => deleteEditableKey(track, selection.t, fallback))
    }, { keySelection: null })
    resetCoalescing()
  },
  setTimelineKeyValue: (value) => {
    const selection = validSelection(get().project, get().keySelection)
    if (!selection || !Number.isFinite(value)) return
    const v = selection.channel === 'scale' ? Math.max(0.05, value)
      : selection.channel === 'fov' ? Math.max(1, Math.min(179, value)) : value
    resetCoalescing()
    edit('keyValue', p => editChannel(p, selection.target, selection.channel, track => setKey(track, selection.t, v)))
    resetCoalescing()
  },
  setTimelineKeyEase: (ease) => {
    const selection = validSelection(get().project, get().keySelection)
    if (!selection || ease.length !== 4 || !ease.every(Number.isFinite) || ease[0] < 0 || ease[0] > 1 || ease[2] < 0 || ease[2] > 1) return
    resetCoalescing()
    edit('keyEase', p => editChannel(p, selection.target, selection.channel, track => easeEditableKey(track, selection.t, ease) ?? track!))
    resetCoalescing()
  },
  exportQuality: 'high',
  matchSource: false,

  setExportQuality: (exportQuality) => set({ exportQuality }),

  // Opt-in because matching a tall source can multiply both output axes.
  // Typing a size also turns it off, keeping the dimensions authoritative.
  setMatchSource: (matchSource: boolean) => set({ matchSource }),

  setEditorMode: (editorMode) => set({ editorMode }),
  setName: (name) => edit('name', (p) => ({ ...p, name })),

  setPlayhead: (t) => { if (Number.isFinite(t)) set({ playhead: Math.max(0, Math.min(get().project.duration, t)) }) },
  setPlaying: (playing) => set(s => ({ playing, ...(playing && s.playhead >= s.project.duration ? { playhead: 0 } : {}) })),
  setDuration: (seconds) =>
    edit('duration', (p) => ({ ...p, duration: Math.max(0.1, seconds) })),
  // Frame rate is a document property, not an export setting: it decides
  // which times the timeline is sampled at, so changing it changes the clip
  // rather than just the file.
  setFps: (fps) => edit('fps', (p) => ({ ...p, fps })),

  setActiveDevice: (index) => {
    get().endEditGesture()
    resetCoalescing()
    set((s) => ({ activeDevice: clampSelection(index, s.project.devices.length), keySelection: null, motionPreset: 'none' }))
  },

  addDevice: () => {
    const source = get().project.devices[get().activeDevice]
    editDevices('addDevice', (p) => {
      const device = source
        ? createDevice({ id: source.id, colorway: source.colorway, orientation: source.orientation })
        : createDevice()
      return { ...p, devices: [...p.devices, placeNewDevice(p, device, get().playhead, get().activeDevice)] }
    }, (p) => ({ activeDevice: p.devices.length - 1 }))
  },

  duplicateDevice: (index) => {
    if (!Number.isInteger(index) || !get().project.devices[index]) return
    editDevices('duplicateDevice', (p) => {
      const source = p.devices[index]
      if (!source) return p
      const copy = placeNewDevice(p, { ...source, instanceId: crypto.randomUUID() }, get().playhead, index)
      return { ...p, devices: [...p.devices.slice(0, index + 1), copy, ...p.devices.slice(index + 1)] }
    }, () => ({ activeDevice: index + 1 }))
  },

  removeDevice: (index) => {
    // A scene with no devices has nothing to show and no way back, so the
    // last one can't be removed.
    if (!Number.isInteger(index) || !get().project.devices[index] || get().project.devices.length <= 1) return
    editDevices('removeDevice', (p) => ({ ...p, devices: p.devices.filter((_, i) => i !== index) }))
  },

  applyTemplate: (templateId) => {
    const template = getTemplate(templateId)
    if (!template) return
    edit('template', (p) => ({
      ...p,
      devices: applyTemplateToDevices(template, p.devices),
      camera: templateCamera(template),
      output: template.suggestedOutput ?? p.output,
      // Backdrop and shadow carry the look as much as the pose does.
      background: template.background ?? p.background,
      environment:
        template.shadowOpacity === undefined
          ? p.environment
          : { ...p.environment, shadowOpacity: template.shadowOpacity },
    }), { activeDevice: 0 })
  },

  applyMotionPlan: (plan) => {
    // Compile before recording history: a rejected plan must leave every key untouched.
    const project = compileMotionPlan(get().project, plan)
    resetCoalescing()
    edit('motionPlan', () => project, { activeDevice: 0, playhead: 0, playing: false, editorMode: 'movie', motionPreset: 'none' })
    resetCoalescing()
  },

  clearMotionPlan: () => {
    if (!get().project.motionPlan) return
    resetCoalescing()
    edit('clearMotionPlan', clearMotionPlan)
    resetCoalescing()
    set({ playhead: 0, playing: false, motionPreset: 'none' })
  },

  setScreenMedia: (ref) => editDevice('screen', (d) => ({ ...d, screen: ref })),
  setScreenFit: (fit) => editDevice('fit', (d) => ({ ...d, screenFit: fit })),
  setDeviceId: (id) =>
    // A colorway id is only meaningful within its own manifest, so reset to
    // the incoming device's first swatch rather than carrying a stale one.
    editDevice('device', (d) => ({ ...d, id, colorway: getManifest(id).colorways[0].id })),
  setColorway: (colorway) => editDevice('colorway', (d) => ({ ...d, colorway })),
  setOrientation: (orientation) => editDevice('orientation', (d) => ({ ...d, orientation })),

  setBackground: (bg) => edit('background', (p) => ({ ...p, background: bg })),
  setEnvironment: (patch) =>
    edit('environment', (p) => ({ ...p, environment: { ...p.environment, ...patch } })),
  setOutput: (patch) => edit('output', (p) => ({ ...p, output: { ...p.output, ...patch } })),

  setCameraPreset: (preset) => edit('cameraPreset', (p) => applyCameraAngle(p, preset)),
  setCameraPosition: (v) =>
    edit('cameraPosition', (p) => ({
      ...p,
      camera: {
        ...p.camera,
        preset: null, // a free move is no longer any named angle
        tracks: setVec3At(p.camera.tracks, 'position', get().playhead, v),
      },
    })),
  setCameraTarget: (v) => edit('cameraTarget', p => ({
    ...p, camera: { ...p.camera, preset: null, tracks: setVec3At(p.camera.tracks, 'target', get().playhead, v) },
  })),
  setCameraFov: (fov) =>
    edit('fov', (p) => ({
      ...p,
      camera: {
        ...p.camera,
        fov,
        tracks: { ...p.camera.tracks, fov: setValueAt(p.camera.tracks.fov, get().playhead, fov) },
      },
    })),
  setDeviceRotation: (v) =>
    editDevice('deviceRotation', (d) => ({
      ...d,
      transform: setVec3At(d.transform, 'rotation', get().playhead, v),
    })),
  setDevicePosition: (v) =>
    editDevice('devicePosition', (d) => ({
      ...d,
      transform: setVec3At(d.transform, 'position', get().playhead, v),
    })),
  // Uniform, like every other scale in the document — a non-uniform device is
  // a distorted device, which is never what a mockup wants.
  setDeviceScale: (v) =>
    editDevice('deviceScale', (d) => ({
      ...d,
      transform: { ...d.transform, scale: setValueAt(d.transform.scale, get().playhead, v) },
    })),
  setMotionPreset: (preset, start, duration) => {
    const state = get()
    const at = start ?? state.playhead
    const options = { deviceId: state.project.devices[state.activeDevice]?.instanceId, start: at, duration: duration ?? state.project.duration - at }
    resetCoalescing()
    edit('motionPreset', p => applyMotionPreset(p, preset, options), { motionPreset: preset, keySelection: null, playing: false })
    resetCoalescing()
  },
  }
})
