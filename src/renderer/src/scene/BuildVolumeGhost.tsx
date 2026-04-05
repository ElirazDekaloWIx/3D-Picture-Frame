/**
 * BuildVolumeGhost - wireframe box showing the printer's build volume.
 */

import { useProjectStore } from '@store/useProjectStore'

export function BuildVolumeGhost() {
  const buildVolume = useProjectStore((s) => s.printerConfig.buildVolume)

  return (
    <mesh position={[0, buildVolume.y / 2, 0]}>
      <boxGeometry args={[buildVolume.x, buildVolume.y, buildVolume.z]} />
      <meshBasicMaterial
        color="#fb923c"
        transparent
        opacity={0.08}
        wireframe
      />
    </mesh>
  )
}
