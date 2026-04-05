/**
 * SplitPlane - utilities for calculating where to split parts for printing.
 */

import * as THREE from 'three'

export interface SplitPlane {
  normal: [number, number, number]  // axis-aligned: [1,0,0], [0,1,0], or [0,0,1]
  offset: number                    // distance from origin along normal
  axis: 'x' | 'y' | 'z'
}

export interface BuildVolume {
  x: number
  y: number
  z: number
}

/**
 * Calculate the minimum number of axis-aligned split planes needed
 * to fit a bounding box within the build volume.
 */
export function calculateAutoSplitPlanes(
  bbox: THREE.Box3,
  buildVolume: BuildVolume
): SplitPlane[] {
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const center = new THREE.Vector3()
  bbox.getCenter(center)

  const planes: SplitPlane[] = []

  const axes: Array<{ axis: 'x' | 'y' | 'z'; dim: number; limit: number; centerVal: number; min: number }> = [
    { axis: 'x', dim: size.x, limit: buildVolume.x, centerVal: center.x, min: bbox.min.x },
    { axis: 'y', dim: size.y, limit: buildVolume.y, centerVal: center.y, min: bbox.min.y },
    { axis: 'z', dim: size.z, limit: buildVolume.z, centerVal: center.z, min: bbox.min.z }
  ]

  for (const { axis, dim, limit, min } of axes) {
    if (dim <= limit) continue

    // How many cuts needed?
    const numPieces = Math.ceil(dim / limit)
    const pieceSize = dim / numPieces

    const normal: [number, number, number] = [0, 0, 0]
    if (axis === 'x') normal[0] = 1
    else if (axis === 'y') normal[1] = 1
    else normal[2] = 1

    // Place cuts evenly
    for (let i = 1; i < numPieces; i++) {
      planes.push({
        normal,
        offset: min + pieceSize * i,
        axis
      })
    }
  }

  return planes
}

/**
 * Check if a bounding box fits within the build volume.
 */
export function fitsInBuildVolume(bbox: THREE.Box3, buildVolume: BuildVolume): boolean {
  const size = new THREE.Vector3()
  bbox.getSize(size)
  return size.x <= buildVolume.x && size.y <= buildVolume.y && size.z <= buildVolume.z
}

/**
 * Get which axes of a bounding box exceed the build volume.
 */
export function getExceedingAxes(
  bbox: THREE.Box3,
  buildVolume: BuildVolume
): Array<{ axis: 'x' | 'y' | 'z'; size: number; limit: number; excess: number }> {
  const size = new THREE.Vector3()
  bbox.getSize(size)

  const results: Array<{ axis: 'x' | 'y' | 'z'; size: number; limit: number; excess: number }> = []

  if (size.x > buildVolume.x) results.push({ axis: 'x', size: size.x, limit: buildVolume.x, excess: size.x - buildVolume.x })
  if (size.y > buildVolume.y) results.push({ axis: 'y', size: size.y, limit: buildVolume.y, excess: size.y - buildVolume.y })
  if (size.z > buildVolume.z) results.push({ axis: 'z', size: size.z, limit: buildVolume.z, excess: size.z - buildVolume.z })

  return results
}
