/**
 * FrameScene - renders parts + symmetry mirrors + live cloner.
 */

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { invalidate } from '@react-three/fiber'
import { useProjectStore } from '@store/useProjectStore'
import { useClonerStore } from '@store/useClonerStore'
import { PartMesh, CLAY_MATCAP } from './PartMesh'
import { computeCloneTransforms } from '@core/parametric/SplineCloner'
import { buildPathPoints } from '@core/parametric/FramePath'
import type { PartNode } from '@core/types'

export function FrameScene() {
  const parts = useProjectStore((s) => s.parts)
  const rootPartId = useProjectStore((s) => s.rootPartId)
  const meshCache = useProjectStore((s) => s.meshCache)
  const frameDimensions = useProjectStore((s) => s.frameDimensions)
  const framePath = useProjectStore((s) => s.framePath)
  const symmetry = useProjectStore((s) => s.symmetry)

  // Cloner state - subscribe to entire store for live updates
  const cloner = useClonerStore()

  const rootPart = parts[rootPartId]

  const childParts = useMemo(() => {
    if (!rootPart) return []
    return rootPart.children
      .map((id) => parts[id])
      .filter((p): p is NonNullable<typeof p> => p != null && p.visible)
  }, [rootPart, parts])

  useEffect(() => { invalidate() }, [parts, meshCache, frameDimensions, symmetry, cloner])

  const totalHeight = frameDimensions.pictureHeight + frameDimensions.frameWidth * 2
  const yOffset = totalHeight / 2

  // Symmetry mirrors
  const mirrorDecorations = useMemo(() => {
    if (symmetry.mode === 'full') return []
    const decos = childParts.filter(p => p.type === 'decoration' && !p.name.includes('(mirror'))
    const mirrors: Array<{ source: PartNode; scaleX: number; scaleY: number; key: string }> = []
    for (const deco of decos) {
      if (symmetry.mode === 'half-x' || symmetry.mode === 'quarter')
        mirrors.push({ source: deco, scaleX: -1, scaleY: 1, key: `${deco.id}-mx` })
      if (symmetry.mode === 'half-y' || symmetry.mode === 'quarter')
        mirrors.push({ source: deco, scaleX: 1, scaleY: -1, key: `${deco.id}-my` })
      if (symmetry.mode === 'quarter')
        mirrors.push({ source: deco, scaleX: -1, scaleY: -1, key: `${deco.id}-mxy` })
    }
    return mirrors
  }, [childParts, symmetry])

  // Live cloner transforms
  const cloneMatrices = useMemo(() => {
    if (!cloner.enabled || cloner.sourcePartIds.length === 0) return []
    const pathPts = buildPathPoints(framePath, frameDimensions)
    const smooth = framePath.type === 'circle' || framePath.type === 'ellipse' || framePath.type === 'freehand'
    return computeCloneTransforms(pathPts, smooth, {
      count: cloner.count, offset: cloner.offset, rotationOffset: cloner.rotationOffset,
      scale: cloner.scale, zOffset: cloner.zOffset,
      stepRotation: cloner.stepRotation, stepScale: cloner.stepScale, flipAlternate: cloner.flipAlternate,
      randomSeed: cloner.randomSeed, randomPosition: cloner.randomPosition,
      randomRotation: cloner.randomRotation, randomScale: cloner.randomScale,
      randomSpacing: cloner.randomSpacing, randomZ: cloner.randomZ
    })
  }, [cloner, framePath, frameDimensions])

  return (
    <group position={[0, yOffset, 0]}>
      {/* Regular parts */}
      {childParts.map((part) => (
        <PartMesh key={part.id} part={part} geometry={meshCache[part.id]} />
      ))}

      {/* Symmetry mirrors */}
      {mirrorDecorations.map(({ source, scaleX, scaleY, key }) => {
        const geo = meshCache[source.id]
        if (!geo) return null
        return (
          <group key={key} scale={[scaleX, scaleY, 1]}>
            <group position={source.transform.position} rotation={source.transform.rotation} scale={source.transform.scale}>
              <mesh geometry={geo}>
                <meshMatcapMaterial matcap={CLAY_MATCAP} side={THREE.DoubleSide} transparent opacity={0.6} />
              </mesh>
            </group>
          </group>
        )
      })}

      {/* Live cloner instances - iterate through source geometries */}
      {cloner.enabled && cloner.sourcePartIds.length > 0 && cloneMatrices.map((matrix, i) => {
        const sourceId = cloner.sourcePartIds[i % cloner.sourcePartIds.length]
        const geo = meshCache[sourceId]
        if (!geo) return null
        return (
          <mesh key={`clone-${i}`} geometry={geo} matrixAutoUpdate={false}
            ref={(mesh) => { if (mesh) mesh.matrix.copy(matrix) }}>
            <meshMatcapMaterial matcap={CLAY_MATCAP} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}
