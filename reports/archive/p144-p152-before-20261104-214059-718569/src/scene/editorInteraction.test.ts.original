import { describe, expect, it } from 'vitest'
import { Euler, Group, Mesh, Quaternion, Scene } from 'three'
import { nearestEuler, uniformScale } from './transformValues'
import { withoutEditorHelpers } from './editorHelpers'

describe('canvas transform values', () => {
  for (const axis of [0, 1, 2]) {
    it('retains two complete positive and negative turns on axis ' + axis, () => {
      for (const direction of [-1, 1]) {
        let previous: [number, number, number] = [0, 0, 0]
        for (let i = 0; i <= 160; i++) {
          const angles: [number, number, number] = [0, 0, 0]
          angles[axis] = direction * i / 160 * Math.PI * 4
          previous = nearestEuler(new Quaternion().setFromEuler(new Euler(...angles)), previous)
          expect(previous[axis]).toBeCloseTo(angles[axis], 5)
        }
      }
    })
  }
  it('lifts an existing 720-degree pose rather than normalizing it to zero', () => {
    const previous: [number, number, number] = [.1, Math.PI * 4, -.2]
    const next = [.1, Math.PI * 4 + .2, -.2] as [number, number, number]
    const result = nearestEuler(new Quaternion().setFromEuler(new Euler(...next)), previous)
    result.forEach((v, i) => expect(v).toBeCloseTo(next[i]))
  })
  it('keeps scale uniform and positive for each axis handle', () => {
    expect(uniformScale([1.5, 1, 1], 1)).toBe(1.5)
    expect(uniformScale([1, .8, 1], 1)).toBe(.8)
    expect(uniformScale([1, 1, -2], 1)).toBe(.05)
    expect(uniformScale([.9, .9, .9], 1)).toBe(.9)
  })
})
describe('export overlay exclusion', () => {
  it('hides helper subtrees during rendering and restores their original visibility', () => {
    const scene = new Scene(), phone = new Mesh(), gizmo = new Group(), outline = new Group()
    gizmo.userData.editorOnly = true; outline.userData.editorOnly = true; outline.visible = false
    scene.add(phone, gizmo, outline)
    const result = withoutEditorHelpers(scene, () => {
      expect(phone.visible).toBe(true); expect(gizmo.visible).toBe(false); expect(outline.visible).toBe(false)
      return 'frame'
    })
    expect(result).toBe('frame'); expect(gizmo.visible).toBe(true); expect(outline.visible).toBe(false)
  })
  it('restores the editing overlay even when rendering fails', () => {
    const scene = new Scene(), gizmo = new Group(); gizmo.userData.editorOnly = true; scene.add(gizmo)
    expect(() => withoutEditorHelpers(scene, () => { throw new Error('GPU') })).toThrow('GPU')
    expect(gizmo.visible).toBe(true)
  })
})
