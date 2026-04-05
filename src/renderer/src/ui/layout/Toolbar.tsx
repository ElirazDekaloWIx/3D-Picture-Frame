import { useCallback, useState } from 'react'
import * as THREE from 'three'
import { useToolStore } from '@store/useToolStore'
import { useRenderStore } from '@store/useRenderStore'
import { useProjectStore } from '@store/useProjectStore'
import { importModel, MODEL_FILE_FILTERS } from '@io/importers/ModelImporter'
import type { ToolMode } from '@core/types'

const S = {
  bar: {
    height: 40, background: '#16213e', borderBottom: '1px solid #222244',
    display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, flexShrink: 0
  } as React.CSSProperties,
  sep: { width: 1, height: 24, background: '#222244', margin: '0 6px', flexShrink: 0 } as React.CSSProperties,
  spacer: { flex: 1 } as React.CSSProperties,
  btn: (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#4a9eff' : '#1f2940', color: active ? '#fff' : '#8892a0', transition: 'all 0.15s'
  }),
  toggle: (active: boolean): React.CSSProperties => ({
    padding: '3px 8px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#253550' : 'transparent', color: active ? '#4a9eff' : '#4a5060'
  })
}

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)
  const storeImport = useProjectStore((s) => s.importModel)
  const [showPrimitives, setShowPrimitives] = useState(false)

  const addPrimitive = useCallback((type: string) => {
    const fd = useProjectStore.getState().frameDimensions
    const size = fd.frameWidth * 0.6
    let geo: THREE.BufferGeometry

    switch (type) {
      case 'cube': geo = new THREE.BoxGeometry(size, size, size); break
      case 'sphere': geo = new THREE.SphereGeometry(size / 2, 24, 24); break
      case 'cylinder': geo = new THREE.CylinderGeometry(size / 3, size / 3, size, 24); break
      case 'cone': geo = new THREE.ConeGeometry(size / 3, size, 24); break
      case 'torus': geo = new THREE.TorusGeometry(size / 3, size / 8, 16, 32); break
      case 'plane': geo = new THREE.PlaneGeometry(size, size); break
      default: return
    }

    geo.translate(0, 0, fd.frameDepth * 0.3)
    geo.computeVertexNormals()
    storeImport(`${type}.primitive`, geo)
    setShowPrimitives(false)
  }, [storeImport])

  const handleImport = useCallback(async () => {
    try {
      const result = await window.api.openFile(MODEL_FILE_FILTERS as Electron.FileFilter[])
      if (!result) return
      const { geometry } = await importModel(result.path, result.data)
      storeImport(result.path, geometry)
    } catch (err) {
      console.error('[3DPF] Import failed:', err)
      alert(`Import failed: ${err instanceof Error ? err.message : err}`)
    }
  }, [storeImport])
  const snap = useToolStore((s) => s.snapEnabled)
  const grid = useToolStore((s) => s.gridVisible)
  const bv = useToolStore((s) => s.buildVolumeVisible)
  const wire = useToolStore((s) => s.wireframeOverlay)
  const toggleSnap = useToolStore((s) => s.toggleSnap)
  const toggleGrid = useToolStore((s) => s.toggleGrid)
  const toggleBV = useToolStore((s) => s.toggleBuildVolume)
  const toggleWire = useToolStore((s) => s.toggleWireframe)
  const rm = useRenderStore((s) => s.renderMode)
  const toggleRM = useRenderStore((s) => s.toggleRenderMode)

  const tools: [ToolMode, string][] = [['select','Select'],['move','Move'],['rotate','Rotate'],['scale','Scale']]

  return (
    <div style={S.bar}>
      <button style={S.btn(false)}>New</button>
      <button style={S.btn(false)}>Open</button>
      <button style={S.btn(false)}>Save</button>
      <div style={S.sep} />
      {tools.map(([mode, label]) => (
        <button key={mode} style={S.btn(activeTool === mode)} onClick={() => setTool(mode)}>{label}</button>
      ))}
      <div style={S.sep} />
      <button style={S.btn(activeTool === 'split')} onClick={() => setTool('split')}>Split</button>
      <button style={S.btn(false)} onClick={handleImport}>Import</button>
      <div style={{ position: 'relative' }}>
        <button style={S.btn(showPrimitives)} onClick={() => setShowPrimitives(p => !p)}>+ Prim</button>
        {showPrimitives && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
            background: '#1a1a2e', border: '1px solid #333355', borderRadius: 4,
            padding: 4, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100
          }}>
            {['cube', 'sphere', 'cylinder', 'cone', 'torus'].map(t => (
              <button key={t} onClick={() => addPrimitive(t)} style={{
                padding: '5px 12px', fontSize: 11, border: 'none', borderRadius: 3,
                cursor: 'pointer', background: 'transparent', color: '#c0c8d8',
                textAlign: 'left', textTransform: 'capitalize'
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#253550')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >{t}</button>
            ))}
          </div>
        )}
      </div>
      <div style={S.spacer} />
      <button style={S.toggle(snap)} onClick={toggleSnap}>Snap</button>
      <button style={S.toggle(grid)} onClick={toggleGrid}>Grid</button>
      <button style={S.toggle(bv)} onClick={toggleBV}>Build Vol</button>
      <button style={S.toggle(wire)} onClick={toggleWire}>Wire</button>
      <div style={S.sep} />
      <button style={{ ...S.btn(rm === 'pathtraced'), background: rm === 'pathtraced' ? '#a78bfa' : '#1f2940' }} onClick={toggleRM}>
        {rm === 'pbr' ? 'PBR' : 'PathTrace'}
      </button>
    </div>
  )
}
