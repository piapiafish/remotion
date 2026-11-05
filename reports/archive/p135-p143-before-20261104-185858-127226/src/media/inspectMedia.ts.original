/** Validate archive media before replacing the editable document. */
export async function inspectMedia(blob: Blob, kind: 'image' | 'video') {
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise<{ width: number; height: number; duration?: number }>((resolve, reject) => {
      const element = kind === 'video' ? document.createElement('video') : new Image()
      const video = element instanceof HTMLVideoElement ? element : null
      const image = video ? null : element as HTMLImageElement
      const cleanup = () => {
        clearTimeout(timer)
        element.onerror = null
        if (video) { video.onloadeddata = null; video.pause(); video.removeAttribute('src'); video.load() }
        if (image) image.onload = null
      }
      const done = () => {
        const result = video ? { width: video.videoWidth, height: video.videoHeight, duration: video.duration }
          : { width: image!.naturalWidth, height: image!.naturalHeight }
        cleanup()
        if (!result.width || !result.height || (video && (!Number.isFinite(result.duration) || result.duration! <= 0))) reject(new Error('工程中的素材尺寸或时长无效。'))
        else resolve(result)
      }
      const timer = setTimeout(() => { cleanup(); reject(new Error('工程素材解码超时，请检查文件后重试。')) }, 12000)
      element.onerror = () => { cleanup(); reject(new Error('工程中含有损坏或浏览器不支持的素材，已保留当前工程。')) }
      if (video) { video.preload = 'auto'; video.muted = true; video.onloadeddata = done }
      if (image) image.onload = done
      element.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}
