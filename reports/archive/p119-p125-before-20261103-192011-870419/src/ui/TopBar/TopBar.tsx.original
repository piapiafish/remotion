import { useMemo, useRef } from 'react'
import { Save, FolderOpen, Undo2, Redo2 } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { projectFingerprint } from '../../store/persist'
import { ASPECT_PRESETS } from '../../store/schema'

export function TopBar({onExport,onAssistant}:{onExport:()=>void;onAssistant:()=>void}) {
  const s=useProjectStore(), input=useRef<HTMLInputElement>(null)
  const dirty=useMemo(()=>projectFingerprint(s.project)!==s.savedFingerprint,[s.project,s.savedFingerprint])
  const aspect=ASPECT_PRESETS.find(a=>a.width===s.project.output.width&&a.height===s.project.output.height)?.id??'custom'
  return <header className="topbar">
    <div className="topbar-left"><button className="ghost-btn" onClick={()=>s.setEditorPage('templates')}>‹ 模板</button><input className="project-name" aria-label="工程名称" value={s.project.name} onChange={e=>s.setName(e.target.value)}/><span className="save-state">{s.fileBusy?'正在处理…':dirty?'未保存':'已保存状态'}</span>
    <button className="icon-btn" title="撤销（Ctrl+Z）" aria-label="撤销" disabled={!s.history.past.length} onClick={s.undo}><Undo2 size={16}/></button><button className="icon-btn" title="重做（Ctrl+Shift+Z）" aria-label="重做" disabled={!s.history.future.length} onClick={s.redo}><Redo2 size={16}/></button></div>
    <div className="topbar-right"><select aria-label="画幅" value={aspect} onChange={e=>{const a=ASPECT_PRESETS.find(p=>p.id===e.target.value);if(a)s.setOutput({width:a.width,height:a.height})}}>{ASPECT_PRESETS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}{aspect==='custom'&&<option value="custom">自定义画幅</option>}</select>
    <button className="ghost-btn" onClick={onAssistant}>动画助手</button><button className="icon-btn" disabled={s.fileBusy} title="打开工程" aria-label="打开工程" onClick={()=>input.current?.click()}><FolderOpen size={17}/></button><button className="ghost-btn" disabled={s.fileBusy} onClick={()=>void s.saveProject()}><Save size={15}/>保存工程</button><button className="primary-btn" onClick={onExport}>导出</button></div>
    <input hidden type="file" ref={input} accept=".mockup,application/zip" aria-label="打开工程文件" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void s.openProject(f)}}/>
  </header>
}
