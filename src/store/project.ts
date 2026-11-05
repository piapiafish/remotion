import { cameraSegments, segmentedCamera, insertCameraSegment, recordingWindow, localCameraTracks } from '../timeline/cameraSegments'
import { focusReference } from '../scene/depthOfField'
import { clipEnd, clipError, deviceClips, withClips, type ClipPatch } from '../media/screenClips'
import type { ScreenClip } from './schema'
import { freezeScaleAnchor, scaleFromAnchor } from './scaleAnchor'
import { sampleSolidPose } from '../scene/solidBounds'
import { changeDisplayRange } from '../timeline/displayRange'
import { useCameraSession, resetCameraSession } from './cameraSession'
import { create } from 'zustand'
import { createDefaultProject, createDevice } from './defaults'
import { placeNewDevice } from './devicePlacement'
import { applyTemplateToDevices, getTemplate, templateCamera } from '../timeline/templates'
import { emptyHistory, record, redo, resetCoalescing, undo, type History } from './history'
import type { ExportQuality } from '../export/frameRenderer'
import { deserializeProject, downloadProject, mediaRefs, missingMedia, projectFingerprint, ProjectOpenCancelled, serializeProject } from './persist'
import { normalizePlayback } from '../media/videoTiming'
import { reportError, useFeedbackStore } from './feedback'
import { applyCameraAngle, applyMotionPreset, type MotionPresetId } from '../timeline/presets'
import { setKey, setVec3At } from '../timeline/tracks'
import { addEditableKey, channelFallback, deleteEditableKey, easeEditableKey, editChannel, moveEditableKey, targetTracks, validSelection, type KeySelection, type TrackTarget } from '../timeline/editing'
import { sampleTimeline, sampleTrack, sampleDevice } from '../timeline/sample'
import { ensureFixedGround, groundConstraintConflicts } from '../scene/groundPlane'
import { constrainGroundPose } from '../scene/deviceBounds'
import { useReplacement } from './replacement'
import { chooseSaveDestination, writeProjectFile, type SaveResult } from './saveDestination'
import { focusDistance } from '../scene/sceneEffects'
import { addObjectKey, deleteObjectKey, easeObjectKey, moveObjectKey, poseValueAt, withObjectTracks, objectPoses, poseMatches } from '../timeline/objectEditing'
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
  ScreenPlayback,
  Vec3,
  ObjectRef,
  TextObject,
  SceneEffects,
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
  saveProject: (options?: {confirmWrite?:boolean}) => Promise<SaveResult>
  openProject: (file: Blob) => Promise<void>
  savedFingerprint: string
  fileBusy: boolean
  documentEpoch: number
  hasUnsavedChanges: () => boolean
  setEditorMode: (mode: 'movie' | 'image') => void
  setName: (name: string) => void
  setPlayhead: (t: number) => void
  setPlaying: (playing: boolean) => void
  setDuration: (seconds: number) => void
  setFps: (fps: 30 | 60) => void

  /** Index of the device the inspector edits. Transient, not part of the doc. */
  activeDevice: number
  activeObject: ObjectRef | null
  selectObject: (ref: ObjectRef | null) => void
  editorPage: 'templates' | 'editor' | 'camera'
  setEditorPage: (page: 'templates' | 'editor' | 'camera') => void
  startTemplate: (id: string) => void
  addText: (kind?:'sticker'|'solid') => void
  setDisplayRange: (target:TrackTarget,range:{start:number;end:number}|null,shift?:number) => void
  applyCameraRecording: () => void
  selectedCameraSegmentId: string | null
  selectCameraSegment: (id: string | null) => void
  startCameraRecording: (id?: string) => void
  removeCameraSegment: (id: string) => void
  setCameraPose: (pose: import('./schema').SceneState['camera']) => void
  setText: (patch: Partial<Omit<TextObject, 'instanceId' | 'transform'>>) => void
  setTextValue: (channel: string, value: number) => void
  setTextValues: (values: Record<string,number>) => void
  renameObject: (name: string) => void
  duplicateObject: (ref: ObjectRef) => void
  removeObject: (ref: ObjectRef) => void
  moveTextLayer: (direction: -1 | 1) => void
  setObjectScale: (value: number) => void
  setEffects: (effects: SceneEffects) => void
  addObjectKey: (target: TrackTarget) => void
  setActiveDevice: (index: number) => void
  addDevice: () => void
  duplicateDevice: (index: number) => void
  removeDevice: (index: number) => void
  applyTemplate: (templateId: string) => void
  applyMotionPlan: (plan: unknown) => void
  clearMotionPlan: () => void

  activeClipId: string | null
  selectScreenClip: (clipId:string,instanceId?:string)=>void
  addScreenClip: (media:MediaRef,name?:string,instanceId?:string)=>void
  updateScreenClip: (clipId:string,patch:ClipPatch,instanceId?:string)=>void
  removeScreenClip: (clipId:string)=>void
  moveScreenClip: (clipId:string,direction:-1|1)=>void
  replaceScreenClip: (clipId:string,media:MediaRef,name?:string,instanceId?:string)=>void
  setScreenMedia: (ref: MediaRef | null, instanceId?: string) => void
  setScreenPlayback: (patch: Partial<ScreenPlayback>) => void
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
  setTimelineKeyValue: (value: number, channel?: string) => void
  setTimelineKeyEase: (ease: EaseHandle) => void
  setKeyContinuous: () => void
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

