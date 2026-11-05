import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useProjectStore } from '../../store/project'
import { displayRange } from '../../timeline/displayRange'
import { objectPoses, animationEnabled } from '../../timeline/objectEditing'
import { sameTime, type TrackTarget, type KeySelection } from '../../timeline/editing'
import { deviceClips, clipEnd, packClips, clipMetrics } from '../../media/screenClips'
import type { ScreenClip } from '../../store/schema'
const ownerEqual=(a:TrackTarget,b:TrackTarget)=>a.kind===b.kind&&(a.kind==='camera'||b.kind!=='camera'&&a.instanceId===b.instanceId)
type Drag={pointer:number;x:number;width:number;scroll:number;duration:number;selection:KeySelection|null;moved:boolean;kind:string;range:{start:number;end:number};clip?:ScreenClip;rows:Map<string,number>;count:number}
export function ObjectRow({target,name,focus}:{target:TrackTarget;name:string;focus:()=>void}){
  const s=useProjectStore(),p=s.project,lane=useRef<HTMLDivElement>(null),drag=useRef<Drag|null>(null),[stack,setStack]=useState<number|null>(null)
  const item=target.kind==='device'?p.devices.find(d=>d.instanceId===target.instanceId):target.kind==='text'?p.texts?.find(t=>t.instanceId===target.instanceId):null
  const range=displayRange(item??{},p.duration),device=target.kind==='device'?p.devices.find(d=>d.instanceId===target.instanceId):null,clips=device?deviceClips(device,p.duration):[]
  const [laneWidth,setLaneWidth]=useState(800)
  useEffect(()=>{const el=lane.current;if(!el)return;const observer=new ResizeObserver(()=>setLaneWidth(el.getBoundingClientRect().width));observer.observe(el);setLaneWidth(el.getBoundingClientRect().width);return()=>observer.disconnect()},[])
  const secondsPerPixel=p.duration/Math.max(1,laneWidth)
  const packing=packClips(clips,secondsPerPixel),[frozen,setFrozen]=useState<{rows:Map<string,number>;count:number}|null>(null),rows=frozen?.rows??packing.rows,count=frozen?.count??packing.count
  const heights=Array.from({length:count},()=>72)
  for(const c of clips){const row=rows.get(c.clipId)??0;heights[row]=Math.max(heights[row]??72,clipMetrics(c,secondsPerPixel).height)}
  const tops=heights.map((_,i)=>heights.slice(0,i).reduce((a,b)=>a+b,0))
  const poses=animationEnabled(p,target)?objectPoses(p,target):[],current=s.keySelection
  const choose=()=>s.selectObject(target.kind==='camera'?null:target)
  const seek=(x:number)=>{if(!lane.current)return;const r=lane.current.getBoundingClientRect();s.setPlaying(false);s.setPlayhead((x-r.left)/r.width*p.duration)}
  const finish=(e:PointerEvent<HTMLDivElement>,cancel=false)=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;drag.current=null;setFrozen(null);if(d.moved&&d.kind!=='seek')s.endEditGesture(cancel);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
  useEffect(()=>{const cancel=()=>{const d=drag.current;drag.current=null;setFrozen(null);if(d?.moved&&d.kind!=='seek')useProjectStore.getState().endEditGesture(true)};const key=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape')cancel()};window.addEventListener('blur',cancel);window.addEventListener('keydown',key);return()=>{window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);cancel()}},[])
  const active=s.activeObject?ownerEqual(s.activeObject,target):target.kind==='camera'&&current?.target.kind==='camera'
  const percent=(time:number)=>String(time/p.duration*100)+'%'
  return <div className={'object-track compact-track '+(active?'active':'')} data-testid={'track-'+(target.kind==='camera'?'camera':target.instanceId)} style={{height:clips.length?heights.reduce((a,b)=>a+b,0)+8:54}} onPointerDown={e=>{
    if(e.button!==0||!lane.current||!(e.target as HTMLElement).closest('.object-lane')||(e.target as HTMLElement).closest('.stack-menu,.stack-count,.clip-layer-button'))return
    e.preventDefault();e.stopPropagation();focus()
    const control=(e.target as HTMLElement).closest<HTMLElement>('[data-drag]'),kind=control?.dataset.drag??'seek'
    const pose=kind==='key'?poses.find(k=>k.id===control?.dataset.pose):undefined,selection=pose?{target,channel:'*',t:pose.t,poseId:pose.id}:null
    const clip=clips.find(c=>c.clipId===control?.dataset.clip)
    const rect=lane.current.getBoundingClientRect(),scroll=e.currentTarget.closest('.timeline-scroll')?.scrollLeft??0
    if(selection)s.selectKey(selection);else if(clip&&target.kind==='device')s.selectScreenClip(clip.clipId,target.instanceId);else if(kind!=='seek')choose();else seek(e.clientX)
    setFrozen(packing)
    drag.current={pointer:e.pointerId,x:e.clientX,width:rect.width,scroll,duration:p.duration,selection,moved:false,kind,range,clip,rows:packing.rows,count:packing.count};e.currentTarget.setPointerCapture(e.pointerId)
  }} onPointerMove={e=>{
    const d=drag.current,el=lane.current;if(!d||d.pointer!==e.pointerId||!el||d.width<=0)return
    const scroll=e.currentTarget.closest('.timeline-scroll');if(scroll){const r=scroll.getBoundingClientRect();if(e.clientX>r.right-16)scroll.scrollLeft+=16;else if(e.clientX<r.left+155)scroll.scrollLeft-=16}
    if(d.kind==='seek'){seek(e.clientX);return}
    const dx=e.clientX-d.x+((scroll?.scrollLeft??0)-d.scroll);if(!d.moved&&Math.abs(dx)<4)return
    if(!d.moved){s.beginEditGesture();d.moved=true}
    if(!useProjectStore.getState().editingGesture){drag.current=null;return}
    const dt=Math.round(dx/d.width*d.duration*p.fps)/p.fps,min=1/p.fps
    if(d.selection){s.moveTimelineKey(d.selection,d.selection.t+dt);return}
    if(d.kind.startsWith('range')){let a=d.range.start,b=d.range.end;if(d.kind==='range-start')a=Math.max(0,Math.min(b-min,a+dt));else if(d.kind==='range-end')b=Math.max(a+min,b+dt);else{const delta=Math.max(-a,dt);a+=delta;b+=delta}s.setDisplayRange(target,{start:a,end:b},d.kind==='range'?a-d.range.start:0);return}
    const clip=d.clip;if(!clip||target.kind!=='device')return
    const v=clip.displayRange,start=clip.playback.start,stop=clipEnd(clip)
    if(d.kind==='clip'){const delta=Math.max(-Math.min(v.start,start),dt);s.updateScreenClip(clip.clipId,{displayRange:{start:v.start+delta,end:v.end+delta},playback:{start:start+delta,stop:stop+delta}},target.instanceId)}
    if(d.kind==='clip-in')s.updateScreenClip(clip.clipId,{displayRange:{...v,start:Math.max(0,Math.min(v.end-min,v.start+dt))}},target.instanceId)
    if(d.kind==='clip-out')s.updateScreenClip(clip.clipId,{displayRange:{...v,end:Math.max(v.start+min,v.end+dt)}},target.instanceId)
    if(d.kind==='play-in')s.updateScreenClip(clip.clipId,{playback:{start:Math.max(0,Math.min(stop-min,start+dt))}},target.instanceId)
    if(d.kind==='play-out')s.updateScreenClip(clip.clipId,{playback:{stop:Math.max(start+min,stop+dt)}},target.instanceId)
  }} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e)}>
    <button className="object-track-name" onClick={choose} aria-pressed={!!active} title={name+' · 显示 '+range.start.toFixed(2)+'～'+range.end.toFixed(2)+' 秒'}><strong>{name}</strong><small>{target.kind==='camera'?'镜头运动':clips.length?clips.length+' 段视频':'对象'}</small></button>
    <div className="object-lane" ref={lane}>
      {target.kind!=='camera'&&<div className="object-base-clip" data-drag="range" style={{left:percent(range.start),width:percent(range.end-range.start)}} title="对象存在时间 · 拖左右端点调整，拖底部平移动作"><button data-drag="range-start" aria-label={name+'出现时间'} className="object-range-handle start"/><span className="range-caption">对象 {range.start.toFixed(1)}～{range.end.toFixed(1)} 秒</span><button data-drag="range-end" aria-label={name+'消失时间'} className="object-range-handle end"/></div>}
      {clips.map(clip=>{const row=rows.get(clip.clipId)??0,top=8+tops[row],metrics=clipMetrics(clip,secondsPerPixel),selected=s.activeClipId===clip.clipId&&active;return <div key={clip.clipId} className="video-lane-group" data-testid={'video-'+clip.clipId}>
        <div className={'video-display-clip '+(selected?'selected':'')} data-drag="clip" data-clip={clip.clipId} style={{top,left:percent(clip.displayRange.start),width:percent(clip.displayRange.end-clip.displayRange.start)}} title={clip.name+' · 蓝色：显示区间 · 拖动主体平移全部视频时间'}>
          <button style={{top:0}} className="video-display-handle start" data-drag="clip-in" data-clip={clip.clipId} title={'视频出现 · '+clip.displayRange.start.toFixed(3)+' 秒'} aria-label={clip.name+'视频出现时间'}/>
          <span>{clip.name} · {clip.playback.rate??1}×</span>
          <button style={{top:metrics.blueNear?24:0}} className={'video-display-handle end'+(metrics.blueNear?' separated':'')} data-drag="clip-out" data-clip={clip.clipId} title={'视频消失 · '+clip.displayRange.end.toFixed(3)+' 秒'} aria-label={clip.name+'视频消失时间'}/>
        </div>
        <div className="video-play-span" style={{top:top+metrics.playTop+10,left:percent(clip.playback.start),width:percent(clipEnd(clip)-clip.playback.start)}}><button className="video-play-handle start" data-drag="play-in" data-clip={clip.clipId} aria-label={clip.name+'视频开始播放'} title={'开始播放 · '+clip.playback.start.toFixed(3)+' 秒'}>▶</button><button style={{top:metrics.playNear?14:-10}} className={'video-play-handle end'+(metrics.playNear?' separated':'')} data-drag="play-out" data-clip={clip.clipId} aria-label={clip.name+'视频暂停时间'} title={'暂停 · '+clipEnd(clip).toFixed(3)+' 秒'}>Ⅱ</button></div>
      </div>})}
      {poses.map(pose=><button key={pose.id} data-drag="key" data-pose={pose.id} className={'pose-key '+(current&&ownerEqual(current.target,target)&&(current.poseId?current.poseId===pose.id:sameTime(current.t,pose.t))?'selected ':'')+(pose.t<range.start||pose.t>=range.end?'outside-range':'')} style={{left:percent(pose.t)}} aria-label={name+'关键帧 '+Number(pose.t.toFixed(3))+'秒'} title={pose.t.toFixed(3)+' 秒'+(pose.initial?' · 首关键帧':'')+' · 优先拖动关键帧，上下键微调'}><i/></button>)}
      {[...new Set(poses.map(k=>k.t))].map(time=>{const group=poses.filter(k=>sameTime(k.t,time));return group.length>1?<button key={time} className="stack-count" style={{left:percent(time)}} aria-label={name+' '+time+'秒叠放'+group.length+'个关键帧'} onClick={()=>setStack(stack===time?null:time)}>{group.length}</button>:null})}
      {stack!==null&&<div className="stack-menu" role="group" aria-label="叠放关键帧" style={{left:percent(Math.min(stack,p.duration*.75))}}>{poses.filter(k=>sameTime(k.t,stack)).reverse().map((pose,i)=><button key={pose.id} onClick={()=>{s.selectKey({target,channel:'*',t:pose.t,poseId:pose.id});setStack(null);focus()}}>{i===0?'上层 · 有效':'下层 · 保留'}{pose.initial?' · 首键':''}</button>)}<button onClick={()=>setStack(null)}>收起</button></div>}

    </div>
  </div>
}
