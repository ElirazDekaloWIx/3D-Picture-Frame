/**
 * PartMesh - High-contrast clay Matcap. Stable, no flickering.
 */

import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useSelectionStore } from '@store/useSelectionStore'
import { useToolStore } from '@store/useToolStore'
import type { PartNode } from '@core/types'

// ─── Matcap textures (created ONCE at module level) ───────────

function buildMatcap(
  size: number,
  shadowRGB: [number, number, number],
  midRGB: [number, number, number],
  highlightRGB: [number, number, number]
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const d = img.data

  const kx = 0.35, ky = 0.55, kz = 0.75
  const kl = Math.sqrt(kx * kx + ky * ky + kz * kz)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 2 - 1
      const ny = (y / size) * 2 - 1
      const dist2 = nx * nx + ny * ny
      const i = (y * size + x) * 4

      if (dist2 > 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 0; continue }

      const nz = Math.sqrt(1 - dist2)
      const keyDot = Math.max(0, (nx * kx + (-ny) * ky + nz * kz) / kl)
      const fillDot = Math.max(0, -nx * 0.4 + (-ny) * 0.2 + nz * 0.5) * 0.25
      const diffuse = Math.pow(keyDot, 1.15) * 0.85 + fillDot

      // Specular
      const rz = 2 * nz * (nx * kx / kl + (-ny) * ky / kl + nz * kz / kl) - kz / kl
      const spec = Math.pow(Math.max(0, rz), 80) * 0.6

      // Fresnel rim
      const rim = Math.pow(1 - nz, 4) * 0.25

      // Two-tone color
      let r, g, b
      if (diffuse < 0.5) {
        const t = diffuse * 2
        r = shadowRGB[0] + (midRGB[0] - shadowRGB[0]) * t
        g = shadowRGB[1] + (midRGB[1] - shadowRGB[1]) * t
        b = shadowRGB[2] + (midRGB[2] - shadowRGB[2]) * t
      } else {
        const t = (diffuse - 0.5) * 2
        r = midRGB[0] + (highlightRGB[0] - midRGB[0]) * t
        g = midRGB[1] + (highlightRGB[1] - midRGB[1]) * t
        b = midRGB[2] + (highlightRGB[2] - midRGB[2]) * t
      }

      r = Math.min(1, r + spec + rim * 0.4)
      g = Math.min(1, g + spec + rim * 0.38)
      b = Math.min(1, b + spec + rim * 0.35)

      d[i] = r * 255; d[i + 1] = g * 255; d[i + 2] = b * 255; d[i + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = false // prevent re-upload
  return tex
}

// Build ONCE and never again
export const CLAY_MATCAP = buildMatcap(512, [0.14, 0.12, 0.10], [0.52, 0.47, 0.42], [0.88, 0.84, 0.80])
const SEL_MATCAP = buildMatcap(512, [0.08, 0.12, 0.22], [0.30, 0.40, 0.55], [0.65, 0.75, 0.88])

// ─── Component ────────────────────────────────────────────────

export function PartMesh({ part, geometry }: { part: PartNode; geometry?: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const selected = useSelectionStore((s) => s.selectedPartIds)
  const select = useSelectionStore((s) => s.select)
  const toggleSelect = useSelectionStore((s) => s.toggleSelect)
  const setHoveredId = useSelectionStore((s) => s.setHovered)
  const showWire = useToolStore((s) => s.wireframeOverlay)

  const isSel = selected.includes(part.id)

  // Memoize material to prevent re-creation on every render
  const material = useMemo(() => {
    const mat = new THREE.MeshMatcapMaterial({
      matcap: isSel ? SEL_MATCAP : CLAY_MATCAP,
      side: THREE.DoubleSide,
    })
    return mat
  }, [isSel])

  const wireGeo = useMemo(() => geometry ? new THREE.WireframeGeometry(geometry) : null, [geometry])

  if (!geometry || !wireGeo) return null

  return (
    <group
      position={part.transform.position}
      rotation={part.transform.rotation}
      scale={part.transform.scale}
    >
      {/* Solid mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        userData={{ partId: part.id }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (e.intersections[0]?.object !== meshRef.current) return
          e.nativeEvent.ctrlKey ? toggleSelect(part.id) : select(part.id)
        }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setHoveredId(part.id); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); setHoveredId(null); document.body.style.cursor = 'default' }}
      />
      {/* Wireframe overlay - toggleable */}
      {showWire && (
        <lineSegments geometry={wireGeo}>
          <lineBasicMaterial color={isSel ? '#4488cc' : '#000000'} transparent opacity={isSel ? 0.7 : 0.35} linewidth={2} depthTest={true} toneMapped={false} />
        </lineSegments>
      )}
    </group>
  )
}
