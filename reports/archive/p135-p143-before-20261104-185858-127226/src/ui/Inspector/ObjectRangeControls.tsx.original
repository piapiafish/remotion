import { useProjectStore } from '../../store/project'
import type { ObjectRef } from '../../store/schema'
import { displayRange } from '../../timeline/displayRange'
import { NumberField } from '../controls/NumberField'

export function ObjectRangeControls({target}:{target:ObjectRef}){
  const s=useProjectStore(),item=(target.kind==='device'?s.project.devices:s.project.texts??[]).find(x=>x.instanceId===target.instanceId)
  if(!item)return null
  const range=displayRange(item,s.project.duration),gesture={onGestureStart:s.beginEditGesture,onGestureEnd:s.endEditGesture}
  return <details className="advanced"><summary>对象显示时间</summary><div className="field-grid"><NumberField {...gesture} label="出现时间（秒）" value={range.start} min={0} step={1/s.project.fps} onChange={v=>s.setDisplayRange(target,{...range,start:v})}/><NumberField {...gesture} label="消失时间（秒）" value={range.end} min={range.start+1/s.project.fps} step={1/s.project.fps} onChange={v=>s.setDisplayRange(target,{...range,end:v})}/></div><button className="link-btn" onClick={()=>s.setPlayhead(range.start)}>转到显示开始</button><button className="link-btn" onClick={()=>s.setDisplayRange(target,null)}>恢复整段显示</button><p className="hint">拖时间轴粗条的两端也可设置；区间外停止显示，原动作保留。</p></details>
}
