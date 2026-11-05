import type { DisplayRange, Project, TrackSet } from '../store/schema'
import { targetTracks, type TrackTarget } from './editing'
import { withObjectTracks } from './objectEditing'

export function displayRange(item: { displayRange?: DisplayRange }, duration: number): DisplayRange {
  return item.displayRange ?? { start: 0, end: duration }
}
export function isDisplayed(item: { displayRange?: DisplayRange }, t: number, duration=Infinity): boolean {
  const range=displayRange(item,duration)
  return t >= range.start - 1e-9 && t < range.end - 1e-9
}
export function changeDisplayRange(project: Project, target: TrackTarget, range: DisplayRange, shift = 0): Project {
  if (target.kind === 'camera' || !Number.isFinite(shift) || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start) return project
  const item = (target.kind === 'device' ? project.devices : project.texts ?? []).find(x => x.instanceId === target.instanceId)
  if (!item) return project
  let next = project
  if (shift) {
    if(target.kind==='device'&&project.devices.find(d=>d.instanceId===target.instanceId)?.screenClips?.some(c=>Math.min(c.displayRange.start,c.playback.start)+shift<0))return project
    const tracks = targetTracks(project, target)!
    if (Object.values(tracks).some(track => track.keys.some(k => k.t + shift < -1e-8))) return project
    const moved: TrackSet = Object.fromEntries(Object.entries(tracks).map(([c, track]) => [c, { ...track, keys: track.keys.map(k => ({ ...k, t: Math.max(0, k.t + shift) })) }]))
    next = withObjectTracks(project, target, moved)
  }
  return { ...next, version: 3, duration: Math.max(project.duration, range.end),
    devices: next.devices.map(d => target.kind === 'device' && d.instanceId === target.instanceId ? { ...d, displayRange: range, ...(shift&&d.screenClips?{screenClips:d.screenClips.map(c=>({...c,displayRange:{start:c.displayRange.start+shift,end:c.displayRange.end+shift},playback:{...c.playback,start:c.playback.start+shift,...(c.playback.stop!==undefined?{stop:c.playback.stop+shift}:{})}}))}:{}), ...(shift && d.screenPlayback ? { screenPlayback: { ...d.screenPlayback, start: Math.max(0, d.screenPlayback.start + shift) } } : {}) } : d),
    texts: next.texts?.map(t => target.kind === 'text' && t.instanceId === target.instanceId ? { ...t, displayRange: range } : t) }
}
