import { useRef, useState, type DragEvent } from 'react'
import { Check, Film, Plus } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { getManifest } from '../../devices/manifest'
import { ACCEPTED_SCREEN_TYPES, loadScreenMedia } from '../../media/loadMedia'
import { reportError } from '../../store/feedback'
import { deviceClips } from '../../media/screenClips'
import { VideoTimingControls } from './VideoTimingControls'
import { Segmented } from '../controls/Segmented'
import type { ScreenFit } from '../../store/schema'
import { finishLabels } from '../../app/labels'

export function ScreenContent(){
  const s=useProjectStore(state=>state),d=s.project.devices[s.activeDevice]
  const input=useRef<HTMLInputElement>(null),replaceInput=useRef<HTMLInputElement>(null),replaceId=useRef<string|null>(null),uploads=useRef(new Map<string,symbol>())
  const [loading,setLoading]=useState(false),[over,setOver]=useState(false)
  if(!d)return null
  const clips=deviceClips(d,s.project.duration),selected=clips.find(c=>c.clipId===s.activeClipId)??clips[0],base=d.screen?.kind==='image'?d.screen:null
  const colors=getManifest(d.id).colorways
  async function accept(file:File|undefined,target:string|null=null){
    if(!file||!d)return
    const id=d.instanceId,epoch=s.documentEpoch,token=Symbol();uploads.current.set(id,token);setLoading(true)
    try{
      const media=await loadScreenMedia(file),current=useProjectStore.getState(),owner=current.project.devices.find(d=>d.instanceId===id)
      if(!media)return
      if(uploads.current.get(id)!==token||current.documentEpoch!==epoch||!owner||(target&&!deviceClips(owner,current.project.duration).some(c=>c.clipId===target))){URL.revokeObjectURL(media.url);return}
      if(target){if(media.kind==='video')current.replaceScreenClip(target,media,file.name,id);else{URL.revokeObjectURL(media.url);throw new Error('请选择视频文件来替换该片段。')}}
      else if(media.kind==='video')current.addScreenClip(media,file.name,id)
      else current.setScreenMedia(media,id)
    }catch(error){reportError('导入素材失败，已保留当前内容',error)}finally{setLoading(false)}
  }
  function drop(e:DragEvent<HTMLDivElement>){e.preventDefault();setOver(false);void accept(e.dataTransfer.files[0])}
  return <>
    <div className="control-group">
      <div className="field-header"><label>屏幕内容</label><button className="link-btn" onClick={()=>input.current?.click()}><Plus size={13}/>添加视频</button></div>
      <div className={'dropzone compact-dropzone '+(over?'drag-over':'')} onClick={()=>input.current?.click()} onDrop={drop} onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)}>
        {loading?<span role="status">正在读取素材…</span>:base?<img src={base.url} className="dropzone-preview" alt="静态屏幕内容"/>:<span>点击或拖入图片 / 视频<br/><small>视频可叠加，图片作为静态屏幕</small></span>}
      </div>
      <input ref={input} aria-label="添加屏幕素材文件" type="file" accept={ACCEPTED_SCREEN_TYPES} hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';void accept(f)}}/>
      <input ref={replaceInput} aria-label="替换视频文件" type="file" accept="video/mp4,video/webm" hidden onChange={e=>{const f=e.target.files?.[0],id=replaceId.current;e.target.value='';void accept(f,id)}}/>
      {base&&<button className="link-btn" onClick={()=>s.setScreenMedia(null)}>移除静态屏幕图片</button>}
      <div className="screen-clip-list" aria-label="屏幕视频列表">{clips.map((clip,i)=><div key={clip.clipId} className={'screen-clip-card '+(selected?.clipId===clip.clipId?'selected':'')}>
        <button className="screen-clip-select" onClick={()=>s.selectScreenClip(clip.clipId,d.instanceId)} aria-pressed={selected?.clipId===clip.clipId}><Film size={18}/><span><strong>{clip.name}</strong><small>{clip.media.missing?'素材缺失，请重新绑定':clip.displayRange.start.toFixed(2)+'～'+clip.displayRange.end.toFixed(2)+' 秒显示'}</small></span></button>
        <div className="screen-clip-actions"><button className="link-btn" aria-label={'上移视频 '+clip.name} disabled={i===0} onClick={()=>s.moveScreenClip(clip.clipId,-1)}>↑ 上移视频</button><button className="link-btn" aria-label={'下移视频 '+clip.name} disabled={i===clips.length-1} onClick={()=>s.moveScreenClip(clip.clipId,1)}>↓ 下移</button><button className="link-btn" onClick={()=>{replaceId.current=clip.clipId;replaceInput.current?.click()}}>{clip.media.missing?'重新绑定':'替换'}</button><button className="link-btn" aria-label={'移除视频 '+clip.name} onClick={()=>s.removeScreenClip(clip.clipId)}>移除</button></div>
      </div>)}</div>
      {!clips.length&&<p className="hint">添加的视频会显示在同一对象的时间条上。</p>}
    </div>
    <VideoTimingControls/>
    <div className="control-group"><label>{selected?'当前视频填充':'静态内容填充'}</label><Segmented<ScreenFit> value={selected?.fit??d.screenFit} onChange={fit=>selected?s.updateScreenClip(selected.clipId,{fit}):s.setScreenFit(fit)} options={[{id:'contain',label:'完整显示'},{id:'cover',label:'填满裁切'}]}/></div>
    <div className="control-group"><label id="device-finish-label">设备颜色</label><div className="finish-list" role="radiogroup" aria-labelledby="device-finish-label">{colors.map(c=><label key={c.id} className={'finish-option '+(c.id===d.colorway?'active':'')}><input className="finish-radio" type="radio" name="device-finish" value={c.id} checked={c.id===d.colorway} onChange={()=>s.setColorway(c.id)}/><span className="finish-swatch" style={{background:c.swatch}} aria-hidden="true"/><span className="finish-name">{finishLabels[c.id]??c.name}</span><Check className="finish-check" size={14} aria-hidden="true"/></label>)}</div></div>
  </>
}
