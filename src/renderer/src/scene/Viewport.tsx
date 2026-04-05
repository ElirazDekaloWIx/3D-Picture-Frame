/**
 * Main 3D viewport - demand rendering (renders only on change, no flickering).
 */

import { useMemo } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { FrameScene } from './FrameScene'
import { BuildVolumeGhost } from './BuildVolumeGhost'
import { TransformGizmo } from './TransformGizmo'
import { SplitPlaneVisual } from './SplitPlaneVisual'
import { useToolStore } from '@store/useToolStore'
import { useSelectionStore } from '@store/useSelectionStore'

function StaticGrid() {
  const geo = useMemo(() => {
    const pts: number[] = []
    for (let i = -500; i <= 500; i += 50) {
      pts.push(-500, 0, i, 500, 0, i)
      pts.push(i, 0, -500, i, 0, 500)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#505050" transparent opacity={0.35} />
    </lineSegments>
  )
}

export function Viewport() {
  const gridVisible = useToolStore((s) => s.gridVisible)
  const buildVolumeVisible = useToolStore((s) => s.buildVolumeVisible)
  const deselectAll = useSelectionStore((s) => s.deselectAll)

  return (
    <div style={{ flex: 1, position: 'relative', minWidth: 400, minHeight: 0 }}>
      <Canvas
        camera={{ position: [400, 300, 450], fov: 35, near: 0.1, far: 10000 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        frameloop="demand"
        style={{ background: '#3a3a3a' }}
        onPointerMissed={deselectAll}
      >
        {gridVisible && <StaticGrid />}
        {buildVolumeVisible && <BuildVolumeGhost />}
        <FrameScene />
        <TransformGizmo />
        <SplitPlaneVisual />

        <OrbitControls makeDefault enableDamping={false} onChange={() => invalidate()} />
        <GizmoHelper alignment="top-right" margin={[80, 80]} onUpdate={() => invalidate()}>
          <GizmoViewport axisColors={['#ff4444', '#44ff44', '#4488ff']} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11, color: '#666', pointerEvents: 'none' }}>
        Scroll to zoom | Middle-drag to orbit | Shift+Middle to pan
      </div>
    </div>
  )
}
