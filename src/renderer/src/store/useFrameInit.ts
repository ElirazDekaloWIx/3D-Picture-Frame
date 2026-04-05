/**
 * Frame initialization + live regeneration hook.
 * Regenerates frame whenever ANY relevant state changes.
 */

import { useEffect, useRef } from 'react'
import { useProjectStore } from './useProjectStore'
import { generateFrame } from '@core/parametric/FrameGenerator'
import type { FrameDimensions, FrameSymmetry, FramePath, CornerSettings } from '@core/types'

export function useFrameInit(): void {
  const frameDimensions = useProjectStore((s) => s.frameDimensions)
  const activeProfileId = useProjectStore((s) => s.activeProfileId)
  const profiles = useProjectStore((s) => s.profiles)
  const symmetry = useProjectStore((s) => s.symmetry)
  const cornerSettings = useProjectStore((s) => s.cornerSettings)
  const framePath = useProjectStore((s) => s.framePath)

  const activeProfile = profiles[activeProfileId]
  const profilePointCount = activeProfile?.points?.length ?? 0
  const profilePreset = activeProfile?.preset ?? 'flat'

  // Simple change counter - any change triggers regeneration
  const prevHash = useRef('')

  useEffect(() => {
    const store = useProjectStore.getState()
    const rootPart = store.parts[store.rootPartId]
    if (!rootPart || !activeProfile) return

    // Build a hash of all frame-affecting state
    const hash = JSON.stringify({
      dims: frameDimensions,
      profileId: activeProfileId,
      profilePts: profilePointCount,
      profilePreset,
      sym: symmetry,
      corner: cornerSettings,
      pathType: framePath.type,
      pathSides: framePath.sides,
      pathRX: framePath.radiusX,
      pathRY: framePath.radiusY,
      pathPtsLen: framePath.controlPoints.length,
      useCorners: framePath.useCorners,
    })

    // Skip if nothing changed
    if (hash === prevHash.current && rootPart.children.length > 0) return
    prevHash.current = hash

    // ─── Full regeneration ──────────────────────────
    const result = generateFrame(frameDimensions, activeProfile, symmetry, cornerSettings, framePath)

    const newParts: Record<string, any> = { [store.rootPartId]: { ...rootPart, children: [] } }
    const newMeshCache: Record<string, any> = {}
    const rootChildren: string[] = []

    // Dispose old frame geometries
    for (const id of rootPart.children) {
      const part = store.parts[id]
      if (part && part.type !== 'decoration') {
        const old = store.meshCache[id]
        if (old) old.dispose()
      }
    }

    // Add new frame parts
    for (const part of result.parts) {
      const p = { ...part, parentId: store.rootPartId }
      newParts[p.id] = p
      rootChildren.push(p.id)
      const geo = result.geometries.get(part.id)
      if (geo) newMeshCache[p.id] = geo
    }

    // Keep decoration parts
    for (const id of rootPart.children) {
      const part = store.parts[id]
      if (part && part.type === 'decoration') {
        newParts[id] = part
        rootChildren.push(id)
        if (store.meshCache[id]) newMeshCache[id] = store.meshCache[id]
      }
    }

    newParts[store.rootPartId] = { ...newParts[store.rootPartId], children: rootChildren }
    useProjectStore.setState({ parts: newParts, meshCache: newMeshCache })
  }, [frameDimensions, activeProfileId, profiles, symmetry, cornerSettings, framePath, profilePointCount, profilePreset])
}
