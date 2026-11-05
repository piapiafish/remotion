import { useEffect, useRef, useState } from 'react'
import { DEVICE_LIST } from '../../devices/manifest'
import { MOTION_PRESETS } from '../../timeline/presets'
import { studioRequest, type StudioSession } from './studioClient'

const devices = DEVICE_LIST.filter((device) => device.glb)
const LAST_SESSION = 'promo-studio:last-storyboard'
const motionLabels = new Map(MOTION_PRESETS.map((preset) => [preset.id as string, preset.label]))

/** Local import/save/render controls around the original storyboard and CLI. */
export function StoryboardRenderPanel() {
  const [brief, setBrief] = useState('用真实 3D 手机展现产品的智能、高效与优雅体验')
  const [deviceId, setDeviceId] = useState('iphone-17-pro')
  const [media, setMedia] = useState('assets/demo.mp4')
  const [source, setSource] = useState('')
  const [session, setSession] = useState<StudioSession | null>(null)
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selection = useRef(0)
  const active = session?.status === 'QUEUED' || session?.status === 'RENDERING'
  const sessionId = session?.id
  const disabled = busy || active || !available

  function choose(next: StudioSession) {
    selection.current++
    setSession(next)
    try { localStorage.setItem(LAST_SESSION, next.id) } catch { /* Saving on disk still works. */ }
  }

  useEffect(() => {
    const controller = new AbortController()
    const initial = selection.current
    async function restore() {
      try {
        await studioRequest('/capabilities', undefined, controller.signal)
        if (controller.signal.aborted) return
        setAvailable(true)
        let id: string | null = null
        try { id = localStorage.getItem(LAST_SESSION) } catch { /* Browser storage is optional. */ }
        if (id) {
          const saved = await studioRequest<StudioSession>(`/storyboards/${encodeURIComponent(id)}`, undefined, controller.signal)
          if (!controller.signal.aborted && initial === selection.current) setSession(saved)
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(String((failure as Error).message))
      }
    }
    void restore()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!sessionId || !active) return
    const controller = new AbortController()
    const id = sessionId
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const next = await studioRequest<StudioSession>(`/storyboards/${id}`, undefined, controller.signal)
        if (!controller.signal.aborted) { setSession(next); setError('') }
      } catch (failure) {
        if (!controller.signal.aborted) setError(`进度读取失败，将自动重试：${(failure as Error).message}`)
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 1200)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [sessionId, active])

  async function saveSource(text: string) {
    setBusy(true)
    setError('')
    try { choose(await studioRequest<StudioSession>('/storyboards', { source: text })) }
    catch (failure) { setError(`导入失败：${(failure as Error).message}`) }
    finally { setBusy(false) }
  }

  async function build() {
    setBusy(true)
    setError('')
    try { choose(await studioRequest<StudioSession>('/plans', { brief, deviceId, media })) }
    catch (failure) { setError((failure as Error).message) }
    finally { setBusy(false) }
  }

  async function render() {
    if (!session) return
    setBusy(true)
    setError('')
    try { setSession(await studioRequest<StudioSession>(`/storyboards/${session.id}/render`, {})) }
    catch (failure) { setError((failure as Error).message) }
    finally { setBusy(false) }
  }

  async function importFile(file?: File) {
    if (!file) return
    if (file.size > 1024 * 1024) { setError('方案文件不能超过 1 MiB。'); return }
    try {
      const text = await file.text()
      setSource(text)
      await saveSource(text)
    } catch (failure) { setError(`读取文件失败：${(failure as Error).message}`) }
  }

  const status = session?.status === 'QUEUED' ? '任务已排队，等待前一个视频完成。'
    : session?.status === 'RENDERING' ? (session.progress.composing ? '镜头已完成，正在合成字幕与音乐。'
      : `正在生成镜头：已完成 ${session.progress.done}/${session.progress.total}。`)
    : session?.status === 'DONE' ? '视频已生成并通过检查，可以播放或下载。'
    : session?.status === 'READY' ? '分镜已校验并自动保存，可生成视频。'
    : session?.error?.message || ''

  return (
    <div className="agent-panel">
      <p className="hint">导入 AI 返回的分镜后，应用会自动校验并保存；生成视频时会显示进度，完成后可直接下载。</p>

      <label htmlFor="storyboard-source">AI 分镜方案</label>
      <textarea id="storyboard-source" value={source} onChange={(event) => setSource(event.target.value)} rows={5}
        placeholder="粘贴 AI 返回的 Video DSL JSON，支持包含说明文字和 Markdown 代码块。" disabled={disabled} />
      <button type="button" className="export-btn" disabled={disabled || !source.trim()}
        onClick={() => void saveSource(source)}>{busy ? '处理中…' : '导入并自动保存'}</button>
      <label htmlFor="storyboard-json-file">或选择 JSON 文件（自动导入）</label>
      <input id="storyboard-json-file" type="file" accept=".json,.txt,application/json" disabled={disabled}
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void importFile(file) }} />

      <details>
        <summary>没有分镜？生成离线方案</summary>
        <div className="agent-panel">
          <p className="hint">使用已有本地模板，3 个镜头共 15 秒，不调用模型 API。</p>
          <label htmlFor="storyboard-brief">产品宣传重点</label>
          <textarea id="storyboard-brief" value={brief} onChange={(event) => setBrief(event.target.value)} rows={3} disabled={disabled} />
          <label htmlFor="storyboard-device">真实设备 GLB</label>
          <select id="storyboard-device" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} disabled={disabled}>
            {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select>
          <label htmlFor="storyboard-media">录屏路径（相对项目目录）</label>
          <input id="storyboard-media" value={media} onChange={(event) => setMedia(event.target.value)} disabled={disabled} />
          <button type="button" className="ghost-btn" disabled={disabled} onClick={() => void build()}>生成并保存 15 秒方案</button>
        </div>
      </details>

      {error && <p role="alert" className="agent-error">{error}</p>}
      {session && <div className="agent-panel agent-saved">
        <strong>已保存的分镜</strong>
        <p className="hint">{session.summary.shots.length} 个镜头 · {session.summary.seconds} 秒 · {session.summary.width}×{session.summary.height} / {session.summary.fps} FPS</p>
        <ol className="agent-shots">
          {session.summary.shots.map((shot, i) => <li key={shot.id}>镜头 {i + 1} · {shot.seconds} 秒 · {motionLabels.get(shot.motion) || shot.motion}</li>)}
        </ol>
        <p role="status" className="agent-status">{status}</p>
        {session.error && <p role="alert" className="agent-error">{session.error.code}：{session.error.message}</p>}
        {active && <progress aria-label="镜头渲染进度" value={session.progress.done} max={session.progress.total} />}
        <button type="button" className="export-btn" disabled={disabled} onClick={() => void render()}>
          {active ? '正在生成视频…' : session.status === 'DONE' ? '重新生成视频（复用缓存）' : '生成已保存方案的视频'}
        </button>
        {session.videoUrl && <>
          <video key={session.videoUrl} src={session.videoUrl} controls preload="metadata" className="agent-video" />
          <a className="agent-download" href={`${session.videoUrl}?download=1`} download="final.mp4">下载 final.mp4</a>
        </>}
        <a href={session.boardUrl} download="storyboard.json">下载已保存的 JSON</a>
        <details>
          <summary>查看方案与保存位置</summary>
          <p className="hint">分镜：{session.path}<br />视频：{session.outputPath}/final.mp4</p>
          <pre>{JSON.stringify(session.storyboard, null, 2)}</pre>
        </details>
        {session.logTail && <details><summary>渲染日志</summary><pre>{session.logTail}</pre></details>}
      </div>}
    </div>
  )
}


