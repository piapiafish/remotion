import { cameraSegments } from '../../timeline/cameraSegments'
import { CameraRow } from './CameraRow'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Play, Pause, Plus } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { targetTracks, type TrackTarget } from '../../timeline/editing'
import { objectPoses, poseMatches } from '../../timeline/objectEditing'
import { ObjectRow } from './TimelineObjectRow'
import { NAMED_EASINGS } from '../../timeline/easing'
import { easeLabels, motionLabels } from '../../app/labels'
import { MOTION_PRESETS, type MotionPresetId } from '../../timeline/presets'

export function TimelineBar(){
  const s=useProjectStore(),p=s.project,[zoom,setZoom]=useState(1),root=useRef<HTMLElement>(null)
  const rows:{target:TrackTarget;name:string}[]=[...p.devices.map((d,i)=>({target:{kind:'device' as const,instanceId:d.instanceId},name:d.name||`手机 ${i+1}`})),...(p.texts??[]).map(t=>({target:{kind:'text' as const,instanceId:t.instanceId},name:t.name}))]
  const segments=cameraSegments(p.camera),segment=segments.find(c=>c.id===s.selectedCameraSegmentId)
  const target:TrackTarget=s.activeObject??{kind:'camera'},selection=s.keySelection?.target.kind==='camera'?null:s.keySelection,tracks=selection?targetTracks(p,selection.target):undefined
  const first=Object.values(tracks??{}).flatMap(t=>t.keys).find(k=>!!selection&&poseMatches(k,selection.t,selection.poseId))
  const ease=Object.values(tracks??{}).some(t=>t.interpolation==='continuous')?'continuous':Object.entries(NAMED_EASINGS).find(([,v])=>v.every((n,i)=>n===first?.ease[i]))?.[0]??'linear'
  const focus=()=>root.current?.focus({preventScroll:true})
  const navigate=(direction:number)=>{if(!s.activeObject)return;const poses=objectPoses(p,target),current=poses.findIndex(k=>selection?.poseId===k.id);const next=current>=0?poses[current+direction]:direction>0?poses.find(k=>k.t>s.playhead+1e-6):[...poses].reverse().find(k=>k.t<s.playhead-1e-6);if(next)s.selectKey({target,channel:'*',t:next.t,poseId:next.id});focus()}
  function keyboard(e:KeyboardEvent<HTMLElement>){
    if(/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)||e.nativeEvent.isComposing)return
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();if(segment)s.removeCameraSegment(segment.id);else s.deleteTimelineKey();return}
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return
    e.preventDefault();e.stopPropagation();const step=(e.key==='ArrowDown'||e.key==='ArrowLeft'?-1:1)*(e.shiftKey?10:1)/p.fps
    if(selection){if(!s.editingGesture)s.beginEditGesture();s.moveTimelineKey(selection,selection.t+step)}else s.setPlayhead(s.playhead+step)
  }
  useEffect(()=>{const end=()=>{if(root.current?.contains(document.activeElement)||document.activeElement===root.current)useProjectStore.getState().endEditGesture()};window.addEventListener('keyup',end);window.addEventListener('blur',end);return()=>{window.removeEventListener('keyup',end);window.removeEventListener('blur',end)}},[])
  return <section ref={root} tabIndex={0} className="object-timeline" data-testid="object-timeline" aria-label="对象时间轴，上下键微调所选关键帧" onKeyDown={keyboard}>
    <div className="timeline-mainbar"><button className="icon-btn" aria-label={s.playing?'暂停':'播放'} onClick={()=>s.setPlaying(!s.playing)}>{s.playing?<Pause size={16}/>:<Play size={16}/>}</button><label><input aria-label="当前时间" type="number" min={0} max={p.duration} step={1/p.fps} value={Number(s.playhead.toFixed(3))} onChange={e=>{s.setPlaying(false);s.setPlayhead(Number(e.target.value))}}/> / <input aria-label="总时长" type="number" min={.1} step={.5} value={p.duration} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=.1)s.setDuration(n)}}/> 秒</label><span className="spacer"/><button disabled={!s.activeObject} className="ghost-btn" title="选择同一对象的上一个关键帧" onClick={()=>navigate(-1)}>上一个关键帧</button><button disabled={!s.activeObject} className="ghost-btn" title="选择同一对象的下一个关键帧" onClick={()=>navigate(1)}>下一个关键帧</button><button className="primary-btn" onClick={()=>s.activeObject?s.addObjectKey(target):s.setEditorPage('camera')}><Plus size={14}/>{s.activeObject?'添加关键帧':'录制相机运动'}</button></div>
    <div className="timeline-legend"><span><i className="legend-object"/>对象存在</span><span><i className="legend-video"/>视频显示</span><span><i className="legend-play"/>播放 / 暂停</span><span><i className="legend-camera"/>相机运动</span><small>菱形：对象关键帧</small></div>
    <div className="timeline-scroll"><div className="timeline-sheet" style={{minWidth:Math.max(520,zoom*650)}}><TimeRuler duration={p.duration} zoom={zoom}/>{rows.map(row=><ObjectRow key={row.target.kind==='camera'?'camera':row.target.instanceId} {...row} focus={focus}/>)}<CameraRow/><TimelinePlayhead/></div></div>
    <div className="timeline-footer">{segment?<><span className="camera-segment-summary">{segment.name} · {segment.start.toFixed(2)}～{segment.end.toFixed(2)} 秒</span><button className="ghost-btn" onClick={()=>s.selectCameraSegment(segment.id)}>定位到开始</button><button className="ghost-btn" onClick={()=>{s.selectCameraSegment(segment.id);s.setPlaying(true)}}>回放此段</button><button className="ghost-btn" onClick={()=>s.startCameraRecording(segment.id)}>重新录制此段</button><button className="danger-btn" onClick={()=>s.removeCameraSegment(segment.id)}>删除本段</button></>:selection?<><span>{selection.t.toFixed(3)} 秒 · 姿态关键帧</span><CommitNumber label="关键帧时间" value={selection.t} step={1/p.fps} onCommit={v=>{s.beginEditGesture();s.moveTimelineKey(selection,v);s.endEditGesture()}}/><select aria-label="关键帧过渡" value={ease} onChange={e=>{if(e.target.value==='continuous')s.setKeyContinuous();else s.setTimelineKeyEase(NAMED_EASINGS[e.target.value as keyof typeof NAMED_EASINGS])}}>{Object.entries(easeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><button className="danger-btn" disabled={!!objectPoses(p,selection.target).find(k=>k.id===selection.poseId)?.initial} title="删除所选姿态，初始关键帧保留" onClick={s.deleteTimelineKey}>删除关键帧</button><KeyProperties/></>:<span className="hint">拖底条两端调整对象出入场；视频蓝色与橙色端点分别调整。</span>}<span className="spacer"/>{s.activeObject?.kind==='device'&&<select aria-label="添加动作预设" value="" onChange={e=>s.setMotionPreset(e.target.value as MotionPresetId)}><option value="">添加动作…</option>{MOTION_PRESETS.filter(m=>m.id!=='orbit').map(m=><option key={m.id} value={m.id}>{motionLabels[m.id]??m.label}</option>)}</select>}<button className="ghost-btn" aria-label="缩小时间轴" onClick={()=>setZoom(Math.max(1,zoom/1.4))}>− 缩小时间轴</button><button className="ghost-btn" aria-label="放大时间轴" onClick={()=>setZoom(Math.min(12,zoom*1.4))}>＋ 放大时间轴</button></div>
  </section>
}
function TimelinePlayhead(){
  const playhead=useProjectStore(s=>s.playhead),duration=useProjectStore(s=>s.project.duration),active=useRef<number|null>(null)
  const seek=(e:React.PointerEvent<HTMLButtonElement>)=>{e.currentTarget.closest<HTMLElement>('.object-timeline')?.focus({preventScroll:true});const r=e.currentTarget.parentElement!.getBoundingClientRect();useProjectStore.getState().setPlaying(false);useProjectStore.getState().setPlayhead((e.clientX-r.left)/r.width*duration)}
  return <div className="timeline-overlay"><div className="timeline-global-line" style={{left:`${playhead/duration*100}%`}}/><button className="playhead-handle" style={{left:`${playhead/duration*100}%`}} aria-label="拖动播放头" onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);seek(e)}} onPointerMove={e=>{if(active.current===e.pointerId)seek(e)}} onPointerUp={()=>{active.current=null}} onLostPointerCapture={()=>{active.current=null}} onPointerCancel={()=>{active.current=null}}/></div>
}
function seekAt(el:HTMLElement,x:number){el.closest<HTMLElement>('.object-timeline')?.focus({preventScroll:true});const s=useProjectStore.getState(),r=el.getBoundingClientRect();if(r.width){s.setPlaying(false);s.setPlayhead((x-r.left)/r.width*s.project.duration)}}
function TimeRuler({duration,zoom}:{duration:number;zoom:number}){
  const active=useRef<number|null>(null),raw=duration/(10*zoom),base=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].map(n=>n*base).find(n=>n>=raw)??base*10
  const ticks=Array.from({length:Math.floor(duration/step)+1},(_,i)=>i*step);if(ticks[ticks.length-1]<duration-1e-6)ticks.push(duration)
  useEffect(()=>{const end=()=>{active.current=null};window.addEventListener('blur',end);return()=>window.removeEventListener('blur',end)},[])
  return <div className="time-ruler-wrap"><span>对象</span><div className="time-ruler" aria-label="拖动时间尺" onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);seekAt(e.currentTarget,e.clientX)}} onPointerMove={e=>{if(active.current===e.pointerId)seekAt(e.currentTarget,e.clientX)}} onPointerUp={()=>{active.current=null}} onPointerCancel={()=>{active.current=null}} onLostPointerCapture={()=>{active.current=null}}>{ticks.map(t=><small key={t} style={{left:`${t/duration*100}%`}}>{Number(t.toFixed(3))}</small>)}</div></div>
}
function KeyProperties(){
  const s=useProjectStore(),selection=s.keySelection;if(!selection)return null
  const target=selection.target,tracks=targetTracks(s.project,target)??{},text=target.kind==='text'?s.project.texts?.find(t=>t.instanceId===target.instanceId):null
  const names:Record<string,string>={'position.x':'水平位置','position.y':'垂直位置','position.z':'纵深位置','rotation.x':'俯仰角','rotation.y':'偏航角','rotation.z':'倾斜角','target.x':'观察点 X','target.y':'观察点 Y','target.z':'观察点 Z',scale:'缩放',opacity:'透明度',depth:'厚度',fov:'镜头视角'}
  return <details className="key-properties"><summary>关键帧属性</summary><div role="group" aria-label="关键帧属性"><header><strong>姿态属性 · {selection.t.toFixed(2)} 秒</strong><button className="ghost-btn" aria-label="关闭关键帧属性" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>关闭</button></header>{Object.entries(tracks).map(([channel,track])=>{const key=track.keys.find(k=>poseMatches(k,selection.t,selection.poseId));if(!key)return null;const factor=channel.startsWith('rotation.')?180/Math.PI:channel==='opacity'||text&&text.textKind!=='solid'&&channel.startsWith('position.')?100:1;return <label key={channel}>{names[channel]??channel}<CommitNumber label={`关键帧${names[channel]??channel}`} value={key.v*factor} onCommit={v=>s.setTimelineKeyValue(v/factor,channel)}/></label>})}</div></details>
}
function CommitNumber({value,label,onCommit,step=1}:{value:number;label:string;onCommit:(value:number)=>void;step?:number}){
  const [draft,setDraft]=useState(String(value)),focused=useRef(false),cancelled=useRef(false)
  useEffect(()=>{if(!focused.current)setDraft(String(Number(value.toFixed(4))))},[value])
  return <input aria-label={label} type="number" step={step} value={draft} onFocus={()=>{focused.current=true;cancelled.current=false}} onChange={e=>setDraft(e.target.value)} onBlur={()=>{focused.current=false;const n=Number(draft);if(!cancelled.current&&draft.trim()&&Number.isFinite(n)&&Math.abs(n-value)>1e-8)onCommit(n);else setDraft(String(value))}} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();const n=(Number(draft)||0)+(e.key==='ArrowUp'?1:-1)*step*(e.shiftKey?10:1);setDraft(String(n));onCommit(n)}if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelled.current=true;setDraft(String(value));focused.current=false;e.currentTarget.blur()}}}/>
}
