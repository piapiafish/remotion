import { useState } from 'react'
import { MOTION_PRESETS, PRESET_CHANNELS, type MotionPresetId } from '../../timeline/presets'
import { useProjectStore } from '../../store/project'
export function PresetControls() {
  const duration = useProjectStore(s => s.project.duration)
  const playhead = useProjectStore(s => s.playhead)
  const active = useProjectStore(s => s.activeDevice)
  const [start, setStart] = useState<number | null>(null)
  const [length, setLength] = useState<number | null>(null)
  const [preset, setPreset] = useState<MotionPresetId>('spin-y-360')
  const at = Math.max(0, Math.min(duration, start ?? playhead))
  const span = Math.max(0, Math.min(duration - at, length ?? duration - at))
  return <div className="preset-controls">
    <label className="add-animation"><select aria-label="Add animation" value="" onChange={e => {
      const id = e.target.value as MotionPresetId
      if (id in PRESET_CHANNELS && span > 0) { setPreset(id); useProjectStore.getState().setMotionPreset(id, at, span) }
    }}>
      <option value="">Add animation</option>
      {MOTION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.id === 'orbit' ? 'Orbit camera' : p.id === 'none' ? 'Freeze selected device' : p.label}</option>)}
    </select></label>
    <label>Start <input aria-label="Preset start" type="number" min={0} max={duration} step={0.1} value={Number(at.toFixed(3))}
      onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) setStart(n) }} /></label>
    <label>Length <input aria-label="Preset duration" type="number" min={0.1} max={duration - at} step={0.1} value={Number(span.toFixed(3))}
      onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) setLength(n) }} /></label>
    <button disabled={span <= 0} onClick={() => useProjectStore.getState().setMotionPreset(preset, at, span)}>Reapply</button>
    <span title={'Replaces keys in this range on: ' + PRESET_CHANNELS[preset].join(', ') + '. Outer keys remain connected.'}>
      {preset === 'orbit' ? 'Camera' : 'Device ' + (active + 1)} · replaces keys in range
    </span>
  </div>
}
