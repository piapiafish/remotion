import { describe, expect, it, vi, afterEach } from 'vitest'
import * as THREE from 'three'
import { assertSceneReady,waitForSceneReady } from './sceneReady'
import { registerReadyModel } from '../scene/modelReadiness'
import { useProjectStore } from '../store/project'
import { exportStep } from './exportError'

afterEach(() => vi.useRealTimers())
describe('export readiness', () => {
  function fixture() {
    const project = structuredClone(useProjectStore.getState().project)
    project.devices = [project.devices[0]]
    project.devices[0].id = 'iphone-17-pro'
    const scene = new THREE.Scene(), group = new THREE.Group(), model = new THREE.Group()
    group.userData.deviceIndex = 0; group.add(model); scene.add(group)
    return { project, scene, model }
  }
  it('rejects a model which has not committed its screen materials', () => {
    const {project,scene} = fixture()
    expect(() => assertSceneReady(scene, project)).toThrow('尚未就绪')
  })
  it('waits for the actual current screen URL instead of accepting a body texture', () => {
    const {project,scene,model} = fixture()
    registerReadyModel(model, '/devices/iphone-17-pro.glb')
    project.devices[0].screen = {id:'a',kind:'image',url:'blob:current',width:10,height:20}
    const texture = new THREE.Texture({src:'blob:old',width:10,height:20} as unknown as HTMLImageElement)
    model.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({map:texture})))
    expect(() => assertSceneReady(scene, project)).toThrow()
    texture.image.src = 'blob:current'
    expect(() => assertSceneReady(scene, project)).not.toThrow()
  })
  it('rejects a missing second model even though the first is ready', () => {
    const {project,scene,model} = fixture()
    registerReadyModel(model, '/devices/iphone-17-pro.glb')
    project.devices.push({...project.devices[0],instanceId:'second'})
    expect(() => assertSceneReady(scene, project)).toThrow()
  })
  it('cancels while waiting for dormant resources to commit',async()=>{
    vi.useFakeTimers();const {scene,project}=fixture(),controller=new AbortController()
    const pending=waitForSceneReady(scene,project,10000,controller.signal)
    const assertion=expect(pending).rejects.toMatchObject({name:'AbortError'})
    controller.abort();await vi.advanceTimersByTimeAsync(30);await assertion
    expect(vi.getTimerCount()).toBe(0)
  })
})
describe('bounded export operations', () => {
  it('times out stalled operations with their original stage', async () => {
    vi.useFakeTimers()
    const p = exportStep('media', () => new Promise(() => {}), undefined, 20)
    const assertion = expect(p).rejects.toMatchObject({name:'ExportFailure',stage:'media'})
    await vi.advanceTimersByTimeAsync(20)
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cancels a pending operation immediately and removes its timeout', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const p = exportStep('encode', () => new Promise(() => {}), controller.signal)
    controller.abort()
    await expect(p).rejects.toMatchObject({name:'AbortError'})
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps an explicit failure cause', async () => {
    await expect(exportStep('output',async()=>{throw new Error('storage blocked')})).rejects.toMatchObject({stage:'output',cause:expect.objectContaining({message:'storage blocked'})})
  })
})

