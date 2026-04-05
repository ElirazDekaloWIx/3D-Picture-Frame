/**
 * SplineExtruder - extrudes profile along a closed 2D path.
 *
 * Key insight for corners:
 * At polygon corners, we need TWO rings at the same position:
 * - One with the OUTGOING edge's outward normal
 * - One with the INCOMING edge's outward normal
 * This creates a sharp crease in the geometry at the corner.
 */

import * as THREE from 'three'
import type { FrameProfile, FramePathPoint } from '../types'

interface SamplePoint {
  pos: THREE.Vector3
  outward: THREE.Vector3
}

/**
 * Compute outward normal for an edge (perpendicular, pointing away from center).
 */
function edgeOutward(a: FramePathPoint, b: FramePathPoint, cx: number, cy: number): THREE.Vector3 {
  const dx = b.x - a.x, dy = b.y - a.y
  let nx = -dy, ny = dx
  const nl = Math.sqrt(nx * nx + ny * ny)
  if (nl > 0) { nx /= nl; ny /= nl }
  // Ensure outward points away from center
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2
  if ((midX + nx - cx) * (midX - cx) + (midY + ny - cy) * (midY - cy) < 0) {
    nx = -nx; ny = -ny
  }
  return new THREE.Vector3(nx, ny, 0)
}

/**
 * Sample a sharp (polygon/rectangle) path.
 * At each corner: TWO samples at same position with different normals → sharp crease.
 */
function sampleSharpPath(points: FramePathPoint[], samplesPerEdge: number): SamplePoint[] {
  const n = points.length
  let cx = 0, cy = 0
  for (const p of points) { cx += p.x; cy += p.y }
  cx /= n; cy /= n

  const samples: SamplePoint[] = []

  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const outward = edgeOutward(a, b, cx, cy)

    // First sample of this edge (at corner position, with THIS edge's normal)
    // This creates a sharp crease with the previous edge's last sample
    for (let j = 0; j <= samplesPerEdge; j++) {
      const t = j / samplesPerEdge
      // Don't add the last point (j=samplesPerEdge) because the next edge starts there
      if (j === samplesPerEdge) continue
      samples.push({
        pos: new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 0),
        outward
      })
    }
  }

  return samples
}

/**
 * Sample a smooth (circle/freehand) path.
 */
function sampleSmoothPath(points: FramePathPoint[], totalSamples: number): SamplePoint[] {
  const pts3 = points.map(p => new THREE.Vector3(p.x, p.y, 0))
  pts3.push(pts3[0].clone())
  const curve = new THREE.CatmullRomCurve3(pts3, false, 'catmullrom', 0.5)

  let cx = 0, cy = 0
  for (const p of points) { cx += p.x; cy += p.y }
  cx /= points.length; cy /= points.length
  const center = new THREE.Vector3(cx, cy, 0)

  const samples: SamplePoint[] = []
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples
    const pos = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).normalize()
    const outward = new THREE.Vector3(-tan.y, tan.x, 0)
    if (pos.clone().add(outward).distanceTo(center) < pos.distanceTo(center)) outward.negate()
    samples.push({ pos, outward })
  }

  return samples
}

export function extrudeProfileAlongPath(
  pathPoints: FramePathPoint[],
  profile: FrameProfile,
  frameWidth: number,
  frameDepth: number,
  smooth: boolean,
  segments?: number
): THREE.BufferGeometry {
  const pts = profile.points
  const isFlat = pts.length < 3 || profile.preset === 'flat'
  const profilePts = isFlat
    ? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    : pts

  const numProfilePts = profilePts.length

  const samples = smooth
    ? sampleSmoothPath(pathPoints, segments ?? 128)
    : sampleSharpPath(pathPoints, Math.max(2, Math.round((segments ?? 32) / pathPoints.length)))

  const actualSegments = samples.length
  const positions: number[] = []
  const indices: number[] = []

  // Build vertex rings
  for (let seg = 0; seg < actualSegments; seg++) {
    const { pos, outward } = samples[seg]
    for (let i = 0; i < numProfilePts; i++) {
      const u = profilePts[i].x
      const v = profilePts[i].y
      const wo = (u - 0.5) * frameWidth
      const d = (v - 0.5) * frameDepth
      const vx = pos.x + outward.x * wo
      const vy = pos.y + outward.y * wo
      const vz = -d
      positions.push(vx, vy, vz)
    }
  }

  // Connect rings (closed loop)
  for (let seg = 0; seg < actualSegments; seg++) {
    const nextSeg = (seg + 1) % actualSegments
    const rA = seg * numProfilePts
    const rB = nextSeg * numProfilePts
    for (let i = 0; i < numProfilePts; i++) {
      const next = (i + 1) % numProfilePts
      indices.push(rA + i, rA + next, rB + next, rA + i, rB + next, rB + i)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  geo.computeVertexNormals()

  return geo
}
