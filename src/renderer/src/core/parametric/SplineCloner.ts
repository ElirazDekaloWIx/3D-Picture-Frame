/**
 * SplineCloner - clones geometry along a frame path.
 * Places N copies evenly spaced, oriented to follow the path.
 */

import * as THREE from 'three'
import type { FramePathPoint } from '../types'

export interface ClonerSettings {
  count: number
  offset: number
  rotationOffset: number
  scale: number
  zOffset: number
  stepRotation: number       // incremental rotation per clone (degrees)
  stepScale: number          // incremental scale change per clone (0 = none)
  flipAlternate: boolean
  randomSeed: number
  randomPosition: number
  randomRotation: number
  randomScale: number
  randomSpacing: number      // 0 = even, 1 = fully random positions
  randomZ: number
}

export const DEFAULT_CLONER_SETTINGS: ClonerSettings = {
  count: 8,
  offset: 0,
  rotationOffset: 0,
  scale: 1,
  zOffset: 0,
  randomSeed: 42,
  randomPosition: 0,
  randomRotation: 0,
  randomScale: 0,
}

/** Simple seeded random */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/**
 * Compute clone positions and orientations along a closed path.
 */
export function computeCloneTransforms(
  pathPoints: FramePathPoint[],
  smooth: boolean,
  settings: ClonerSettings
): THREE.Matrix4[] {
  const { count, offset, rotationOffset, scale, zOffset,
    stepRotation, stepScale, flipAlternate,
    randomSeed, randomPosition, randomRotation, randomScale, randomSpacing, randomZ } = settings
  if (count <= 0 || pathPoints.length < 2) return []

  // Build curve
  const pts3 = pathPoints.map(p => new THREE.Vector3(p.x, p.y, 0))

  let curve: THREE.Curve<THREE.Vector3>

  if (smooth) {
    pts3.push(pts3[0].clone())
    curve = new THREE.CatmullRomCurve3(pts3, false, 'catmullrom', 0.5)
  } else {
    const curvePath = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < pts3.length; i++) {
      curvePath.add(new THREE.LineCurve3(pts3[i], pts3[(i + 1) % pts3.length]))
    }
    curve = curvePath
  }

  // Center for outward direction
  let cx = 0, cy = 0
  for (const p of pathPoints) { cx += p.x; cy += p.y }
  cx /= pathPoints.length; cy /= pathPoints.length

  const matrices: THREE.Matrix4[] = []
  const rotRad = (rotationOffset * Math.PI) / 180
  const rand = seededRandom(randomSeed)

  const stepRotRad = (stepRotation * Math.PI) / 180

  for (let i = 0; i < count; i++) {
    // Position along path: even or with random spacing jitter
    let t = i / count
    if (randomSpacing > 0) {
      t += (rand() - 0.5) * randomSpacing * (1 / count)
      t = ((t % 1) + 1) % 1 // wrap around 0-1
    }

    const pos = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).normalize()

    const outward = new THREE.Vector3(-tan.y, tan.x, 0)
    if (pos.clone().add(outward).distanceTo(new THREE.Vector3(cx, cy, 0)) <
        pos.distanceTo(new THREE.Vector3(cx, cy, 0))) {
      outward.negate()
    }

    // Random offsets
    const rp = randomPosition > 0 ? (rand() - 0.5) * 2 * randomPosition : 0
    const rr = randomRotation > 0 ? (rand() - 0.5) * 2 * randomRotation * (Math.PI / 180) : 0
    const rs = randomScale > 0 ? 1 + (rand() - 0.5) * 2 * randomScale : 1
    const rz = randomZ > 0 ? (rand() - 0.5) * 2 * randomZ : 0

    // Flip alternate clones
    const flipSign = (flipAlternate && i % 2 === 1) ? -1 : 1

    const clonePos = pos.clone()
      .add(outward.clone().multiplyScalar((offset + rp) * flipSign))
      .add(new THREE.Vector3(0, 0, zOffset + rz))

    const matrix = new THREE.Matrix4()
    const up = new THREE.Vector3(0, 0, 1)
    const quat = new THREE.Quaternion()
    const lookMatrix = new THREE.Matrix4()
    lookMatrix.lookAt(new THREE.Vector3(0, 0, 0), tan, up)
    quat.setFromRotationMatrix(lookMatrix)

    // Base rotation + step rotation (accumulates per clone) + random
    const totalRot = rotRad + stepRotRad * i + rr
    if (totalRot !== 0) {
      const rotQuat = new THREE.Quaternion()
      rotQuat.setFromAxisAngle(tan, totalRot)
      quat.premultiply(rotQuat)
    }

    // Scale: base * step (accumulates) * random * flip
    const stepScaleFactor = stepScale !== 0 ? Math.pow(1 + stepScale, i) : 1
    const finalScale = scale * stepScaleFactor * rs
    matrix.compose(clonePos, quat, new THREE.Vector3(finalScale * flipSign, finalScale, finalScale))
    matrices.push(matrix)
  }

  return matrices
}

/**
 * Clone a geometry along the path, returning merged geometry.
 */
export function cloneAlongPath(
  sourceGeo: THREE.BufferGeometry,
  pathPoints: FramePathPoint[],
  smooth: boolean,
  settings: ClonerSettings
): THREE.BufferGeometry {
  const matrices = computeCloneTransforms(pathPoints, smooth, settings)
  if (matrices.length === 0) return sourceGeo.clone()

  // Merge all clones into one geometry
  const allPositions: number[] = []
  const allIndices: number[] = []
  let vertexOffset = 0

  for (const matrix of matrices) {
    const clone = sourceGeo.clone()
    clone.applyMatrix4(matrix)

    const pos = clone.attributes.position.array
    const idx = clone.index ? clone.index.array : null

    for (let v = 0; v < pos.length; v++) allPositions.push(pos[v])
    if (idx) {
      for (let j = 0; j < idx.length; j++) allIndices.push(idx[j] + vertexOffset)
    }
    vertexOffset += pos.length / 3
    clone.dispose()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3))
  if (allIndices.length > 0) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(allIndices), 1))
  geo.computeVertexNormals()

  return geo
}
