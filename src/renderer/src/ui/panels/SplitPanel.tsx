/**
 * SplitPanel - UI for splitting parts to fit the print bed.
 * Shows when split tool is active and a part is selected.
 */

import { useCallback } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { useSplitPreviewStore } from '@store/useSplitPreviewStore'
import { calculateAutoSplitPlanes, getExceedingAxes } from '@core/splitting/SplitPlane'
import { splitWithConnectors, type SplitResult } from '@core/splitting/AutoSplitter'
import { initManifold } from '@core/csg/ManifoldAdapter'
import { createPartNode } from '@core/PartTree'
import type { ConnectorType } from '@core/types'

const S = {
  panel: { padding: '12px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  title: { fontSize: 13, fontWeight: 600, color: '#e8e8e8', marginBottom: 4 },
  label: { fontSize: 11, color: '#8892a0' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  btn: (primary = false): React.CSSProperties => ({
    padding: '6px 16px', fontSize: 12, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: primary ? '#4a9eff' : '#1f2940', color: primary ? '#fff' : '#8892a0', width: '100%'
  }),
  connBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#4a9eff' : '#1a1a2e', color: active ? '#fff' : '#8892a0'
  }),
  slider: { width: '100%', accentColor: '#4a9eff' } as React.CSSProperties,
  warning: { fontSize: 11, color: '#fb923c', background: '#2a1f0e', padding: '6px 8px', borderRadius: 4 },
  info: { fontSize: 11, color: '#4ade80', background: '#0e2a1a', padding: '6px 8px', borderRadius: 4 },
  progress: { fontSize: 11, color: '#a78bfa', textAlign: 'center' as const, padding: 12 }
}

