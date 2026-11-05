import { putMedia } from './storage'
import type { MediaRef } from '../store/schema'

/**
 * Read an image file into a MediaRef and persist the blob.
 *
 * The blob goes to durable storage immediately rather than at save time —
 * a dropped screenshot is the most expensive thing in the document to
 * replace. The explicit .mockup save includes those bytes; the media cache
 * alone does not restore the unsaved project document after a reload.
 */
export async function loadImageAsMediaRef(file: File): Promise<MediaRef> {
  const id = crypto.randomUUID()
  const url = URL.createObjectURL(file)

  try {
  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image()
      const cleanup = () => { clearTimeout(timer); img.onload = null; img.onerror = null }
      const timer = setTimeout(() => { cleanup(); reject(new Error('读取图片超时。')) }, 12000)
      img.onload = () => { cleanup(); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
      img.onerror = () => { cleanup(); reject(new Error('浏览器无法读取该图片。')) }
      img.src = url
    },
  )

  await putMedia(id, file)
  return { id, kind: 'image', width, height, url }
  } catch (error) { URL.revokeObjectURL(url); throw error }
}

/** Recreate the session-local object URL for a stored ref after a reload. */
export function withObjectUrl(ref: MediaRef, blob: Blob): MediaRef {
  return { ...ref, url: URL.createObjectURL(blob) }
}
