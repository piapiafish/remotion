import { describe, expect, it } from 'vitest'
import { roundedRectPlaneGeometry } from './geometry'

describe('procedural screen UVs', () => {
  it.each([[.65, 1.4], [1.4, .65], [2, 3]])('maps a %s x %s screen across the entire image', (w, h) => {
    const g = roundedRectPlaneGeometry(w, h, .1)
    const uv = g.getAttribute('uv'), p = g.getAttribute('position')
    const u: number[] = [], v: number[] = []
    for (let i = 0; i < uv.count; i++) {
      u.push(uv.getX(i)); v.push(uv.getY(i))
      expect(uv.getX(i)).toBeCloseTo(p.getX(i) / w + .5)
      expect(uv.getY(i)).toBeCloseTo(p.getY(i) / h + .5)
    }
    expect(Math.min(...u)).toBeCloseTo(0)
    expect(Math.max(...u)).toBeCloseTo(1)
    expect(Math.min(...v)).toBeCloseTo(0)
    expect(Math.max(...v)).toBeCloseTo(1)
    g.dispose()
  })
})
