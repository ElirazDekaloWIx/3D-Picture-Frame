/**
 * CSG Operations - Dual engine:
 * 1. Try manifold-3d (watertight output, fast)
 * 2. Fallback to three-bvh-csg (accepts any geometry)
 */

import * as THREE from 'three'
import { ADDITION, SUBTRACTION, INTERSECTION, Evaluator, Brush } from 'three-bvh-csg'
import { toManifold, toThreeJS, initManifold, isManifoldReady } from './ManifoldAdapter'
import type { CSGOp } from '../types'

const bvhEvaluator = new Evaluator()

/**
 * Boolean op via manifold-3d. Throws if geometry is not manifold.
 */
async function manifoldBooleanOp(
  op: CSGOp,
  geoA: THREE.BufferGeometry,
  geoB: THREE.BufferGeometry
): Promise<THREE.BufferGeometry> {
  if (!isManifoldReady()) await initManifold()

  const a = toManifold(geoA)
  const b = toManifold(geoB)

  let result: any
  switch (op) {
    case 'union': result = a.add(b); break
    case 'subtract': result = a.subtract(b); break
    case 'intersect': result = a.intersect(b); break
  }

  const numVerts = result.numVert?.() ?? 0
  if (numVerts === 0) {
    a.delete?.(); b.delete?.(); result.delete?.()
    throw new Error('Manifold CSG produced empty result')
  }

  const geo = toThreeJS(result)
  a.delete?.(); b.delete?.(); result.delete?.()
  console.log(`[3DPF] Manifold CSG ${op}: ${geo.attributes.position.count}v`)
  return geo
}

/**
 * Boolean op via three-bvh-csg. Works with any geometry.
 */
function bvhBooleanOp(
  op: CSGOp,
  geoA: THREE.BufferGeometry,
  geoB: THREE.BufferGeometry
): THREE.BufferGeometry {
  // Debug: check bounding boxes overlap
  geoA.computeBoundingBox()
  geoB.computeBoundingBox()
  const bbA = geoA.boundingBox!
  const bbB = geoB.boundingBox!
  console.log(`[3DPF] BVH CSG bbox A: [${bbA.min.x.toFixed(1)},${bbA.min.y.toFixed(1)},${bbA.min.z.toFixed(1)}] → [${bbA.max.x.toFixed(1)},${bbA.max.y.toFixed(1)},${bbA.max.z.toFixed(1)}]`)
  console.log(`[3DPF] BVH CSG bbox B: [${bbB.min.x.toFixed(1)},${bbB.min.y.toFixed(1)},${bbB.min.z.toFixed(1)}] → [${bbB.max.x.toFixed(1)},${bbB.max.y.toFixed(1)},${bbB.max.z.toFixed(1)}]`)

  const brushA = new Brush(geoA.clone())
  const brushB = new Brush(geoB.clone())
  brushA.updateMatrixWorld()
  brushB.updateMatrixWorld()

  const operation = op === 'union' ? ADDITION : op === 'subtract' ? SUBTRACTION : INTERSECTION

  try {
    const result = bvhEvaluator.evaluate(brushA, brushB, operation)
    const geo = result.geometry

    if (!geo || geo.attributes.position.count === 0) {
      throw new Error('BVH CSG produced empty result')
    }

    geo.computeVertexNormals()
    console.log(`[3DPF] BVH CSG ${op}: ${geo.attributes.position.count}v`)
    return geo
  } catch (e) {
    throw new Error(`BVH CSG ${op} failed: ${e}`)
  }
}

/**
 * Boolean operation with automatic engine selection.
 * Tries manifold-3d first, falls back to three-bvh-csg.
 */
export async function booleanOp(
  op: CSGOp,
  geoA: THREE.BufferGeometry,
  geoB: THREE.BufferGeometry
): Promise<THREE.BufferGeometry> {
  console.log(`[3DPF] CSG ${op}: A=${geoA.attributes.position.count}v, B=${geoB.attributes.position.count}v`)

  // Try manifold-3d first
  try {
    return await manifoldBooleanOp(op, geoA, geoB)
  } catch (manifoldErr) {
    console.warn(`[3DPF] Manifold failed: ${manifoldErr}. Trying BVH fallback...`)
  }

  // Fallback to three-bvh-csg
  try {
    return bvhBooleanOp(op, geoA, geoB)
  } catch (bvhErr) {
    throw new Error(`CSG ${op} failed with both engines. Manifold: geometry may not be watertight. BVH: geometries may not overlap.`)
  }
}

/**
 * Split by plane - manifold-3d only.
 */
export async function splitByPlane(
  geometry: THREE.BufferGeometry,
  normal: [number, number, number],
  offset: number
): Promise<[THREE.BufferGeometry, THREE.BufferGeometry]> {
  if (!isManifoldReady()) await initManifold()

  const manifold = toManifold(geometry)
  const normalVec = { x: normal[0], y: normal[1], z: normal[2] }

  // Try _TrimByPlane + subtract (most reliable)
  if (typeof manifold._TrimByPlane === 'function') {
    const positive = manifold._TrimByPlane(normalVec, offset)
    const geoPos = toThreeJS(positive)
    const negative = manifold.subtract(positive)
    const geoNeg = toThreeJS(negative)
    positive.delete?.(); negative.delete?.(); manifold.delete?.()
    return [geoPos, geoNeg]
  }

  // Try _SplitByPlane
  if (typeof manifold._SplitByPlane === 'function') {
    const pair = manifold._SplitByPlane(normalVec, offset)
    const posM = pair.first ?? pair[0]
    const negM = pair.second ?? pair[1]
    if (posM && negM) {
      const geoPos = toThreeJS(posM)
      const geoNeg = toThreeJS(negM)
      posM.delete?.(); negM.delete?.(); manifold.delete?.()
      return [geoPos, geoNeg]
    }
  }

  manifold.delete?.()
  throw new Error('No split method available')
}
