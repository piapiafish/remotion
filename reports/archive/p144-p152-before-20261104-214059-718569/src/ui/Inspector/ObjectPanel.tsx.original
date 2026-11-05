import { TextSettings } from './TextSettings'
import { ObjectRangeControls } from './ObjectRangeControls'
import { Copy, Settings2, Smartphone, Trash2, Type } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { getManifest } from '../../devices/manifest'
import { deviceLabel } from '../../app/labels'
import { DeviceCard, ScreenContent } from './DeviceSection'
import { TransformSection } from './TransformSection'
import type { ObjectRef } from '../../store/schema'

export function ObjectPanel() {
  const s = useProjectStore(), p = s.project, ref = s.activeObject
  const text = ref?.kind === 'text' ? p.texts?.find(t => t.instanceId === ref.instanceId) : null
  const device = ref?.kind === 'device' ? p.devices.find(d => d.instanceId === ref.instanceId) : null
  const objects = [
    ...p.devices.map((d,i) => ({ ref: { kind: 'device', instanceId: d.instanceId } as ObjectRef, name: d.name || `手机 ${i+1}`, detail: deviceLabel(d.id,getManifest(d.id).name), thumb: d.screen?.kind === 'image' ? d.screen.url : null })),
    ...(p.texts ?? []).map(t => ({ ref: { kind: 'text', instanceId: t.instanceId } as ObjectRef, name: t.name, detail: (t.textKind==='solid'?'实体 · ':'贴纸 · ')+(t.content || '空白文字'), thumb: null })),
  ]
  return <div className="object-panel">
    <div className="object-add"><button className="ghost-btn" onClick={s.addDevice}><Smartphone size={15}/>添加手机</button><button className="ghost-btn" onClick={()=>s.addText()}><Type size={15}/>添加文字</button><button className="ghost-btn" onClick={()=>s.addText('solid')}><Type size={15}/>添加实体文字</button></div>
    <div className="object-list" aria-label="对象列表">
      {objects.map(obj => <button key={obj.ref.instanceId} data-testid={`object-${obj.ref.instanceId}`} className={`object-card ${ref?.instanceId === obj.ref.instanceId ? 'active' : ''}`} onClick={() => s.selectObject(obj.ref)} aria-pressed={ref?.instanceId === obj.ref.instanceId}>
        <span className="object-avatar">{obj.thumb ? <img src={obj.thumb} alt=""/> : obj.ref.kind === 'device' ? <Smartphone size={23}/> : <Type size={23}/>}</span><span><strong>{obj.name}</strong><small>{obj.detail}</small></span><Settings2 size={15}/>
      </button>)}
      {!objects.length && <p className="empty-state">画面里还没有对象。添加手机或文字开始制作。</p>}
    </div>
    {ref && (device || text) ? <div className="object-settings" data-testid="object-settings">
      <div className="field-header"><strong>{device ? '手机设置' : '文字设置'}</strong><div className="row"><button className="icon-btn" title="复制对象" aria-label="复制对象" onClick={() => s.duplicateObject(ref)}><Copy size={15}/></button><button className="icon-btn" title="删除对象" aria-label="删除对象" onClick={() => s.removeObject(ref)}><Trash2 size={15}/></button><button className="link-btn" onClick={() => s.selectObject(null)}>收起</button></div></div>
      <label className="stack-field">对象名称<input aria-label="对象名称" value={device?.name ?? text?.name ?? ''} placeholder={device ? `手机 ${s.activeDevice+1}` : '标题'} onChange={e => s.renameObject(e.target.value)}/></label>
      {device && <><DeviceCard/><ScreenContent/><details className="advanced"><summary>位置与旋转精调</summary><TransformSection/></details></>}
      <ObjectRangeControls target={ref}/>
      {text && <TextSettings text={text}/>}
    </div> : <p className="hint">点击手机或文字卡片打开设置。点击画布空白可调整相机。</p>}
  </div>
}
