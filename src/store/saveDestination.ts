export type SaveResult='saved'|'downloaded'|'cancelled'|'failed'
type Writable={write:(blob:Blob)=>Promise<void>;close:()=>Promise<void>;abort?:()=>Promise<void>}
export type SaveHandle={createWritable:()=>Promise<Writable>}

/** Invoke synchronously from the save button to keep browser user activation. */
export function chooseSaveDestination(name:string):Promise<SaveHandle|null> {
  const picker=(typeof window==='undefined'?undefined:(window as unknown as {showSaveFilePicker?:(options:unknown)=>Promise<SaveHandle>}).showSaveFilePicker)
  return picker?picker.call(window,{suggestedName:`${name||'未命名工程'}.mockup`,types:[{description:'编辑器工程',accept:{'application/zip':['.mockup']}}]}):Promise.resolve(null)
}
export async function writeProjectFile(handle:SaveHandle,blob:Blob) {
  const stream=await handle.createWritable()
  try{await stream.write(blob);await stream.close()}catch(error){try{await stream.abort?.()}catch{/* preserve the write error */}throw error}
}
