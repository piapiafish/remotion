import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { Play, Pause, Plus } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { MOTION_PRESETS, type MotionPresetId } from '../../timeline/presets'
import { keyTimes } from '../../timeline/tracks'
import { isAnimated } from '../../timeline/sample'
import { MotionFilmstrip } from './MotionFilmstrip'

/**
 * Transport and scrubbing share one time axis with the ruler and keyframes.
 * The keyframe diamonds remain read-only; dragging moves the playhead.
 */
export function TimelineBar() {
  const project = useProjectStore((s) => s.project)
  const playhead = useProjectStore((s) => s.playhead)
  const playing = useProjectStore((s) => s.playing)
  const motionPreset = useProjectStore((s) => s.motionPreset)
  const setPlayhead = useProjectStore((s) => s.setPlayhead)
  const setPlaying = useProjectStore((s) => s.setPlaying)
  const setDuration = useProjectStore((s) => s.setDuration)
  const setMotionPreset = useProjectStore((s) => s.setMotionPreset)
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingPointer = useRef<number | null>(null)

  const duration = project.duration
  const pct = (t: number) => `${(t / duration) * 100}%`

  function scrubTo(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setPlaying(false)
    setPlayhead(ratio * duration)
  }

  function stopScrubbing(e: PointerEvent<HTMLDivElement>) {
    if (draggingPointer.current !== e.pointerId) return
    draggingPointer.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const scrubHandlers = {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (e.button !== 0 || !e.isPrimary || draggingPointer.current !== null) return
      const rect = trackRef.current?.getBoundingClientRect()
      // Track labels are not part of the time axis.
      if (!rect || rect.width <= 0 || e.clientX < rect.left) return
      e.preventDefault()
      trackRef.current?.parentElement?.focus()
      draggingPointer.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      scrubTo(e.clientX)
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      if (draggingPointer.current === e.pointerId) scrubTo(e.clientX)
    },
    onPointerUp(e: PointerEvent<HTMLDivElement>) {
      if (draggingPointer.current !== e.pointerId) return
      scrubTo(e.clientX)
      stopScrubbing(e)
    },
    onPointerCancel: stopScrubbing,
    onLostPointerCapture(e: PointerEvent<HTMLDivElement>) {
      if (draggingPointer.current === e.pointerId) draggingPointer.current = null
    },
  }

  function scrubWithKeyboard(e: KeyboardEvent<HTMLDivElement>) {
    let next: number
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': next = playhead - 1 / project.fps; break
      case 'ArrowRight': case 'ArrowUp': next = playhead + 1 / project.fps; break
      case 'Home': next = 0; break
      case 'End': next = duration; break
      default: return
    }
    e.preventDefault()
    setPlaying(false)
    setPlayhead(Math.min(duration, Math.max(0, next)))
  }

  const cameraKeys = keyTimes(project.camera.tracks)
  const active = useProjectStore((s) => s.activeDevice)
  const deviceTracks = project.devices[active]?.transform ?? {}
  const deviceKeys = keyTimes(deviceTracks)
  const cameraAnimated = isAnimated(project.camera.tracks)
  const deviceAnimated = isAnimated(deviceTracks)

  // One tick per second, plus a half-second subdivision for readability.
  const seconds = Math.ceil(duration)

  return (
    <div className={project.motionPlan ? 'timeline has-motion-plan' : 'timeline'}>
      <div className="timeline-toolbar">
        <button className="play-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <label className="add-animation">
          <Plus size={14} />
          <select
            aria-label="Add animation"
            value={motionPreset}
            onChange={(e) => setMotionPreset(e.target.value as MotionPresetId)}
          >
            {MOTION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === 'none' ? 'Add animation' : p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="time-readout">
          <span className="time-now">{playhead.toFixed(2)}s</span>
          <span className="time-of">of</span>
          <input
            className="time-duration"
            type="number"
            min={0.5}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <span className="time-of">s</span>
        </div>
      </div>

      <div className="timeline-body">
        <div className="timeline-content" style={project.motionPlan ? { minWidth: Math.max(600, duration * 130 + 106) } : undefined}>
        <div className="ruler" {...scrubHandlers}>
          {Array.from({ length: seconds + 1 }, (_, i) => (
            <span key={i} className="tick" style={{ left: pct(Math.min(i, duration)) }}>
              {Number(Math.min(i, duration).toFixed(2))}s
            </span>
          ))}
        </div>

        <div
          className="tracks"
          role="slider"
          aria-label="Timeline playhead"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={playhead}
          aria-valuetext={`${playhead.toFixed(2)} seconds`}
          tabIndex={0}
          onKeyDown={scrubWithKeyboard}
          {...scrubHandlers}
        >
          <TrackRow label="Camera" keys={cameraKeys} animated={cameraAnimated} pct={pct} />
          <TrackRow label="Device" keys={deviceKeys} animated={deviceAnimated} pct={pct} cues={project.motionPlan?.cues} />
          <div className="playhead-track" ref={trackRef}>
            <div className="playhead" style={{ left: pct(playhead) }}>
              <span className="playhead-grip" />
            </div>
          </div>
        </div>
        {project.motionPlan && <MotionFilmstrip project={project} />}
        </div>
      </div>
      {project.motionPlan && <div className="motion-now" role="status">
        <span>{playhead.toFixed(2)}s</span>
        <span>{project.motionPlan.cues.findLast(cue => cue.t <= playhead)?.description}</span>
        <span className="hint">横向滚动查看全部画面 · 点击定位</span>
      </div>}
    </div>
  )
}

function TrackRow({
  label,
  keys,
  animated,
  pct,
  cues,
}: {
  label: string
  keys: number[]
  animated: boolean
  pct: (t: number) => string
  cues?: { t: number; description: string }[]
}) {
  const seek = (t: number) => {
    const store = useProjectStore.getState()
    store.setPlaying(false)
    store.setPlayhead(t)
  }
  return (
    <div className="track-row">
      <span className="track-label">{label}</span>
      <div className={animated ? 'track-lane animated' : 'track-lane'}>
        {animated &&
          keys.map((t) => <button key={t} type="button" className="keyframe" style={{ left: pct(t) }}
            aria-label={`${label} keyframe ${t}s`} title={`${label} · ${Number(t.toFixed(3))}s${cues?.find(c => c.t === t)?.description ? ' · ' + cues.find(c => c.t === t)!.description : ''}`}
            onPointerDown={e => e.stopPropagation()} onClick={() => seek(t)} />)}
      </div>
    </div>
  )
}
