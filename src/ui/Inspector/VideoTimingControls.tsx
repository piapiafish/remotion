import { useState } from 'react'
import { useProjectStore } from '../../store/project'
import { clipEnd, deviceClips } from '../../media/screenClips'
import { reportError } from '../../store/feedback'
function TimingNumber({label,value,max,commit}:{label:string;value:number;max?:number;commit:(n:number)=>void}){
  const [draft,setDraft]=useState<string|null>(null)
  const submit=()=>{if(draft!==null){if(!draft.trim()||!Number.isFinite(Number(draft)))reportError('视频时序未修改',new Error('请输入有效数值。'));else if(Number(draft)!==value){const s=useProjectStore.getState();s.beginEditGesture();commit(Number(draft));s.endEditGesture()}}setDraft(null)}
  return <label className="video-timing-field">{label}<input aria-label={label} type="number" min={0} max={max} step=".01" value={draft??Number(value.toFixed(4))} onChange={e=>setDraft(e.target.value)} onBlur={submit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.preventDefault();setDraft(null)}}}/></label>
}
export function VideoTimingControls(){
  const s=useProjectStore(state=>state),d=s.project.devices[s.activeDevice];if(!d)return null
  const clips=deviceClips(d,s.project.duration),clip=clips.find(c=>c.clipId===s.activeClipId)??clips[0]
  if(!clip)return null
  const p=clip.playback,sourceEnd=p.start+(p.out-p.in)/(p.rate??1)
  const update=(patch:Parameters<typeof s.updateScreenClip>[1])=>s.updateScreenClip(clip.clipId,patch)
  return <details className="advanced video-timing" key={clip.clipId}><summary>动画调节 · 屏幕视频</summary><p className="hint">{clip.name} · 两对端点独立调整</p>
    <div className="timing-group blue"><strong>蓝色 · 视频显示时间</strong><div className="video-timing-fields"><TimingNumber label="视频出现时间" value={clip.displayRange.start} commit={start=>update({displayRange:{...clip.displayRange,start}})}/><TimingNumber label="视频消失时间" value={clip.displayRange.end} commit={end=>update({displayRange:{...clip.displayRange,end}})}/></div></div>
    <div className="timing-group orange"><strong>橙色 · 播放与暂停</strong><div className="video-timing-fields"><TimingNumber label="在作品第几秒开始播放" value={p.start} commit={start=>update({playback:{start}})}/><TimingNumber label="在作品第几秒暂停" value={clipEnd(clip)} commit={stop=>update({playback:{stop}})}/></div></div>
    <div className="video-timing-fields"><TimingNumber label="从原视频第几秒开始" value={p.in} max={clip.media.duration} commit={n=>update({playback:{in:n}})}/><TimingNumber label="播放到原视频第几秒" value={p.out} max={clip.media.duration} commit={n=>update({playback:{out:n}})}/><TimingNumber label="播放速度（倍）" value={p.rate??1} max={4} commit={rate=>update({playback:{rate}})}/></div>
    <button className="link-btn" onClick={()=>update({playback:{stop:sourceEnd}})}>匹配素材播放长度</button>
    <p className="hint">显示期间：起播前定格首帧，暂停后保持停止画面。{sourceEnd<clipEnd(clip)-.001?'素材将提前播完，之后保持末帧。':''}</p>
    {p.loop&&<p className="hint">保留旧工程循环；编辑双滑块后改为单次播放，可撤销。</p>}
  </details>
}
