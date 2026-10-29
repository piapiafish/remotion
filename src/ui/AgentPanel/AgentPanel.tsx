import { useState } from 'react'
import { DEVICE_LIST } from '../../devices/manifest'

const devices = DEVICE_LIST.filter((device) => device.glb)

/** Local storyboard authoring UI; rendering still belongs to the worker CLI. */
export function AgentPanel() {
  const [brief, setBrief] = useState('用真实 3D 手机展现产品的智能、高效与优雅体验')
  const [deviceId, setDeviceId] = useState('iphone-17-pro')
  const [preview, setPreview] = useState('')
  const [info, setInfo] = useState('')

  const build = () => {
    const messages = brief.split(/[。！？!?；;\n]/).map((v) => v.trim()).filter(Boolean)
    const phrases = messages.length > 0 ? messages : ['智能体验', '高效协作', '创意呈现']
    const fps = 30
    const perShot = 150
    const storyboard = {
      schemaVersion: '0.1.0',
      canvas: { width: 1080, height: 1920, fps },
      assets: [
        { id: 'screen', kind: 'video', uri: 'assets/demo.mp4' },
        { id: 'music', kind: 'audio', uri: 'assets/music-demo.mp3' },
      ],
      shots: ['hero-reveal', 'spin-y-360', 'tilt-in'].map((motion, i) => ({
        shotId: `shot-${String(i + 1).padStart(3, '0')}`,
        deviceId,
        screenAssetId: 'screen',
        durationFrames: perShot,
        template: i === 1 ? 'hero-straight' : 'hero-tilt',
        motion,
        screenFit: 'contain',
        screenOffsetFrames: 0,
        background: i === 1 ? '#101827' : '#0b1020',
      })),
      overlays: Array.from({ length: 3 }, (_, i) => ({
        kind: i === 0 ? 'title' : i === 2 ? 'tagline' : 'subtitle',
        text: phrases[i % phrases.length].slice(0, 80),
        startFrame: i * perShot + 18,
        durationFrames: 120,
      })),
      audio: [{ assetId: 'music', volume: 0.22 }],
      projectPolicy: { maxRetries: 2, renderQuality: 'standard', allowPngFallback: true },
    }
    const json = JSON.stringify(storyboard, null, 2)
    setPreview(json)
    setInfo('分镜已生成。可复制下方 JSON 到 work/storyboard.json，再运行 DEMO_WINDOWS.bat 或 npm run agent:render。')
    return json
  }

  const download = () => {
    const value = preview || build()
    const blob = new Blob([value], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'storyboard.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div style={{ display: 'grid', gap: 10, padding: 10, fontSize: 13 }}>
      <p style={{ margin: 0, opacity: 0.75 }}>从产品介绍生成可编辑的 3D 镜头方案。完整版 LLM Director 与无头渲染通过 CLI 执行。</p>
      <label htmlFor="agent-brief" style={{ fontWeight: 650 }}>产品宣传重点</label>
      <textarea id="agent-brief" value={brief} onChange={(event) => setBrief(event.target.value)} rows={3}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 8, padding: 9, background: '#151b2b', border: '1px solid #46506b', color: '#f7f7fb', fontFamily: 'inherit' }} />
      <label htmlFor="agent-device" style={{ fontWeight: 650 }}>真实设备 GLB</label>
      <select id="agent-device" value={deviceId} onChange={(event) => setDeviceId(event.target.value)}
        style={{ width: '100%', padding: 8, background: '#151b2b', color: '#f7f7fb', borderRadius: 8 }}>
        {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <button type="button" onClick={build} style={{ padding: 10, borderRadius: 8, background: '#466bea', color: '#ffffff', border: 0, cursor: 'pointer' }}>
        生成 15 秒 / 3 镜头方案
      </button>
      <button type="button" onClick={download} style={{ padding: 8, borderRadius: 8, border: '1px solid #54627f', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
        下载 Storyboard JSON
      </button>
      {info && <p role="status" style={{ lineHeight: 1.6, color: '#b8d2ff', margin: 0 }}>{info}</p>}
      {preview && <details><summary>查看生成的 Video DSL</summary><pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: 10, maxHeight: 240, overflowY: 'auto' }}>{preview}</pre></details>}
    </div>
  )
}
