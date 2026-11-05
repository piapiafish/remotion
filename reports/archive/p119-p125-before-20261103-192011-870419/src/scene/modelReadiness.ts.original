import type { Object3D } from 'three'

// Loading a mesh is not enough: the authored screen must have its final material.
const readyModels = new WeakMap<Object3D, string>()

export function registerReadyModel(model: Object3D, url: string): () => void {
  readyModels.set(model, url)
  return () => { readyModels.delete(model) }
}

export const isModelReady = (model: Object3D, url: string) => readyModels.get(model) === url