type EditUi = Partial<Pick<ProjectStore, 'activeDevice' | 'activeObject' | 'playhead' | 'playing' | 'editorMode' | 'motionPreset' | 'keySelection'>>

function retainObject(project: Project, ref: ObjectRef | null, index: number): ObjectRef | null {
  if (!ref) return null
  const list = ref.kind === 'device' ? project.devices : project.texts ?? []
  if (list.some(item => item.instanceId === ref.instanceId)) return ref
  const device = project.devices[clampSelection(index, project.devices.length)]
  return device ? { kind: 'device', instanceId: device.instanceId } : project.texts?.[0] ? { kind: 'text', instanceId: project.texts[0].instanceId } : null
}

export const useProjectStore = create<ProjectStore>((set, get) => {
  const initial = ensureFixedGround({...createDefaultProject(),version:5})
  let approved=false
  const canReplace = (kind:'open'|'new',action:()=>void) => {
    if(approved||!get().hasUnsavedChanges()||typeof window==='undefined')return true
    if(useReplacement.getState().pending)return false
    const before=get().project,epoch=get().documentEpoch
    get().setPlaying(false)
    useReplacement.setState({pending:{kind,proceed:()=>{
      if(get().project!==before||get().documentEpoch!==epoch){useFeedbackStore.getState().show({kind:'error',message:'等待期间工程已改变，已保留当前工程，请重新操作。'});return}
      approved=true;try{action()}finally{approved=false}
    }}})
    return false
  }
  let gesture: { project: Project; history: History; selection: KeySelection | null } | null = null
  /**
   * Every document mutation goes through here, so undo coverage can't drift
   * out of sync with the set of actions. `label` groups a continuous gesture
   * (a field drag, a slider) into one history entry.
   */
  const edit = (label: string, update: (p: Project) => Project, ui: EditUi | ((p: Project) => EditUi) = {}) =>
    set((s) => {
      let project = update(s.project)
      if(project!==s.project)project={...project,version:5}
      if(project!==s.project&&project.environment.groundY!==undefined){
        const time=(typeof ui==='object'?ui.playhead:undefined)??s.playhead
        const devices=project.devices.map(d=>{
          const old=s.project.devices.find(x=>x.instanceId===d.instanceId)
          if(old&&old.transform===d.transform&&old.id===d.id&&old.orientation===d.orientation)return d
          const raw=sampleDevice(d,time),pose=constrainGroundPose(raw,d,project.environment.groundY)
          return pose===raw?d:{...d,transform:poseValueAt(d.transform,'position.y',time,pose.position[1],!!d.animationEnabled)}
        })
        if(devices.some((d,i)=>d!==project.devices[i]))project={...project,devices}
      }
      if (project === s.project) return s
      const patch = typeof ui === 'function' ? ui(project) : ui
      const activeObject = patch.activeObject !== undefined ? retainObject(project, patch.activeObject, s.activeDevice)
        : patch.activeDevice !== undefined && project.devices[clampSelection(patch.activeDevice, project.devices.length)]
          ? { kind: 'device' as const, instanceId: project.devices[clampSelection(patch.activeDevice, project.devices.length)].instanceId }
          : retainObject(project, s.activeObject, s.activeDevice)
      return {
        ...patch,
        project,
        activeObject,
        history: gesture
          ? (s.project === gesture.project ? record(gesture.history, gesture.project) : s.history)
          : record(s.history, s.project, label),
        keySelection: validSelection(project, patch.keySelection === undefined ? s.keySelection : patch.keySelection),
        activeDevice: activeObject?.kind === 'device' ? project.devices.findIndex(d => d.instanceId === activeObject.instanceId) : patch.activeDevice === undefined
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

  const selectedPose=(kind:'device'|'text',id:string)=>{const key=get().keySelection;return key&&key.target.kind===kind&&key.target.instanceId===id&&Math.abs(key.t-get().playhead)<1e-6?key.poseId:undefined}
  const replace = (input: Project) => {
    resetCameraSession()
    const project=ensureFixedGround({...input,version:5})
    resetCoalescing()
    gesture = null
    set({ project, documentEpoch: get().documentEpoch + 1, savedFingerprint: projectFingerprint(project), history: emptyHistory, selectedCameraSegmentId:null, playhead: 0, playing: false, activeDevice: 0, activeObject: project.devices[0] ? { kind: 'device', instanceId: project.devices[0].instanceId } : null, keySelection: null, editingGesture: false, motionPreset: 'none', editorPage: 'editor' })
  }

  return {
  project: initial,
  savedFingerprint: projectFingerprint(initial),
  fileBusy: false,
  documentEpoch: 0,
  hasUnsavedChanges: () => projectFingerprint(get().project) !== get().savedFingerprint,
  history: emptyHistory,

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
  undo: () => {
    get().endEditGesture()
    resetCoalescing()
    set((s) => {
      const result = undo(s.history, s.project)
      return result ? { ...result, keySelection: null, activeObject: retainObject(result.project, s.activeObject, s.activeDevice), activeDevice: retainSelection(s.project, result.project, s.activeDevice) } : s
    })
  },
  redo: () => {
    get().endEditGesture()
    resetCoalescing()
    set((s) => {
      const result = redo(s.history, s.project)
      return result ? { ...result, keySelection: null, activeObject: retainObject(result.project, s.activeObject, s.activeDevice), activeDevice: retainSelection(s.project, result.project, s.activeDevice) } : s
    })
  },

  newProject: () => { if (!get().fileBusy && canReplace('new',()=>get().newProject())) { replace(createDefaultProject()); set({ editorPage: 'templates' }); useFeedbackStore.getState().dismiss() } },
  editorPage: 'templates',
  setEditorPage: editorPage => { get().endEditGesture();
    if(editorPage==='camera'){get().startCameraRecording();return}
    else resetCameraSession()
    set({ editorPage, playing: false }) },
  selectedCameraSegmentId: null,
  selectCameraSegment: id => {
    get().endEditGesture();const segment=cameraSegments(get().project.camera).find(s=>s.id===id)
    useCameraSession.setState({view:null});set({selectedCameraSegmentId:segment?.id??null,activeObject:null,keySelection:null,playing:false,...(segment?{playhead:Math.min(get().project.duration,segment.start)}:{})})
  },
  startCameraRecording: id => {
    const s=get();s.endEditGesture();const window=recordingWindow(s.project.camera,s.playhead,s.project.duration,id)
    if(!window||window.end-window.start<1/s.project.fps-1e-8){useFeedbackStore.getState().show({kind:'info',message:'此处已有相机动画，或空档不足一帧。请选择空白时间，或选中一段重新录制。'});return}
    useCameraSession.setState({mode:'ready',view:sampleTimeline(s.project,window.start).camera,draft:{},start:window.start,end:window.start,limit:window.end,replaceId:id??null,frame:-1})
    set({editorPage:'camera',activeObject:null,keySelection:null,playing:false,playhead:window.start})
  },
  removeCameraSegment: id => {
    if(!cameraSegments(get().project.camera).some(s=>s.id===id))return
    resetCoalescing();edit('removeCameraSegment',p=>{const camera=segmentedCamera(p.camera),segments=camera.segments!.filter(s=>s.id!==id);return {...p,camera:{...camera,segments,animationEnabled:!!segments.length}}},{keySelection:null});resetCoalescing()
    useCameraSession.setState({view:null});set({selectedCameraSegmentId:null,playing:false})
  },
  startTemplate: id => {
    const template = getTemplate(id)
    if (!template || get().fileBusy || !canReplace('new',()=>get().startTemplate(id))) return
    const base = createDefaultProject()
    replace({ ...base, devices: applyTemplateToDevices(template, base.devices).map(d=>freezeScaleAnchor(d)), camera: templateCamera(template), output: template.suggestedOutput ?? base.output, background: template.background ?? base.background, environment: { ...base.environment, shadowOpacity: template.shadowOpacity ?? base.environment.shadowOpacity } })
    set({ editorMode: 'movie' })
  },
  saveProject: async (options) => {
    if (get().fileBusy) return 'failed'
    get().endEditGesture()
    const project = get().project,epoch=get().documentEpoch
    set({ fileBusy: true })
    try {
      const handle=options?.confirmWrite?await chooseSaveDestination(project.name):null
      const blob=await serializeProject(project)
      if(handle)await writeProjectFile(handle,blob);else downloadProject(blob,project.name)
      if(get().documentEpoch!==epoch||get().project!==project){useFeedbackStore.getState().show({kind:'info',message:'已保存此前版本，当前新修改仍未保存。'});return 'failed'}
      if(handle||!options?.confirmWrite)set({ savedFingerprint: projectFingerprint(project) })
      useFeedbackStore.getState().show({ kind: 'info', message: handle?'工程已保存。':'已发起 .mockup 下载，请确认浏览器已保存文件。' })
      return handle?'saved':'downloaded'
    } catch (error) {
      if(error instanceof Error&&error.name==='AbortError')return 'cancelled'
      reportError('保存工程失败，当前工程仍可编辑，请重试', error);return 'failed'
    } finally { set({ fileBusy: false }) }
  },
  openProject: async (file) => {
    if (get().fileBusy || !canReplace('open',()=>{void get().openProject(file)})) return
    get().endEditGesture()
    const before = get().project
    set({ fileBusy: true })
    try {
      const project = await deserializeProject(file, labels => typeof window === 'undefined' || window.confirm(`该工程的 ${labels.join('、')} 缺少素材。确定：继续打开并重新绑定素材。取消：保留当前工程。`))
      if (get().project !== before) {
        new Set(mediaRefs(project).map(ref => ref.url).filter(Boolean)).forEach(url => URL.revokeObjectURL(url))
        throw new Error('加载期间工程已被修改，请保存当前修改后重新打开。')
      }
      replace(project)
      const missing = missingMedia(project)
      if (missing.length) useFeedbackStore.getState().show({ kind: 'error', message: `工程已打开，但 ${missing.join('、')} 的素材缺失。请选择对应设备重新绑定，完成后再保存。` })
      else {
        const constrained=groundConstraintConflicts(project)
        useFeedbackStore.getState().show({kind:'info',message:constrained.length?`工程已打开。${constrained.join('、')}的部分姿态低于地面，已按地面限制显示；原关键帧保留。`:'工程已打开。'})
      }
    } catch (error) {
      if (error instanceof ProjectOpenCancelled) useFeedbackStore.getState().show({ kind: 'info', message: '已取消打开，当前工程已保留。' })
      else reportError('打开工程失败，已保留当前工程', error)
    }
    finally { set({ fileBusy: false }) }
  },

  playhead: 0,
  playing: false,
  motionPreset: 'none',
  editorMode: 'movie',
  activeDevice: 0,
  activeObject: null,
  selectObject: activeObject => {
    if(useCameraSession.getState().mode!=='idle')return
    get().endEditGesture()
    resetCoalescing()
    const ref = retainObject(get().project, activeObject, get().activeDevice)
    set({ selectedCameraSegmentId:null, activeObject: ref, ...(ref?.kind === 'device' ? { activeDevice: get().project.devices.findIndex(d => d.instanceId === ref.instanceId) } : {}), keySelection: null, playing: false, motionPreset: 'none' })
  },
  keySelection: null,
  editingGesture: false,
  canvasTool: 'translate',
  selectKey: (selection) => {
    resetCoalescing()
    if(selection?.target.kind==='camera'){set({keySelection:null});return}
    set(s => {
      const keySelection=validSelection(s.project,selection)
      if(!keySelection)return {keySelection:null}
      const target=keySelection.target
      return {keySelection,playing:false,playhead:keySelection.t,activeObject:target.kind==='camera'?null:target,...(target.kind==='device'?{activeDevice:s.project.devices.findIndex(d=>d.instanceId===target.instanceId)}:{})}
    })
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
    if(target.kind==='camera')return
    const t = Math.min(get().project.duration, get().playhead)
    resetCoalescing()
    edit('addKey', p => addEditableKey(p, target, channel, t), { keySelection: { target, channel, t }, playing: false })
    resetCoalescing()
  },
  addObjectKey: target => {
    if(target.kind==='camera')return
    const t = get().playhead,id=crypto.randomUUID()
    resetCoalescing()
    edit('objectKey', p => addObjectKey(p, target, t,id), { keySelection: { target, channel: '*', t,poseId:id }, playing: false })
    resetCoalescing()
  },
  moveTimelineKey: (selection, to) => {
    if(selection.target.kind==='camera')return
    if (!Number.isFinite(to)) return
    const t = Math.max(0, to)
    const baseline = gesture?.project ?? get().project
    if (selection.channel === '*') {
      const moved = moveObjectKey(baseline, selection.target, selection.t, t,selection.poseId)
      const tracks = targetTracks(moved, selection.target)
      if (tracks) edit('moveObjectKey', p => ({...withObjectTracks(p, selection.target, tracks),duration:moved.duration}), { keySelection: { ...selection, t }, playhead: t, playing: false })
      return
    }
    const original = targetTracks(baseline, selection.target)?.[selection.channel]
    const moved = moveEditableKey(original, selection.t, t)
    if (!moved) return
    edit('moveKey', p => ({...editChannel(p, selection.target, selection.channel, () => moved),duration:Math.max(p.duration,t)}),
      { keySelection: { ...selection, t }, playhead: t, playing: false })
  },
  deleteTimelineKey: () => {
    const selection = validSelection(get().project, get().keySelection)
    if (!selection||selection.target.kind==='camera') return
    if(selection.channel==='*'&&objectPoses(get().project,selection.target).find(k=>selection.poseId?k.id===selection.poseId:Math.abs(k.t-selection.t)<1e-6)?.initial){useFeedbackStore.getState().show({kind:'info',message:'首关键帧不可删除。可修改其姿态，或删除整个对象。'});return}
    resetCoalescing()
    if (selection.channel === '*') {
      edit('deleteObjectKey', p => deleteObjectKey(p, selection.target, selection.t,selection.poseId), { keySelection: null })
      resetCoalescing(); return
    }
    edit('deleteKey', p => {
      const fallback = sampleTrack(targetTracks(p, selection.target)?.[selection.channel], selection.t, channelFallback(p, selection.target, selection.channel))
      return editChannel(p, selection.target, selection.channel, track => deleteEditableKey(track, selection.t, fallback))
    }, { keySelection: null })
    resetCoalescing()
  },
  setTimelineKeyValue: (value, channel) => {
    const selection = validSelection(get().project, get().keySelection)
    const c=channel ?? selection?.channel
    if (!selection || selection.target.kind==='camera' || !c || c === '*' || !Number.isFinite(value)) return
    if(c==='scale'&&selection.target.kind==='device'){edit('keyScale',p=>({...p,devices:p.devices.map(d=>d.instanceId===(selection.target as {instanceId:string}).instanceId?scaleFromAnchor(d,selection.t,value,p.environment.groundY,selection.poseId):d)}));return}
    const v = c === 'scale' ? Math.max(0.05, value) : c === 'opacity' ? Math.max(0,Math.min(1,value))
      : c === 'fov' ? Math.max(1, Math.min(179, value)) : value
    resetCoalescing()
    edit('keyValue', p => editChannel(p, selection.target, c, track => selection.poseId&&track?{...track,keys:track.keys.map(k=>poseMatches(k,selection.t,selection.poseId)?{...k,v}:k)}:setKey(track, selection.t, v)))
    resetCoalescing()
  },
  setTimelineKeyEase: (ease) => {
    const selection = validSelection(get().project, get().keySelection)
    if (!selection || selection.target.kind==='camera' || ease.length !== 4 || !ease.every(Number.isFinite) || ease[0] < 0 || ease[0] > 1 || ease[2] < 0 || ease[2] > 1) return
    resetCoalescing()
    if (selection.channel === '*') {
      edit('objectEase', p => easeObjectKey(p, selection.target, selection.t, ease,selection.poseId))
      resetCoalescing(); return
    }
    edit('keyEase', p => editChannel(p, selection.target, selection.channel, track => easeEditableKey(track, selection.t, ease) ?? track!))
    resetCoalescing()
  },
  exportQuality: 'high',
  setKeyContinuous: () => {
    const selected = get().keySelection
    if (!selected) return
    resetCoalescing()
    edit('continuous', p => { const tracks = targetTracks(p,selected.target); if(!tracks)return p; return withObjectTracks(p,selected.target,Object.fromEntries(Object.entries(tracks).map(([c,t])=>[c,selected.channel==='*'||selected.channel===c?{...t,interpolation:'continuous' as const}:t]))) })
    resetCoalescing()
  },
  matchSource: false,

  setExportQuality: (exportQuality) => set({ exportQuality }),

  // Opt-in because matching a tall source can multiply both output axes.
  // Typing a size also turns it off, keeping the dimensions authoritative.
  setMatchSource: (matchSource: boolean) => set({ matchSource }),

  setEditorMode: (editorMode) => set({ editorMode }),
  setName: (name) => edit('name', (p) => ({ ...p, name })),

  setPlayhead: (t) => { if (Number.isFinite(t)) set({ playhead: Math.max(0, Math.min(get().project.duration, t)) }) },
  setPlaying: (playing) => {if(playing&&useCameraSession.getState().mode==='idle')useCameraSession.setState({view:null});set(s=>({playing,...(playing&&s.playhead>=s.project.duration?{playhead:0}:{})}))},
  setDuration: seconds => {
    if(!Number.isFinite(seconds))return
    const duration=Math.max(.1,seconds),selection=get().keySelection
    edit('duration',p=>({...p,duration}),{playhead:Math.min(get().playhead,duration),keySelection:selection && selection.t>duration ? null : selection})
  },
  // Frame rate is a document property, not an export setting: it decides
  // which times the timeline is sampled at, so changing it changes the clip
  // rather than just the file.
  setFps: (fps) => edit('fps', (p) => ({ ...p, fps })),

  setActiveDevice: (index) => {
    if(useCameraSession.getState().mode!=='idle')return
    get().endEditGesture()
    resetCoalescing()
    set((s) => { const activeDevice = clampSelection(index, s.project.devices.length); return { activeDevice, activeObject: s.project.devices[activeDevice] ? { kind: 'device' as const, instanceId: s.project.devices[activeDevice].instanceId } : null, keySelection: null, motionPreset: 'none' } })
  },

  addDevice: () => {
    const source = get().project.devices[get().activeDevice]
    editDevices('addDevice', (p) => {
      const device = source
        ? createDevice({ id: source.id, colorway: source.colorway })
        : createDevice()
      return { ...p, devices: [...p.devices, freezeScaleAnchor(placeNewDevice(p, device, get().playhead, get().activeDevice),p.environment.groundY,get().playhead)] }
    }, (p) => ({ activeDevice: p.devices.length - 1 }))
  },

  duplicateDevice: (index) => {
    if (!Number.isInteger(index) || !get().project.devices[index]) return
    editDevices('duplicateDevice', (p) => {
      const source = p.devices[index]
      if (!source) return p
      const copy = freezeScaleAnchor(placeNewDevice(p, { ...source, instanceId: crypto.randomUUID(),...(source.screenClips?{screenClips:source.screenClips.map(c=>({...c,clipId:crypto.randomUUID()}))}:{}) }, get().playhead, index),p.environment.groundY,get().playhead)
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
      devices: applyTemplateToDevices(template, p.devices).map(d=>freezeScaleAnchor(d,p.environment.groundY)),
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

  activeClipId:null,
  selectScreenClip:(clipId,instanceId)=>{
    const id=instanceId??get().project.devices[get().activeDevice]?.instanceId
    const i=get().project.devices.findIndex(d=>d.instanceId===id)
    if(i>=0){get().selectObject({kind:'device',instanceId:id!});set({activeClipId:clipId})}
  },
  addScreenClip:(media,name='视频',instanceId)=>{
    if(media.kind!=='video')return
    const state=get(),id=instanceId??state.project.devices[state.activeDevice]?.instanceId
    if(!state.project.devices.some(d=>d.instanceId===id))return
    const start=state.playhead,end=start+(media.duration??0),clipId=crypto.randomUUID()
    const clip:ScreenClip={clipId,name,media,displayRange:{start,end},playback:{in:0,out:media.duration??0,start,stop:end,loop:false,rate:1},fit:state.project.devices.find(d=>d.instanceId===id)!.screenFit}
    const reason=clipError(clip,state.project.fps);if(reason){reportError('添加视频失败',new Error(reason));return}
    resetCoalescing();edit('addVideo',p=>({...p,duration:Math.max(p.duration,end),devices:p.devices.map(d=>d.instanceId===id?withClips(d,[clip,...deviceClips(d,p.duration)]):d)}));set({activeClipId:clipId});resetCoalescing()
  },
  updateScreenClip:(clipId,patch,instanceId)=>{
    const state=get(),id=instanceId??state.project.devices[state.activeDevice]?.instanceId,d=state.project.devices.find(d=>d.instanceId===id)
    const original=d&&deviceClips(d,state.project.duration).find(c=>c.clipId===clipId);if(!original)return
    const timingEdit=!!patch.playback||!!patch.displayRange||!!patch.media
    const next={...original,...patch,clipId:original.clipId,...(patch.displayRange?{followObjectRange:false}:{}),playback:{...original.playback,...(timingEdit?{stop:clipEnd(original),loop:false}:{}),...patch.playback}}
    const error=clipError(next,state.project.fps);if(error){reportError('视频片段未修改',new Error(error));return}
    edit('videoClip',p=>({...p,duration:Math.max(p.duration,next.displayRange.end,clipEnd(next)),devices:p.devices.map(d=>d.instanceId===id?withClips(d,deviceClips(d,p.duration).map(c=>c.clipId===clipId?next:c)):d)}))
  },
  removeScreenClip:clipId=>{
    const id=get().project.devices[get().activeDevice]?.instanceId
    resetCoalescing();edit('removeVideo',p=>({...p,devices:p.devices.map(d=>d.instanceId===id?withClips(d,deviceClips(d,p.duration).filter(c=>c.clipId!==clipId)):d)}));set({activeClipId:null});resetCoalescing()
  },
  moveScreenClip:(clipId,direction)=>{
    const id=get().project.devices[get().activeDevice]?.instanceId
    resetCoalescing();edit('videoOrder',p=>({...p,devices:p.devices.map(d=>{if(d.instanceId!==id)return d;const clips=[...deviceClips(d,p.duration)],index=clips.findIndex(c=>c.clipId===clipId),to=index+direction;if(index<0||to<0||to>=clips.length)return d;[clips[index],clips[to]]=[clips[to],clips[index]];return withClips(d,clips)})}));resetCoalescing()
  },
  replaceScreenClip:(clipId,media,name,instanceId)=>{
    const state=get(),id=instanceId??state.project.devices[state.activeDevice]?.instanceId,d=state.project.devices.find(d=>d.instanceId===id),old=d&&deviceClips(d,state.project.duration).find(c=>c.clipId===clipId)
    if(!old||media.kind!=='video')return
    const playback={...normalizePlayback(media.duration??0,old.playback),stop:clipEnd(old),loop:false}
    resetCoalescing();get().updateScreenClip(clipId,{media,name:name??old.name,playback},id);resetCoalescing()
    if(playback.in!==old.playback.in||playback.out!==old.playback.out)useFeedbackStore.getState().show({kind:'info',message:'新素材较短，源入点和出点已调整；显示与播放区间保持，请检查停止画面。'})
  },
  setScreenMedia: (ref, instanceId) => {
    const id = instanceId ?? get().project.devices[get().activeDevice]?.instanceId
    const previous = get().project.devices.find(d => d.instanceId === id)
    const adjusted = ref?.kind === 'video' && previous?.screen?.missing && previous.screenPlayback
      ? normalizePlayback(ref.duration ?? 0, previous.screenPlayback) : undefined
    resetCoalescing()
    edit('screen', p => ({ ...p, devices: p.devices.map(d => d.instanceId === id
      ? { ...d, screen: ref, screenPlayback: ref?.kind === 'video' && d.screen?.missing
        ? normalizePlayback(ref.duration ?? 0, d.screenPlayback) : undefined }
      : d) }))
    resetCoalescing()
    if (adjusted && previous?.screenPlayback && (adjusted.in !== previous.screenPlayback.in || adjusted.out !== previous.screenPlayback.out)) {
      useFeedbackStore.getState().show({ kind: 'info', message: '素材已重新绑定；新录屏较短，源入点和出点已调整到有效范围，请检查录屏时序。' })
    }
  },
  setScreenPlayback: patch => {
    const d = get().project.devices[get().activeDevice]
    if(d?.screenClips){const clip=d.screenClips.find(c=>c.clipId===get().activeClipId)??d.screenClips[0];if(!clip)return;const value={...clip.playback,...patch};const stop=patch.loop===true?undefined:patch.stop??(value.start+(value.out-value.in)/(value.rate??1));get().updateScreenClip(clip.clipId,{playback:{...patch,stop}});return}
    if (d?.screen?.kind !== 'video') return
    const value = { ...normalizePlayback(d.screen.duration ?? 0, d.screenPlayback), ...patch, loop:patch.loop??false }
    const reason=!Number.isFinite(value.start)?'作品开始时间必须是有效秒数。':value.start<0?'作品开始时间不能小于 0 秒。':!Number.isFinite(value.in)||value.in<0?'原视频开始位置不能小于 0 秒。':!Number.isFinite(value.out)||value.out<=value.in?'视频结束位置必须晚于开始位置。':value.out>(d.screen.duration??0)?`结束位置超过素材长度 ${(d.screen.duration??0).toFixed(2)} 秒。`:value.rate!==undefined&&(!Number.isFinite(value.rate)||value.rate<.25||value.rate>4)?'播放速度必须在 0.25～4 倍之间。':null
    if(reason){reportError('屏幕视频未修改',new Error(reason));return}
    resetCoalescing()
    editDevice('screenPlayback', device => ({ ...device, screenPlayback: value }))
    resetCoalescing()
  },
  setScreenFit: fit => {const state=get(),d=state.project.devices[state.activeDevice],clip=d?.screenClips?.find(c=>c.clipId===state.activeClipId);if(clip)state.updateScreenClip(clip.clipId,{fit});else editDevice('fit',d=>({...d,screenFit:fit}))},
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
  setCameraPose: pose => {
    const state=get(),session=useCameraSession.getState()
    if(session.mode!=='idle'||state.project.camera.animationEnabled||cameraSegments(state.project.camera).length){useCameraSession.setState({view:pose});return}
    edit('cameraPose',p=>({...p,camera:{...p.camera,preset:null,fov:pose.fov,tracks:{...setVec3At(setVec3At(p.camera.tracks,'position',0,pose.position),'target',0,pose.target),fov:{keys:[{t:0,v:pose.fov,ease:[0,0,1,1]}]}}}}))
  },
  setCameraPosition: position => get().setCameraPose({...useCameraSession.getState().view??sampleTimeline(get().project,get().playhead).camera,position}),
  setCameraTarget: target => get().setCameraPose({...useCameraSession.getState().view??sampleTimeline(get().project,get().playhead).camera,target}),
  setCameraFov: fov => get().setCameraPose({...useCameraSession.getState().view??sampleTimeline(get().project,get().playhead).camera,fov}),
  setDisplayRange: (target,range,shift=0) => {if(range===null){edit('displayRange',p=>({...p,devices:p.devices.map(d=>target.kind==='device'&&d.instanceId===target.instanceId?{...d,displayRange:undefined}:d),texts:p.texts?.map(t=>target.kind==='text'&&t.instanceId===target.instanceId?{...t,displayRange:undefined}:t)}));return}if(!Number.isFinite(range.start)||range.start<0||!Number.isFinite(range.end)||range.end<=range.start){reportError('显示时间未修改',new Error('出现时间不能为负，消失时间必须晚于出现时间。'));return}edit('displayRange',p=>changeDisplayRange(gesture?.project??p,target,range,shift))},
  applyCameraRecording: () => {
    const session=useCameraSession.getState();if(session.mode!=='review'||session.frame<0)return
    if(session.end-session.start<1/get().project.fps-1e-8){useFeedbackStore.getState().show({kind:'info',message:'录制至少需要一帧，请重新录制。'});return}
    const segment={id:session.replaceId??crypto.randomUUID(),name:session.replaceId?cameraSegments(get().project.camera).find(s=>s.id===session.replaceId)?.name??'相机运动':'相机运动 '+(cameraSegments(get().project.camera).length+1),start:session.start,end:session.end,tracks:localCameraTracks(session.draft,session.start)}
    try{const camera=insertCameraSegment(get().project.camera,segment,session.replaceId??undefined);resetCoalescing();edit('cameraRecording',p=>({...p,camera}),{keySelection:null});resetCameraSession();set({editorPage:'editor',playing:false,playhead:session.start,selectedCameraSegmentId:segment.id});resetCoalescing()}
    catch(error){reportError('相机动画未采用',error)}
  },
  setDeviceRotation: (v) =>
    editDevice('deviceRotation', (d) => ({
      ...d,
      transform: v.reduce((tracks, value, i) => poseValueAt(tracks, `rotation.${'xyz'[i]}`, get().playhead, value, !!d.animationEnabled,selectedPose('device',d.instanceId)), d.transform),
    })),
  setDevicePosition: (v) =>
    editDevice('devicePosition', (d) => ({
      ...d,
      transform: v.reduce((tracks, value, i) => poseValueAt(tracks, `position.${'xyz'[i]}`, get().playhead, value, !!d.animationEnabled,selectedPose('device',d.instanceId)), d.transform),
    })),
  // Uniform, like every other scale in the document — a non-uniform device is
  // a distorted device, which is never what a mockup wants.
  setDeviceScale: v => {
    if(!Number.isFinite(v))return
    editDevice('deviceScale',d=>scaleFromAnchor(d,get().playhead,v,get().project.environment.groundY,selectedPose('device',d.instanceId)))
  },
  addText: (kind='sticker') => {
    const id = crypto.randomUUID(), number = (get().project.texts?.length ?? 0) + 1
    const text: TextObject = { instanceId: id, name: `标题 ${number}`,textKind:kind,layer:'front', content: '在这里输入标题', fontSize: 64, fontWeight: 600, color: '#ffffff', align: 'center', lineHeight: 1.3, width: .8, transform: { 'position.x': { keys: [{ t: 0, v: .5, ease: [0,0,1,1] }] }, 'position.y': { keys: [{ t: 0, v: .14, ease: [0,0,1,1] }] }, 'rotation.z': { keys: [{ t: 0, v: 0, ease: [0,0,1,1] }] }, scale: { keys: [{ t: 0, v: 1, ease: [0,0,1,1] }] }, opacity: { keys: [{ t: 0, v: 1, ease: [0,0,1,1] }] } } }
    if(kind==='solid'){text.transform['position.x']={keys:[{t:0,v:0,ease:[0,0,1,1]}]};text.transform['position.y']={keys:[{t:0,v:.8,ease:[0,0,1,1]}]};text.transform['position.z']={keys:[{t:0,v:0,ease:[0,0,1,1]}]};text.transform.depth={keys:[{t:0,v:.08,ease:[0,0,1,1]}]}}
    resetCoalescing()
    edit('addText', p => ({ ...p, version: 3, texts: [...p.texts ?? [], text] }), { activeObject: { kind: 'text', instanceId: id } })
    resetCoalescing()
  },
  setText: patch => {
    const ref = get().activeObject
    if (ref?.kind !== 'text') return
    edit('textStyle', p => ({ ...p, version: 3, texts: p.texts?.map(text => text.instanceId === ref.instanceId ? { ...text, ...patch } : text) }))
  },
  setTextValue: (channel,value) => get().setTextValues({[channel]:value}),
  setTextValues: values => {
    const ref=get().activeObject
    if(ref?.kind!=='text')return
    const allowed=['position.x','position.y','position.z','rotation.x','rotation.y','rotation.z','scale','opacity','depth']
    if(Object.entries(values).some(([c,v])=>!allowed.includes(c)||!Number.isFinite(v)))return
    edit('textTransform',p=>({...p,texts:p.texts?.map(text=>{
      if(text.instanceId!==ref.instanceId)return text
      let transform=text.transform
      for(const [channel,value] of Object.entries(values)){
        const v=channel==='scale'?Math.max(.05,Math.min(20,value)):channel==='opacity'?Math.max(0,Math.min(1,value)):channel==='depth'?Math.max(.001,value):value
        transform=poseValueAt(transform,channel,get().playhead,v,!!text.animationEnabled,selectedPose('text',text.instanceId))
      }
      const next={...text,transform}
      if(text.textKind==='solid'){
        const y=sampleSolidPose(next,get().playhead,p.environment.groundY).position[1]
        if(y!==sampleTrack(transform['position.y'],get().playhead,0))next.transform=poseValueAt(transform,'position.y',get().playhead,y,!!text.animationEnabled,selectedPose('text',text.instanceId))
      }
      return next
    })}))
  },
  renameObject: name => {
    if (get().activeObject?.kind === 'text') { get().setText({ name }); return }
    if (get().activeObject?.kind === 'device') editDevice('objectName', d => ({ ...d, name }))
  },
  duplicateObject: ref => {
    if (ref.kind === 'device') { get().duplicateDevice(get().project.devices.findIndex(d => d.instanceId === ref.instanceId)); return }
    const source = get().project.texts?.find(t => t.instanceId === ref.instanceId)
    if (!source) return
    const id = crypto.randomUUID()
    const transform = Object.fromEntries(Object.entries(source.transform).map(([c, track]) => [c, c === 'position.x' || c === 'position.y' ? { ...track, keys: track.keys.map(k => ({ ...k, v: k.v + .03 })) } : track]))
    resetCoalescing(); edit('duplicateText', p => ({ ...p, texts: [...p.texts ?? [], { ...source, name: source.name + ' 副本', instanceId: id, transform }] }), { activeObject: { kind: 'text', instanceId: id } }); resetCoalescing()
  },
  removeObject: ref => {
    resetCoalescing()
    const focused=focusReference(get().project)?.instanceId===ref.instanceId
    edit('removeObject', p => ({ ...p, version: 3, devices: ref.kind === 'device' ? p.devices.filter(d => d.instanceId !== ref.instanceId) : p.devices, texts: ref.kind === 'text' ? p.texts?.filter(t => t.instanceId !== ref.instanceId) : p.texts, ...(p.effects&&focusReference(p)?.instanceId === ref.instanceId ? { effects: { ...p.effects, depthOfField: { ...p.effects.depthOfField, focusDevice: null, focusObject:null, distance:focusDistance(p,get().playhead) } } } : {}) }))
    resetCoalescing()
    if(focused)useFeedbackStore.getState().show({kind:'info',message:'对焦对象已删除，已保留最后的焦点距离。可在“环境”中重新选择对焦对象。'})
  },
  moveTextLayer: direction => {
    const ref = get().activeObject, list = get().project.texts
    if (ref?.kind !== 'text' || !list) return
    const index = list.findIndex(t => t.instanceId === ref.instanceId), other = index + direction
    if (index < 0 || other < 0 || other >= list.length) return
    resetCoalescing(); edit('textOrder', p => { const texts = [...p.texts!]; [texts[index],texts[other]] = [texts[other],texts[index]]; return { ...p,texts } }); resetCoalescing()
  },
  setObjectScale: value => {
    if (!Number.isFinite(value)) return
    if (get().activeObject?.kind === 'device') get().setDeviceScale(value)
    if (get().activeObject?.kind === 'text') get().setTextValue('scale', value)
  },
  setEffects: effects => edit('effects', p => ({ ...p, version: 3, effects })),
  setMotionPreset: (preset, start, duration) => {
    const state = get()
    const at = start ?? state.playhead
    const options = { deviceId: state.project.devices[state.activeDevice]?.instanceId, start: at, duration: duration ?? state.project.duration - at }
    resetCoalescing()
    try{edit('motionPreset', p => applyMotionPreset(p, preset, options), { motionPreset: preset, keySelection: null, playing: false })}catch(error){reportError('相机动画未修改',error)}
    resetCoalescing()
  },
  }
})
