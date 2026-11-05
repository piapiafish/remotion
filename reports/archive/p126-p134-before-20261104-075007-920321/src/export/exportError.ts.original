export type ExportStage = 'prepare' | 'media' | 'render' | 'configure' | 'encode' | 'output'

const labels: Record<ExportStage, string> = {
  prepare: '准备导出', media: '读取或定位素材', render: '渲染画面',
  configure: '配置视频编码器', encode: '编码视频', output: '生成或下载文件',
}

export class ExportFailure extends Error {
  readonly stage: ExportStage
  constructor(stage: ExportStage, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(`${labels[stage]}失败：${detail}`, { cause })
    this.name = 'ExportFailure'
    this.stage = stage
  }
}

export function exportFailure(stage: ExportStage, error: unknown): Error {
  if (error instanceof ExportFailure || (error instanceof Error && error.name === 'AbortError')) return error
  return new ExportFailure(stage, error)
}

/** Bounded async operations, with cancellation even when a browser promise stalls. */
export async function exportStep<T>(stage: ExportStage, work: () => Promise<T>, signal?: AbortSignal, timeoutMs = 30000): Promise<T> {
  signal?.throwIfAborted()
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('操作超时，请检查素材或降低导出质量后重试')), timeoutMs)
        abort = () => reject(signal?.reason ?? new DOMException('Cancelled', 'AbortError'))
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
      }),
    ])
  } catch (error) {
    throw exportFailure(stage, error)
  } finally {
    clearTimeout(timer)
    if (abort) signal?.removeEventListener('abort', abort)
  }
}
