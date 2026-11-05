import { useRef } from 'react'
import { TemplatePicker } from './TemplatePicker'
import { useProjectStore } from '../../store/project'

export function TemplatePage() {
  const input = useRef<HTMLInputElement>(null)
  const store = useProjectStore()
  return <main className="template-page" data-testid="template-page">
    <header><span className="brand-mark">3D 宣传片工作室</span><div className="row">
      {store.documentEpoch > 0 && <button className="ghost-btn" onClick={() => store.setEditorPage('editor')}>返回当前工程</button>}
      <button className="ghost-btn" disabled={store.fileBusy} onClick={() => input.current?.click()}>打开已有工程</button>
    </div></header>
    <section className="template-intro"><span className="eyebrow">从一个简单构图开始</span><h1>选择模板，再做一点自己的调整</h1><p>选择手机构图，添加画面内容和标题，在时间轴上安排动作。</p></section>
    <TemplatePicker />
    <p className="hint">模板中的手机、颜色、素材和位置都可以继续修改。</p>
    <input ref={input} type="file" accept=".mockup,application/zip" hidden aria-label="打开工程文件" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void store.openProject(file) }} />
  </main>
}
