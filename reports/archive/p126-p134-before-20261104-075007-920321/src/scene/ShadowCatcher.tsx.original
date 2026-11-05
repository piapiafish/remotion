import * as THREE from 'three'
import { useMemo } from 'react'

type ShadowCatcherProps = {
  opacity: number
  /** Persisted world-space ground height; never follows device edits. */
  y: number
}

// A real shadow-catcher plane, not drei's baked ContactShadows (§6.4) — this
// responds correctly to camera/device motion and survives transparent export
// because ShadowMaterial composites onto clearAlpha = 0.
export function ShadowCatcher({ opacity, y }: ShadowCatcherProps) {
  const material = useMemo(
    () => new THREE.ShadowMaterial({ opacity, transparent: true }),
    [],
  )
  material.opacity = opacity

  return (
    // Fixed per document. The shared pose constraint keeps device bottoms above it.
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
