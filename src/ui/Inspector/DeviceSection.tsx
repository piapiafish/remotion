import { useEffect, useRef, useState } from 'react'
import { Smartphone, Info, ChevronDown } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { DEVICE_LIST, getManifest } from '../../devices/manifest'
import type { DeviceId } from '../../store/schema'
import { deviceLabel } from '../../app/labels'

export function DeviceCard() {
  const deviceId = useProjectStore((s) => s.project.devices[s.activeDevice]?.id)
  const setDeviceId = useProjectStore((s) => s.setDeviceId)
  const [picking, setPicking] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const manifest = deviceId ? getManifest(deviceId) : undefined

  // Dismiss on outside click and Escape. A picker that can only be closed by
  // re-clicking the thing that opened it is a trap once it overlaps the
  // controls underneath it.
  useEffect(() => {
    if (!picking) return
    function onDown(e: PointerEvent) {
      if (!cardRef.current?.contains(e.target as Node)) setPicking(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPicking(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [picking])

  if (!manifest) return <p className="hint" role="status">请选择一个手机对象，再调整它的设置。</p>

  return (
    <div className="device-card" ref={cardRef}>
      {/* The whole row opens the picker, not just the thumbnail — a 46px
          icon with no chevron reads as decoration, and the other devices
          become undiscoverable. */}
      <button
        className="device-open"
        onClick={() => setPicking((p) => !p)}
        aria-expanded={picking}
        title="更换手机型号"
      >
        <span className="device-thumb">
          <Smartphone size={26} />
        </span>
        <span className="device-name">
          {deviceLabel(manifest.id,manifest.name)}
          <Info size={12} className="device-info" />
        </span>
        <ChevronDown size={14} className={picking ? 'chevron open' : 'chevron'} />
      </button>


      {picking && (
        <div className="device-list">
          {DEVICE_LIST.map((d) => (
            <button
              key={d.id}
              className={d.id === deviceId ? 'device-option active' : 'device-option'}
              onClick={() => {
                setDeviceId(d.id as DeviceId)
                setPicking(false)
              }}
            >
              <Smartphone size={15} />
              <span>{deviceLabel(d.id,d.name)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { ScreenContent } from './ScreenContent'
