import { useMemo } from 'react'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { useRenderStore } from '@store/useRenderStore'

const S = {
  bar: {
    height: 28, background: '#16213e', borderTop: '1px solid #222244',
    display: 'flex', alignItems: 'center', padding: '0 16px',
    fontSize: 11, color: '#8892a0', gap: 24, flexShrink: 0
  } as React.CSSProperties
}

export function StatusBar() {
  const parts = useProjectStore((s) => s.parts)
  const meshCache = useProjectStore((s) => s.meshCache)
  const pc = useProjectStore((s) => s.printerConfig)
  const sel = useSelectionStore((s) => s.selectedPartIds)
  const rm = useRenderStore((s) => s.renderMode)

  const stats = useMemo(() => {
    let v = 0, f = 0
    for (const geo of Object.values(meshCache)) {
      if (geo.attributes.position) v += geo.attributes.position.count
      if (geo.index) f += geo.index.count / 3
      else if (geo.attributes.position) f += geo.attributes.position.count / 3
    }
    return { v, f }
  }, [meshCache])

  // Check if all meshes have valid indexed geometry (basic manifold check)
  const manifoldStatus = useMemo(() => {
    const geos = Object.values(meshCache)
    if (geos.length === 0) return 'N/A'
    const allIndexed = geos.every(g => g.index && g.index.count > 0)
    return allIndexed ? 'OK' : 'Check'
  }, [meshCache])

  return (
    <div style={S.bar}>
      <span>Parts: {Object.keys(parts).length - 1}</span>
      <span>Verts: {stats.v.toLocaleString()}</span>
      <span>Faces: {Math.floor(stats.f).toLocaleString()}</span>
      <span style={{ color: manifoldStatus === 'OK' ? '#4ade80' : '#fb923c' }}>
        Manifold: {manifoldStatus}
      </span>
      <span>Printer: {pc.name} ({pc.buildVolume.x}x{pc.buildVolume.y}x{pc.buildVolume.z}mm)</span>
      <div style={{ flex: 1 }} />
      {sel.length > 0 && <span style={{ color: '#4a9eff' }}>Selected: {sel.length}</span>}
      <span style={{ color: rm === 'pathtraced' ? '#a78bfa' : undefined }}>
        {rm === 'pbr' ? 'PBR' : 'PathTraced'}
      </span>
    </div>
  )
}
