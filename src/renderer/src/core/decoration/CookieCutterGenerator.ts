/**
 * CookieCutterGenerator - cuts a model's silhouette from a frame surface.
 *
 * Algorithm:
 * 1. Get source mesh bounding box (projected onto XY)
 * 2. Create an extrusion of that outline through the frame depth
 * 3. Return the extrusion geometry (caller will CSG subtract from frame)
 */

import * as THREE from 'three'
import type { CookieCutterParams } from '../types'

/**
 * Generate a cookie cutter geometry from a source mesh.
 * The cutter is an extruded bounding box of the source, suitable for CSG subtract.
 *
 * @param sourceGeometry - the decoration model to cut from
 * @param params - cut depth, offset, draft angle
 * @returns geometry to subtract from the frame
 */
export function generateCookieCutter(
  sourceGeometry: THREE.BufferGeometry,
  params: CookieCutterParams
): THREE.BufferGeometry {
  const { cutDepth, offset } = params

  sourceGeometry.computeBoundingBox()
  const bbox = sourceGeometry.boundingBox!
  const center = new THREE.Vector3()
  bbox.getCenter(center)
  const size = new THREE.Vector3()
  bbox.getSize(size)

  // Create a box that covers the XY silhouette of the source, extruded through cutDepth
  const cutterWidth = size.x + offset * 2
  const cutterHeight = size.y + offset * 2

  const geo = new THREE.BoxGeometry(cutterWidth, cutterHeight, cutDepth)
  geo.translate(center.x, center.y, 0) // Center on the source model

  return geo
}

/**
 * Advanced cookie cutter - uses actual mesh outline (convex hull of projection).
 * For v2 - currently uses bounding box approach above.
 */
export function generateConvexCookieCutter(
  sourceGeometry: THREE.BufferGeometry,
  params: CookieCutterParams
): THREE.BufferGeometry {
  const { cutDepth, offset } = params

  // Project all vertices onto XY plane
  const positions = sourceGeometry.attributes.position
  const points2D: THREE.Vector2[] = []

  for (let i = 0; i < positions.count; i++) {
    points2D.push(new THREE.Vector2(positions.getX(i), positions.getY(i)))
  }

  // Compute convex hull
  const hull = computeConvexHull(points2D)

  if (hull.length < 3) {
    // Fallback to bbox
    return generateCookieCutter(sourceGeometry, params)
  }

  // Create shape from hull + offset
  const shape = new THREE.Shape()
  const offsetHull = offsetPolygon(hull, offset)

  shape.moveTo(offsetHull[0].x, offsetHull[0].y)
  for (let i = 1; i < offsetHull.length; i++) {
    shape.lineTo(offsetHull[i].x, offsetHull[i].y)
  }
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: cutDepth,
    bevelEnabled: false
  })
  geo.translate(0, 0, -cutDepth / 2)

  return geo
}

/** Simple 2D convex hull (Graham scan) */
function computeConvexHull(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length < 3) return points

  // Find bottom-most point
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x)
  const pivot = sorted[0]

  // Sort by polar angle
  sorted.sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x)
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x)
    return angleA - angleB
  })

  const stack: THREE.Vector2[] = [sorted[0], sorted[1]]
  for (let i = 2; i < sorted.length; i++) {
    while (stack.length > 1) {
      const top = stack[stack.length - 1]
      const below = stack[stack.length - 2]
      const cross = (top.x - below.x) * (sorted[i].y - below.y) - (top.y - below.y) * (sorted[i].x - below.x)
      if (cross <= 0) stack.pop()
      else break
    }
    stack.push(sorted[i])
  }

  return stack
}

/** Offset a polygon outward by distance */
function offsetPolygon(points: THREE.Vector2[], dist: number): THREE.Vector2[] {
  if (dist === 0) return points

  const result: THREE.Vector2[] = []
  const n = points.length

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]

    // Edge normals
    const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x, dy2 = next.y - curr.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

    // Average normal
    const nx = (-dy1 / len1 + -dy2 / len2) / 2
    const ny = (dx1 / len1 + dx2 / len2) / 2
    const nl = Math.sqrt(nx * nx + ny * ny)

    result.push(new THREE.Vector2(curr.x + nx / nl * dist, curr.y + ny / nl * dist))
  }

  return result
}
