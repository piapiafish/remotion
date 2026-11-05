import { useProjectStore } from '../../store/project'
import type { BackgroundConfig } from '../../store/schema'
import { loadImageAsMediaRef } from '../../media/loadImage'
import { reportError } from '../../store/feedback'

const HDRI_OPTIONS = ['studio', 'city', 'sunset', 'warehouse'] as const

export function BackgroundControls() {
  const background = useProjectStore((s) => s.project.background)
  const setBackground = useProjectStore((s) => s.setBackground)

  function setBackgroundType(type: BackgroundConfig['type']) {
    switch (type) {
      case 'transparent':
        setBackground({ type: 'transparent' })
        break
      case 'solid':
        setBackground({ type: 'solid', color: '#1c1c1f' })
        break
      case 'gradient':
        setBackground({ type: 'gradient', from: '#3a3f52', to: '#0e0f14', angle: 135 })
        break
    }
  }

  return (
    <div className="control-group">
      <div className="preset-grid preset-grid-3">
        {(['transparent', 'solid', 'gradient'] as const).map((t) => (
          <button
            key={t}
            className={background.type === t ? 'preset-btn active' : 'preset-btn'}
            onClick={() => setBackgroundType(t)}
          >
            {{transparent:'透明',solid:'纯色',gradient:'渐变'}[t]}
          </button>
        ))}
      </div>
      <label className="hint">背景图片<input aria-label="背景图片" type="file" accept="image/*" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        const before = useProjectStore.getState().project
        try {
          const ref = await loadImageAsMediaRef(file)
          if (useProjectStore.getState().project === before) setBackground({ type: 'image', ref, fit: background.type === 'image' ? background.fit : 'cover' })
          else { URL.revokeObjectURL(ref.url); reportError('背景未替换', new Error('读取期间工程已修改，请重试。')) }
        } catch (error) { reportError('背景图片导入失败，已保留原背景', error) }
      }} /></label>
      {background.type === 'image' && background.ref.missing && <p role="alert">背景图片缺失，请在上方重新绑定图片或选择其他背景。</p>}
      {background.type === 'solid' && (
        <input
          type="color"
          value={background.color}
          onChange={(e) => setBackground({ type: 'solid', color: e.target.value })}
        />
      )}
      {background.type === 'gradient' && (
        <div className="row">
          <input
            type="color"
            value={background.from}
            onChange={(e) => setBackground({ ...background, from: e.target.value })}
          />
          <input
            type="color"
            value={background.to}
            onChange={(e) => setBackground({ ...background, to: e.target.value })}
          />
          <input
            type="range"
            min={0}
            max={360}
            value={background.angle}
            onChange={(e) => setBackground({ ...background, angle: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  )
}

export function EnvironmentControls() {
  const environment = useProjectStore((s) => s.project.environment)
  const setEnvironment = useProjectStore((s) => s.setEnvironment)

  return (
    <>
      <div className="control-group">
        <label>灯光环境</label>
        <select
          value={environment.hdri}
          onChange={(e) => setEnvironment({ hdri: e.target.value as typeof environment.hdri })}
        >
          {HDRI_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {{studio:'摄影棚',city:'城市',sunset:'日落',warehouse:'仓库'}[h]}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>光线方向</label>
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          value={environment.rotation}
          onChange={(e) => setEnvironment({ rotation: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>光照强度</label>
        <input
          type="range"
          min={0}
          max={3}
          step={0.05}
          value={environment.intensity}
          onChange={(e) => setEnvironment({ intensity: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>阴影浓度</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={environment.shadowOpacity}
          onChange={(e) => setEnvironment({ shadowOpacity: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>阴影柔和度</label>
        <input
          type="range"
          min={0}
          max={24}
          step={0.5}
          value={environment.shadowBlur}
          onChange={(e) => setEnvironment({ shadowBlur: Number(e.target.value) })}
        />
      </div>
    </>
  )
}
