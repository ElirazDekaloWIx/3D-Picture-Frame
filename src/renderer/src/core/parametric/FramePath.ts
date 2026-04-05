/**
 * FramePath - builds 2D closed paths for frame shapes.
 * Each path is a set of 2D points that define the frame outline.
 * Profile is extruded along this path to create the 3D frame.
 */

import * as THREE from 'three'
import type { FramePath, FramePathPoint, FrameDimensions } from '../types'

/**
 * Create a rectangle path from frame dimensions.
 */
export function createRectanglePath(dims: FrameDimensions): FramePathPoint[] {
  const hw = (dims.pictureWidth + dims.frameWidth * 2) / 2
  const hh = (dims.pictureHeight + dims.frameWidth * 2) / 2
  // CCW order (same as polygon) - important for consistent miter direction
  return [
    { x: -hw, y: hh },   // TL
    { x: -hw, y: -hh },  // BL
    { x: hw, y: -hh },   // BR
    { x: hw, y: hh },    // TR
  ]
}

/**
 * Create a circle path.
 */
export function createCirclePath(radius: number, segments = 64): FramePathPoint[] {
  const pts: FramePathPoint[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius })
  }
  return pts
}

/**
 * Create an ellipse path.
 */
export function createEllipsePath(rx: number, ry: number, segments = 64): FramePathPoint[] {
  const pts: FramePathPoint[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry })
  }
  return pts
}

/**
 * Create a regular polygon path.
 */
export function createPolygonPath(sides: number, radius: number): FramePathPoint[] {
  const pts: FramePathPoint[] = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2 // start from top
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius })
  }
  return pts
}

/**
 * Convert a FramePath to a THREE.js curve for extrusion.
 * Returns a CatmullRomCurve3 (for smooth paths) or series of LineCurve3 (for polygons/rectangles).
 */
export function pathToCurve3(points: FramePathPoint[], smooth: boolean): THREE.Curve<THREE.Vector3> {
  const pts3 = points.map(p => new THREE.Vector3(p.x, p.y, 0))

  if (smooth) {
    // Close the loop by adding first point at the end
    pts3.push(pts3[0].clone())
    return new THREE.CatmullRomCurve3(pts3, false, 'catmullrom', 0.5)
  }

  // For straight-edge paths (rectangle, polygon), use CurvePath with lines
  const curvePath = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 0; i < pts3.length; i++) {
    const next = pts3[(i + 1) % pts3.length]
    curvePath.add(new THREE.LineCurve3(pts3[i], next))
  }
  return curvePath
}

/**
 * Sample a curve at evenly spaced intervals.
 * Returns positions, tangents, and normals for each sample.
 */
export function sampleCurve(
  curve: THREE.Curve<THREE.Vector3>,
  numSamples: number
): { positions: THREE.Vector3[]; tangents: THREE.Vector3[]; normals: THREE.Vector3[] } {
  const positions: THREE.Vector3[] = []
  const tangents: THREE.Vector3[] = []
  const normals: THREE.Vector3[] = []

  const up = new THREE.Vector3(0, 0, 1) // Z is "up" for 2D path in XY plane

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples
    const pos = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).normalize()

    // Normal = cross(tangent, up) → points outward from path center
    const normal = new THREE.Vector3().crossVectors(tan, up).normalize()

    positions.push(pos)
    tangents.push(tan)
    normals.push(normal)
  }

  return { positions, tangents, normals }
}

/**
 * Build path points from a FramePath config + dimensions.
 */
export function buildPathPoints(path: FramePath, dims: FrameDimensions): FramePathPoint[] {
  const avgRadius = (dims.pictureWidth + dims.pictureHeight) / 4 + dims.frameWidth

  switch (path.type) {
    case 'rectangle':
      return createRectanglePath(dims)
    case 'circle':
      return createCirclePath(avgRadius)
    case 'ellipse':
      return createEllipsePath(
        path.radiusX ?? (dims.pictureWidth / 2 + dims.frameWidth),
        path.radiusY ?? (dims.pictureHeight / 2 + dims.frameWidth)
      )
    case 'polygon':
      return createPolygonPath(path.sides ?? 6, avgRadius)
    case 'freehand':
      return path.controlPoints.length >= 3 ? path.controlPoints : createRectanglePath(dims)
    case 'svg':
      return path.controlPoints.length >= 3 ? path.controlPoints : createRectanglePath(dims)
    default:
      return createRectanglePath(dims)
  }
}
