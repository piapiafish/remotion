import { afterEach,describe,it,expect,vi } from 'vitest'
import { chooseSaveDestination,writeProjectFile } from './saveDestination'
afterEach(()=>vi.unstubAllGlobals())
describe('save before continuing',()=>{
  it('returns cancellation to the caller',async()=>{
    vi.stubGlobal('window',{showSaveFilePicker:()=>Promise.reject(new DOMException('cancelled','AbortError'))})
    await expect(chooseSaveDestination('my project')).rejects.toMatchObject({name:'AbortError'})
  })
  it('does not call a download a completed filesystem write',async()=>{
    vi.stubGlobal('window',{})
    expect(await chooseSaveDestination('project')).toBeNull()
  })
  it('only completes after the writable closes',async()=>{
    let finish=()=>{};const closed=new Promise<void>(r=>finish=r),events:string[]=[]
    const pending=writeProjectFile({createWritable:async()=>({write:async()=>{events.push('write')},close:async()=>{await closed;events.push('close')}})},new Blob(['project']))
    await Promise.resolve();await Promise.resolve();expect(events).toEqual(['write']);finish();await pending;expect(events).toEqual(['write','close'])
  })
  it('aborts a failed write and preserves the original error',async()=>{
    const abort=vi.fn(async()=>{}),error=new Error('disk full')
    await expect(writeProjectFile({createWritable:async()=>({write:async()=>{throw error},close:vi.fn(),abort})},new Blob())).rejects.toBe(error)
    expect(abort).toHaveBeenCalledOnce()
  })
})
