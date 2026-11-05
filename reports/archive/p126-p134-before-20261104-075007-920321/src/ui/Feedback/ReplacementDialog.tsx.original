import { useEffect, useRef, useState } from 'react'
import { useReplacement } from '../../store/replacement'
import { useProjectStore } from '../../store/project'

export function ReplacementDialog(){
  const pending=useReplacement(s=>s.pending)
  return pending?<ReplacementPrompt key={pending.kind} pending={pending}/>:null
}
function ReplacementPrompt({pending}:{pending:NonNullable<ReturnType<typeof useReplacement.getState>['pending']>}){
  const ref=useRef<HTMLElement>(null),[busy,setBusy]=useState(false),[download,setDownload]=useState(false),[message,setMessage]=useState('')
  const cancel=()=>{if(!busy)useReplacement.setState({pending:null})}
  useEffect(()=>{const previous=document.activeElement;ref.current?.querySelector('button')?.focus();return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}},[])
  const next=pending.kind==='open'?'打开新工程':'新建工程'
  const proceed=()=>{useReplacement.setState({pending:null});pending.proceed()}
  const save=async()=>{if(busy)return;setBusy(true);setMessage('');const result=await useProjectStore.getState().saveProject({confirmWrite:true});setBusy(false);if(result==='saved')proceed();else if(result==='downloaded'){setDownload(true);setMessage('工程下载已发起。确认文件已保存后，再继续。')}else setMessage(result==='cancelled'?'已取消保存，当前工程仍保留。':'保存未完成，当前工程仍保留，请重试。')}
  return <div className="dialog-shade replacement-shade"><section ref={ref} className="studio-dialog replacement-dialog" role="dialog" aria-modal="true" aria-labelledby="replacement-title" onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();cancel()}
    if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
  }}><h2 id="replacement-title">未保存的修改</h2><p>当前工程“{useProjectStore.getState().project.name}”有未保存的修改。请选择如何{next}。</p>{message&&<p role="status">{message}</p>}<div className="replacement-actions">
    {download?<button className="primary-btn" disabled={busy} onClick={proceed}>已确认保存，继续{next}</button>:<button className="primary-btn" disabled={busy} onClick={()=>void save()}>{busy?'正在保存…':`保存当前工程并${next}`}</button>}
    <button className="ghost-btn" disabled={busy} onClick={proceed}>不保存当前工程并{next}</button>
    <button className="ghost-btn" disabled={busy} onClick={cancel}>{pending.kind==='open'?'取消打开':'取消新建'}</button>
  </div></section></div>
}
