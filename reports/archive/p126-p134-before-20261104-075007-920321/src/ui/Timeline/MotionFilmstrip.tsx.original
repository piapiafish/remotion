import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../../store/project'
import { motionTimelineFrames } from '../../timeline/motionPlan'
import { backdropCss } from '../../scene/Backdrop'
import { renderMotionThumbnails } from './motionThumbnails'
import type { Project } from '../../store/schema'

export function MotionFilmstrip({ project }: { project: Project }) {
  const frames = useMemo(() => motionTimelineFrames(project).filter(frame =>
    Number.isInteger(frame.t) || frame.t === project.duration,
  ), [project])
  const playhead = useProjectStore(s => s.playhead)
  const [images, setImages] = useState<{ project: Project; urls: Record<number, string> } | null>(null)
  const [failedProject, setFailedProject] = useState<Project | null>(null)
  useEffect(() => renderMotionThumbnails(project, frames.map(f => f.t), (t, url) => {
    setImages(prev => ({ project, urls: { ...(prev?.project === project ? prev.urls : {}), [t]: url } }))
  }, () => setFailedProject(project)), [project, frames])
  const current = frames.findLast(f => f.t <= playhead) ?? frames[0]
  const urls = images?.project === project ? images.urls : {}

  return <div className="motion-filmstrip" aria-label="每秒手机画面与计划关键帧">
    <span className="track-label">画面 / 秒</span>
    <div className="motion-frame-lane">
      {frames.map(frame => {
        const isCurrent = current.t === frame.t
        const pose = frame.state
        const details = `位置 ${pose.position.map(v => v.toFixed(2)).join(', ')}；旋转 ${pose.rotation.map(v => (v * 180 / Math.PI).toFixed(0) + '°').join(', ')}；缩放 ${pose.scale.toFixed(2)}`
        return <button key={frame.t} type="button"
          className={`motion-frame${isCurrent ? ' selected' : ''}${frame.isKey ? ' is-key' : ''}`}
          style={{ left: `${frame.t / project.duration * 100}%`, transform: frame.t === 0 ? 'none' : frame.t === project.duration ? 'translateX(-100%)' : undefined }}
          data-time={frame.t} aria-label={`${frame.t}秒 · ${frame.description}`} aria-pressed={isCurrent}
          title={`${frame.t}s · ${frame.isKey ? '关键帧' : '插值画面'} · ${frame.description}\n${details}`}
          onClick={() => {
            const store = useProjectStore.getState()
            store.setPlaying(false)
            store.setPlayhead(frame.t)
          }}>
          <span className="motion-frame-time">{frame.isKey ? '◆ ' : ''}{Number(frame.t.toFixed(2))}s</span>
          <span className="motion-frame-image" style={backdropCss(project.background)}>
            {urls[frame.t] ? <img src={urls[frame.t]} alt={`${frame.t}秒手机模型姿态`} /> : <span>{failedProject === project ? '预览暂不可用' : '渲染中…'}</span>}
          </span>
          <span className="motion-frame-description">{frame.description}</span>
        </button>
      })}
    </div>
  </div>
}
