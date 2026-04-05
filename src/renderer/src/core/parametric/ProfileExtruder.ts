/**
 * ProfileExtruder - extrudes a 2D profile curve along a straight path.
 * Creates actual shaped cross-sections instead of plain boxes.
 *
 * The profile is defined as points in normalized [0..1] space:
 *   x: 0 = inner edge, 1 = outer edge  (scaled by frameWidth)
 *   y: 0 = front face, 1 = back face   (scaled by frameDepth)
 */

import * as THREE from 'three'
import type { FrameProfile } from '../types'

/**
 * Create a Three.js Shape from a profile, scaled to actual dimensions.
 */
export function profileToShape(
  profile: FrameProfile,
  frameWidth: number,
  frameDepth: number
): THREE.Shape {
  const pts = profile.points
  if (pts.length < 3) {
    // Fallback to rectangle
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(frameWidth, 0)
    shape.lineTo(frameWidth, frameDepth)
    shape.lineTo(0, frameDepth)
    shape.closePath()
    return shape
  }

  const shape = new THREE.Shape()
  shape.moveTo(pts[0].x * frameWidth, pts[0].y * frameDepth)
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x * frameWidth, pts[i].y * frameDepth)
  }
  shape.closePath()
  return shape
}

/**
 * Extrude a profile along a straight line of given length.
 * The extrusion runs along Z axis, centered at origin.
 * Caller is responsible for positioning/rotating the result.
 */
export function extrudeProfile(
  profile: FrameProfile,
  length: number,
  frameWidth: number,
  frameDepth: number
): THREE.BufferGeometry {
  const shape = profileToShape(profile, frameWidth, frameDepth)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: length,
    bevelEnabled: false
  })

  // Center on all axes:
  // X: shape goes from 0..frameWidth, center it
  // Y: shape goes from 0..frameDepth, center it
  // Z: extrusion goes from 0..length, center it
  geometry.translate(-frameWidth / 2, -frameDepth / 2, -length / 2)

  geometry.computeVertexNormals()
  return geometry
}

/**
 * Create a horizontal rail (runs along X axis).
 * Profile cross-section is in YZ plane.
 */
export function createHorizontalRail(
  profile: FrameProfile,
  length: number,
  frameWidth: number,
  frameDepth: number
): THREE.BufferGeometry {
  // Extrude along Z, then rotate to run along X
  const geo = extrudeProfile(profile, length, frameWidth, frameDepth)
  // Rotate so extrusion runs along X instead of Z
  geo.rotateY(Math.PI / 2)
  return geo
}

/**
 * Create a vertical rail (runs along Y axis).
 * Profile cross-section is in XZ plane.
 */
export function createVerticalRail(
  profile: FrameProfile,
  length: number,
  frameWidth: number,
  frameDepth: number
): THREE.BufferGeometry {
  // Extrude along Z, then rotate to run along Y
  const geo = extrudeProfile(profile, length, frameWidth, frameDepth)
  // Rotate so extrusion runs along Y instead of Z
  geo.rotateX(-Math.PI / 2)
  return geo
}
