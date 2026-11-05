import * as THREE from 'three'

/**
 * A rounded rectangle centred at the origin. ShapeGeometry uses local XY
 * coordinates as UVs; roundedRectPlaneGeometry normalises them explicitly.
 */
export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2
  const h = height / 2
  const r = Math.min(radius, w, h)
  const shape = new THREE.Shape()
  shape.moveTo(-w + r, -h)
  shape.lineTo(w - r, -h)
  shape.quadraticCurveTo(w, -h, w, -h + r)
  shape.lineTo(w, h - r)
  shape.quadraticCurveTo(w, h, w - r, h)
  shape.lineTo(-w + r, h)
  shape.quadraticCurveTo(-w, h, -w, h - r)
  shape.lineTo(-w, -h + r)
  shape.quadraticCurveTo(-w, -h, -w + r, -h)
  shape.closePath()
  return shape
}

export function roundedRectPlaneGeometry(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 24)
  const positions = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, positions.getX(i) / width + 0.5, positions.getY(i) / height + 0.5)
  }
  uv.needsUpdate = true
  return geometry
}

export function roundedRectBodyGeometry(
  width: number,
  height: number,
  radius: number,
  depth: number,
) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.12,
    bevelSize: depth * 0.1,
    bevelSegments: 6,
    curveSegments: 24,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}
