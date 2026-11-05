import { recordingWindow } from '../../timeline/cameraSegments'
import { getExportContext } from '../../export/renderer'
import { waitForSceneReady } from '../../export/sceneReady'
import { prepareScreenVideos, waitForScreenVideosReady } from '../../media/screenVideo'
import { waitForTitleFonts } from '../../scene/textOverlay'
import { reportError } from '../../store/feedback'
import { useEffect, useState } from 'react'
import { Artboard } from '../Artboard/Artboard'
import { useProjectStore } from '../../store/project'
import { captureCameraPose, useCameraSession } from '../../store/cameraSession'
import { sampleTimeline } from '../../timeline/sample'
import type { CameraSpeed } from '../../scene/cameraMotion'
import { ArrowLeft, Circle, Clapperboard, Check, Play, RotateCcw, Square } from 'lucide-react'
const names={ready:'准备镜头',countdown:'即将开始',recording:'正在录制',review:'检查本次镜头',idle:'准备'}
export function CameraRecorder(){
  const s=useProjectStore(),session=useCameraSession(),[count,setCount]=useState(3),[prepared,setPrepared]=useState(false)
  useEffect(()=>{const controller=new AbortController();void(async()=>{try{const start=performance.now();let ctx=getExportContext();while(!ctx?.renderer.domElement.closest('.recorder-preview')){controller.signal.throwIfAborted();if(performance.now()-start>15000)throw Error('画面仍在加载，请稍后重新进入。');await new Promise(r=>setTimeout(r,30));ctx=getExportContext()}const state=useProjectStore.getState();ctx.applyAt(state.playhead);await waitForSceneReady(ctx.scene,state.project,15000,controller.signal,state.playhead);prepareScreenVideos(state.playhead);if(!await waitForScreenVideosReady(15000,state.playhead,controller.signal))throw Error('屏幕视频尚未就绪。');await waitForTitleFonts(state.project,controller.signal);setPrepared(true)}catch(error){if(!controller.signal.aborted)reportError('相机画面准备失败',error)}})();return()=>controller.abort()},[])
  useEffect(()=>{if(session.mode!=='countdown')return;const id=setInterval(()=>setCount(n=>Math.max(0,n-1)),1000);return()=>clearInterval(id)},[session.mode])
  useEffect(()=>{if(session.mode==='countdown'&&count===0){const state=useProjectStore.getState(),rec=useCameraSession.getState();state.setPlayhead(rec.start);useCameraSession.setState({mode:'recording',draft:{},frame:-1,end:rec.start});captureCameraPose(rec.view??sampleTimeline(state.project,rec.start).camera,rec.start,state.project.fps);state.setPlaying(true)}},[count,session.mode])
  const finish=()=>{s.setPlaying(false);const rec=useCameraSession.getState();if(rec.mode==='recording')captureCameraPose(rec.view??sampleTimeline(s.project,s.playhead).camera,s.playhead,s.project.fps);useCameraSession.setState({mode:'review',view:null});s.setPlayhead(rec.start)}
  useEffect(()=>{const blur=()=>{if(useCameraSession.getState().mode==='recording'){useProjectStore.getState().setPlaying(false);useCameraSession.setState({mode:'review',view:null})}else if(useCameraSession.getState().mode==='countdown')useCameraSession.setState({mode:'ready'})};window.addEventListener('blur',blur);return()=>window.removeEventListener('blur',blur)},[])
  const again=()=>{s.setPlaying(false);s.setPlayhead(session.start);useCameraSession.setState({mode:'ready',view:sampleTimeline(s.project,session.start).camera,draft:{},frame:-1})}
  const base=sampleTimeline(s.project,session.start).camera,first=Object.fromEntries(Object.entries(session.draft).map(([c,t])=>[c,t.keys[0]?.v])),jump=session.mode==='review'&&base.position.some((v,i)=>Math.abs(v-(first['position.'+'xyz'[i]]??v))>.001)
  return <div className="camera-record-page">
    <header className="camera-record-header"><div className="recorder-title"><Clapperboard size={21}/><div><h2>录制相机运动</h2><small>一段一个动作，自由组合你的镜头</small></div></div><button className="ghost-btn" onClick={()=>s.setEditorPage('editor')}><ArrowLeft size={15}/>放弃并返回编辑器</button></header>
    <div className="camera-record-body"><div className="recorder-preview"><Artboard/>{session.mode==='countdown'&&<div className="recorder-countdown-overlay" role="status"><span>准备开始</span><strong>{count}</strong><small>手机与文字将随作品正常播放</small></div>}</div>
      <aside className="camera-record-panel">
        <div className={'recorder-status-card '+session.mode}><span className="recorder-status-tag"><i/>{session.mode==='ready'&&!prepared?'正在准备画面':names[session.mode]}</span><strong className="recorder-clock">{(session.mode==='recording'?Math.max(0,s.playhead-session.start):Math.max(0,session.end-session.start)).toFixed(2)}<small>秒</small></strong><p>{session.mode==='review'?'回放检查后，采用这次镜头。':'画面对象已锁定，专注控制相机。'}</p><div className="recorder-progress"><i style={{width:Math.min(100,s.playhead/s.project.duration*100)+'%'}}/></div><small>作品位置 {s.playhead.toFixed(2)} / {s.project.duration.toFixed(2)} 秒</small></div>
        <div className="recorder-settings"><div className="recording-window"><strong>{session.replaceId?'重新录制选中段':'本次可录区间'}</strong><span>{session.start.toFixed(2)} ～ {Math.min(s.project.duration,session.limit).toFixed(2)} 秒</span><small>到达区间末尾自动结束，与其他相机段保持独立。</small></div>{jump&&<p className="recorder-jump-note">本段起点与前段镜头不同，衔接时会跳切。可重新录制，让镜头从原视角开始。</p>}{session.mode==='ready'&&<label className="stack-field">从作品第几秒开始<input aria-label="相机录制开始时间" disabled={!!session.replaceId} type="number" min={0} max={Math.max(0,s.project.duration-1/s.project.fps)} step={1/s.project.fps} value={session.start} onChange={e=>{const start=Math.max(0,Math.min(s.project.duration-1/s.project.fps,Number(e.target.value)));if(Number.isFinite(start)){const window=recordingWindow(s.project.camera,start,s.project.duration);if(window&&window.end-window.start>=1/s.project.fps-1e-8){useCameraSession.setState({start,end:start,limit:window.end,view:sampleTimeline(s.project,start).camera});s.setPlayhead(start)}else reportError('此处不能开始录制',new Error('请选空白时间，或返回选中一段重新录制。'))}}}/></label>}<label className="stack-field">相机移动速度<select aria-label="相机移动速度" value={session.speed} onChange={e=>{useCameraSession.setState({speed:e.target.value as CameraSpeed});requestAnimationFrame(()=>document.querySelector<HTMLElement>('[data-testid=artboard]')?.focus())}}><option value="slow">慢 · 细致构图</option><option value="standard">标准 · 流畅移动</option><option value="fast">快 · 大范围运镜</option></select></label></div>
        <div className="recorder-key-guide"><strong>镜头控制</strong><div className="key-guide-row"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><small>上 / 左 / 下 / 右平移</small></div><div className="key-guide-row"><span><kbd>↑</kbd><kbd>↓</kbd></span><small>前进 / 后退</small></div><div className="key-guide-row"><span><kbd>←</kbd><kbd>→</kbd></span><small>绕场景向左 / 右环绕</small></div><div className="key-guide-row"><span><kbd>Shift</kbd></span><small>按住精调</small></div><p>拖动空白旋转镜头，滚轮调整远近。</p></div>
        <div className="recorder-actions">
          {session.mode==='ready'&&<button className="primary-btn" disabled={!prepared} onClick={()=>{setCount(3);useCameraSession.setState({mode:'countdown'})}}><Circle size={16}/>开始录制（3 秒倒计时）</button>}
          {session.mode==='countdown'&&<button className="ghost-btn" onClick={()=>useCameraSession.setState({mode:'ready'})}>取消倒计时</button>}
          {session.mode==='recording'&&<button className="primary-btn record-stop" onClick={finish}><Square size={16}/>结束录制</button>}
          {session.mode==='review'&&<><button className="primary-btn" disabled={session.frame<0||session.end-session.start<1/s.project.fps-1e-8} onClick={s.applyCameraRecording}><Check size={16}/>采用本次录制</button><div className="row"><button className="ghost-btn" onClick={()=>{useCameraSession.setState({view:null});s.setPlayhead(session.start);s.setPlaying(true)}}><Play size={15}/>回放本次录制</button><button className="ghost-btn" onClick={again}><RotateCcw size={15}/>重新录制</button></div></>}
          <p className="hint">采用后写入工程，整次录制可一次撤销。</p>
        </div>
      </aside>
    </div>
  </div>
}
