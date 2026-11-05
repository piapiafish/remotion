export type StudioSession = {
  id: string
  status: 'READY' | 'QUEUED' | 'RENDERING' | 'DONE' | 'ERROR' | 'INTERRUPTED'
  path: string
  outputPath: string
  storyboard: unknown
  summary: { width: number; height: number; fps: number; seconds: number; shots: { id: string; motion: string; seconds: number }[] }
  progress: { done: number; total: number; composing: boolean }
  error?: { code: string; message: string }
  logTail: string
  boardUrl: string
  videoUrl?: string
}

export const STUDIO_API = '/__studio__'

export async function studioRequest<T>(route: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(STUDIO_API + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json', 'X-Promo-Studio': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  let value
  try { value = await response.json() }
  catch { throw new Error('自动保存需要本地服务。请用 npm run dev 启动项目，并通过 localhost 打开编辑器。') }
  if (!response.ok) throw new Error(value?.error?.message || `本地服务请求失败：${response.status}`)
  return value as T
}