export function SplitPanel() {
  const parts = useProjectStore((s) => s.parts)
  const meshCache = useProjectStore((s) => s.meshCache)
  const printerConfig = useProjectStore((s) => s.printerConfig)
  const addPart = useProjectStore((s) => s.addPart)
  const removePart = useProjectStore((s) => s.removePart)
  const setMeshCache = useProjectStore((s) => s.setMeshCache)
  const selectedIds = useSelectionStore((s) => s.selectedPartIds)
  const deselectAll = useSelectionStore((s) => s.deselectAll)

  const previewPlanes = useSplitPreviewStore((s) => s.previewPlanes)
  const connectorType = useSplitPreviewStore((s) => s.connectorType)
  const connectorParams = useSplitPreviewStore((s) => s.connectorParams)
  const isSplitting = useSplitPreviewStore((s) => s.isSplitting)
  const setPreviewPlanes = useSplitPreviewStore((s) => s.setPreviewPlanes)
  const setConnectorType = useSplitPreviewStore((s) => s.setConnectorType)
  const setConnectorParams = useSplitPreviewStore((s) => s.setConnectorParams)
  const clearPreview = useSplitPreviewStore((s) => s.clearPreview)
  const setIsSplitting = useSplitPreviewStore((s) => s.setIsSplitting)

  const selectedPart = selectedIds.length === 1 ? parts[selectedIds[0]] : null
  const selectedGeo = selectedPart ? meshCache[selectedPart.id] : null
  const bv = printerConfig.buildVolume

  // Check if selected part exceeds build volume
  const exceedingAxes = selectedGeo ? (() => {
    selectedGeo.computeBoundingBox()
    return getExceedingAxes(selectedGeo.boundingBox!, bv)
  })() : []

  const handleAutoSplit = useCallback(() => {
    if (!selectedGeo) return
    selectedGeo.computeBoundingBox()
    const planes = calculateAutoSplitPlanes(selectedGeo.boundingBox!, bv)
    setPreviewPlanes(planes)
  }, [selectedGeo, bv, setPreviewPlanes])

  const handleApplySplit = useCallback(async () => {
    if (!selectedPart || !selectedGeo || previewPlanes.length === 0) return

    setIsSplitting(true)

    try {
      await initManifold()

      // Apply ALL split planes sequentially
      let currentGeo = selectedGeo
      const allResults: SplitResult[] = []

      for (const plane of previewPlanes) {
        currentGeo.computeBoundingBox()
        const bb = currentGeo.boundingBox!
        const min = plane.axis === 'x' ? bb.min.x : plane.axis === 'y' ? bb.min.y : bb.min.z
        const max = plane.axis === 'x' ? bb.max.x : plane.axis === 'y' ? bb.max.y : bb.max.z

        if (plane.offset > min + 0.1 && plane.offset < max - 0.1) {
          const [resultA, resultB] = await splitWithConnectors(
            currentGeo, plane, connectorType, connectorParams, selectedPart.id
          )
          allResults.push(resultA)
          currentGeo = resultB.geometry // continue splitting the negative side
          // Push the last negative piece at the end
          if (plane === previewPlanes[previewPlanes.length - 1]) {
            allResults.push(resultB)
          }
        }
      }

      // If only one plane, simpler path
      if (allResults.length === 0) {
        const [rA, rB] = await splitWithConnectors(
          selectedGeo, previewPlanes[0], connectorType, connectorParams, selectedPart.id
        )
        allResults.push(rA, rB)
      }

      // Create parts for all split results
      // Geometry from Manifold is in world space (same as original).
      // Since FrameScene applies yOffset to all children, and the geometry already
      // includes the world-space positions, we keep transform at [0,0,0] (same as frame rails).
      const parentId = selectedPart.parentId ?? undefined
      for (const result of allResults) {
        const part = createPartNode({
          name: `${selectedPart.name} ${result.label}`,
          type: 'split-result',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          geometry: { kind: 'csg-result', operation: 'subtract', operandIds: [selectedPart.id] },
          splitInfo: result.splitInfo
        })
        addPart(part, parentId)
        setMeshCache(part.id, result.geometry)
      }

      // Remove original part
      removePart(selectedPart.id)
      deselectAll()
      clearPreview()

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[3DPF] Split failed:', msg)
      alert(`Split failed: ${msg}`)
    } finally {
      setIsSplitting(false)
    }
  }, [selectedPart, selectedGeo, previewPlanes, connectorType, connectorParams,
    addPart, removePart, setMeshCache, deselectAll, clearPreview, setIsSplitting])

  const connectorTypes: ConnectorType[] = ['snap-fit', 'dovetail', 'pin-hole', 'mortise-tenon']

  if (isSplitting) {
    return (
      <div style={S.panel}>
        <div style={S.title}>Splitting...</div>
        <div style={S.progress}>Running CSG operation...</div>
      </div>
    )
  }

  if (!selectedPart) {
    return (
      <div style={S.panel}>
        <div style={S.title}>Split Tool</div>
        <div style={S.label}>Select a part to split it for printing.</div>
      </div>
    )
  }

  return (
    <div style={S.panel}>
      <div style={S.title}>Split: {selectedPart.name}</div>

      {/* Build volume status */}
      {exceedingAxes.length > 0 ? (
        <div style={S.warning}>
          Exceeds build volume on: {exceedingAxes.map(a =>
            `${a.axis.toUpperCase()} (${a.size.toFixed(0)}mm > ${a.limit}mm)`
          ).join(', ')}
        </div>
      ) : (
        <div style={S.info}>Fits in build volume - no split needed</div>
      )}

      {/* Auto split */}
      <button style={S.btn(true)} onClick={handleAutoSplit}>
        Auto Split
      </button>

      {previewPlanes.length > 0 && (
        <div style={S.label}>
          {previewPlanes.length} split plane{previewPlanes.length > 1 ? 's' : ''} → {previewPlanes.length + 1} pieces
        </div>
      )}

      {/* Connector type */}
      <div>
        <div style={S.label}>Connector Type</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {connectorTypes.map((ct) => (
            <button key={ct} style={S.connBtn(connectorType === ct)}
              onClick={() => setConnectorType(ct)}>
              {ct}
            </button>
          ))}
        </div>
      </div>

      {/* Connector params */}
      <div>
        <div style={{ ...S.row, ...S.label }}>
          <span>Tolerance: {connectorParams.tolerance.toFixed(1)}mm</span>
        </div>
        <input type="range" min={0.1} max={0.5} step={0.05}
          value={connectorParams.tolerance} style={S.slider}
          onChange={(e) => setConnectorParams({ tolerance: parseFloat(e.target.value) })} />
      </div>
      <div>
        <div style={{ ...S.row, ...S.label }}>
          <span>Size: {connectorParams.size.toFixed(0)}mm</span>
        </div>
        <input type="range" min={3} max={15} step={1}
          value={connectorParams.size} style={S.slider}
          onChange={(e) => setConnectorParams({ size: parseFloat(e.target.value) })} />
      </div>

      {/* Apply */}
      {previewPlanes.length > 0 && (
        <button style={S.btn(true)} onClick={handleApplySplit}>
          Apply Split
        </button>
      )}
    </div>
  )
}
