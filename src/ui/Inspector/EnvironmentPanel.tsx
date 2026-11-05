import { focusReference } from '../../scene/depthOfField'
import { useSolidBoundsRevision } from '../../scene/solidBounds'
import { useProjectStore } from '../../store/project'
import { defaultEffects } from '../../store/schema'
import { BackgroundControls, EnvironmentControls } from './Inspector'
import { NumberField } from '../controls/NumberField'

export function EnvironmentPanel() {
  useSolidBoundsRevision(s=>s.revision)
  const p = useProjectStore(s=>s.project), set = useProjectStore(s=>s.setEffects), fx = p.effects ?? defaultEffects()
  const focus=focusReference(p),value=focus?focus.kind+':'+focus.instanceId:''
  const focusable=[...p.devices.map((d,i)=>({kind:'device' as const,id:d.instanceId,name:d.name||'手机 '+(i+1)})),...(p.texts??[]).filter(t=>t.textKind==='solid').map(t=>({kind:'text' as const,id:t.instanceId,name:t.name}))]
  const missingFocus=!!focus&&!focusable.some(o=>o.id===focus.instanceId&&o.kind===focus.kind)
  return <div className="environment-panel" onPointerDownCapture={e=>{if((e.target as HTMLInputElement).type==='range')useProjectStore.getState().beginEditGesture()}} onPointerUpCapture={()=>{if(useProjectStore.getState().editingGesture)useProjectStore.getState().endEditGesture()}} onPointerCancelCapture={()=>useProjectStore.getState().endEditGesture(true)}>
    <details open className="environment-group"><summary>背景</summary><BackgroundControls/></details>
    <details className="environment-group"><summary>灯光与阴影</summary><EnvironmentControls/></details>
    <details open className="environment-group"><summary>画面效果</summary>
      <label className="toggle-row"><input type="checkbox" checked={fx.depthOfField.enabled} onChange={e=>set({...fx,depthOfField:{...fx.depthOfField,enabled:e.target.checked}})}/>景深</label>
      {fx.depthOfField.enabled && <div className="control-group"><label className="stack-field">对焦对象<select aria-label="对焦对象" value={value} onChange={e=>{const [kind,...id]=e.target.value.split(':');set({...fx,depthOfField:{...fx.depthOfField,focusDevice:null,focusObject:e.target.value?{kind:kind as 'device'|'text',instanceId:id.join(':')}:null}})}}><option value="">固定焦点距离</option>{missingFocus&&<option value={value}>目标已移除 · 使用固定距离</option>}{focusable.map(o=><option key={o.id} value={o.kind+':'+o.id}>{o.kind==='text'?'实体文字 · ':'手机 · '}{o.name}</option>)}</select></label><label className="stack-field">模糊强度<input aria-label="景深强度" type="range" min={0} max={1} step={.01} value={fx.depthOfField.strength} onChange={e=>set({...fx,depthOfField:{...fx.depthOfField,strength:Number(e.target.value)}})}/></label>{(!focus||missingFocus) && <NumberField onGestureStart={useProjectStore.getState().beginEditGesture} onGestureEnd={useProjectStore.getState().endEditGesture} label="焦点距离" value={fx.depthOfField.distance} min={.1} max={100} step={.05} onChange={v=>set({...fx,depthOfField:{...fx.depthOfField,distance:v}})}/>}<p className="hint">对焦对象清晰，前后景逐渐模糊。实体文字可对焦；贴纸是否受景深影响在各自设置中调整。</p></div>}
      <label className="toggle-row"><input type="checkbox" checked={fx.motionBlur.enabled} onChange={e=>set({...fx,motionBlur:{...fx.motionBlur,enabled:e.target.checked}})}/>动态模糊</label>
      {fx.motionBlur.enabled && <div className="control-group"><label className="stack-field">拖影强度<input aria-label="动态模糊强度" type="range" min={0} max={1} step={.01} value={fx.motionBlur.strength} onChange={e=>set({...fx,motionBlur:{...fx.motionBlur,strength:Number(e.target.value)}})}/></label><label className="stack-field">效果质量<select aria-label="动态模糊质量" value={fx.motionBlur.samples} onChange={e=>set({...fx,motionBlur:{...fx.motionBlur,samples:Number(e.target.value) as 2|4|8}})}><option value={2}>轻量 · 2 次采样</option><option value={4}>均衡 · 4 次采样</option><option value={8}>细腻 · 8 次采样</option></select></label><p className="hint">运动时形成拖影，静止时保持清晰。效果质量越高，预览和导出所需时间越长。</p></div>}
    </details>
  </div>
}
