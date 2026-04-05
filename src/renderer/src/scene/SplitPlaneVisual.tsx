/**
 * SplitPlaneVisual - renders translucent orange planes at split positions.
 * Shown when the split tool is active and split planes have been calculated.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '@store/useProjectStore'
import { useToolStore } from '@store/useToolStore'

// Temporary store for split preview planes (not in Zustand, just component state)
// This will be managed by the SplitPanel and passed via a shared store
import { useSplitPreviewStore } from '@store/useSplitPreviewStore'

export function SplitPlaneVisual() {
  const activeTool = useToolStore((s) => s.activeTool)
  const planes = useSplitPreviewStore((s) => s.previewPlanes)
  const printerConfig = useProjectStore((s) => s.printerConfig)

  if (activeTool !== 'split' || planes.length === 0) return null

  const bv = printerConfig.buildVolume
  const maxSize = Math.max(bv.x, bv.y, bv.z) * 1.5

  return (
    <group>
      {planes.map((plane, i) => {
        // Create a plane mesh oriented along the split axis
        const rotation: [number, number, number] = [0, 0, 0]
        const position: [number, number, number] = [0, 0, 0]
        let planeW = maxSize
        let planeH = maxSize

        if (plane.axis === 'x') {
          rotation[1] = Math.PI / 2
          position[0] = plane.offset
        } else if (plane.axis === 'y') {
          rotation[0] = Math.PI / 2
          position[1] = plane.offset
        } else {
          position[2] = plane.offset
        }

        return (
          <mesh key={i} position={position} rotation={rotation}>
            <planeGeometry args={[planeW, planeH]} />
            <meshBasicMaterial
              color="#fb923c"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
