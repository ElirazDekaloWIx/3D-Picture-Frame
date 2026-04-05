/**
 * Frame Generator - Beam + Miter Cut approach.
 *
 * For polygonal frames (rectangle, hexagon, etc.):
 *   1. Each edge = a straight beam with profile cross-section
 *   2. Beam ends are miter-cut at half the corner angle
 *   3. Beams placed at correct positions and orientations
 *
 * For curved frames (circle, ellipse, freehand):
 *   SplineExtruder as before
 */

import * as THREE from 'three'
import type { FrameDimensions, FrameProfile, FrameSymmetry, CornerSettings, FramePath, PartNode } from '../types'
import { createPartNode } from '../PartTree'
import { buildPathPoints, createRectanglePath } from './FramePath'
import { extrudeProfileAlongPath } from './SplineExtruder'

export interface FrameGeneratorResult {
  parts: PartNode[]
  geometries: Map<string, THREE.BufferGeometry>
}

/**
 * Compute miter angle at vertex B, given edges A→B and B→C.
 * Returns the angle (in radians) by which to skew the beam end.
 * For a 90° corner (rectangle): returns π/4 (45°)
 * For a 120° corner (hexagon): returns π/6 (30°)
 */
/**
 * Compute miter angle at vertex B, given edges A→B and B→C.
 *
 * The miter angle determines how much to shift the profile vertices
 * along the beam direction at the beam's end to create the angled cut.
 *
 * shift = widthOffset * tan(miterAngle)
 *
 * For rectangle (interior angle = 90°): miterAngle = 45° → tan = 1
 * For hexagon (interior angle = 120°): miterAngle = 30° → tan = 0.577
 */
function computeMiterAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const inX = b.x - a.x, inY = b.y - a.y
  const outX = c.x - b.x, outY = c.y - b.y
  const inLen = Math.sqrt(inX * inX + inY * inY)
  const outLen = Math.sqrt(outX * outX + outY * outY)
  if (inLen < 0.001 || outLen < 0.001) return 0

  const inNx = inX / inLen, inNy = inY / inLen
  const outNx = outX / outLen, outNy = outY / outLen

  // The angle between edge directions (exterior/turning angle)
  const dot = inNx * outNx + inNy * outNy
  const exteriorAngle = Math.acos(Math.max(-1, Math.min(1, dot)))

  // Miter angle = half the exterior angle
  // Rectangle: exterior = 90° → miter = 45° → tan(45°) = 1.0
  // Hexagon:   exterior = 60° → miter = 30° → tan(30°) = 0.577
  // Triangle:  exterior = 120° → miter = 60° → tan(60°) = 1.73
  const miterAngle = exteriorAngle / 2

  return miterAngle
}

function addPart(parts: PartNode[], geos: Map<string, THREE.BufferGeometry>,
  name: string, type: PartNode['type'], geo: THREE.BufferGeometry, gen: string, params: Record<string, string>) {
  const p = createPartNode({ name, type,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    geometry: { kind: 'parametric', generator: gen, params }
  })
  parts.push(p); geos.set(p.id, geo)
}

/**
 * Build a single beam with profile, positioned along an edge.
 * The beam runs from point A to point B.
 * Profile u (0→1) maps to width (perpendicular to beam, outward from center).
 * Profile v (0→1) maps to depth (along Z).
 * Miter cuts are applied at both ends.
 *
 * @param miterAngleStart - angle to cut at start end (radians from perpendicular)
 * @param miterAngleEnd - angle to cut at end end
 */
function buildMiteredBeam(
  profile: FrameProfile,
  start: { x: number; y: number },
  end: { x: number; y: number },
  fw: number, fd: number,
  cx: number, cy: number,
  miterAngleStart: number,
  miterAngleEnd: number
): THREE.BufferGeometry {
  const pts = profile.points
  const isFlat = pts.length < 3 || profile.preset === 'flat'
  const profilePts = isFlat
    ? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    : pts

  const n = profilePts.length

  // Beam direction
  const dx = end.x - start.x, dy = end.y - start.y
  const beamLen = Math.sqrt(dx * dx + dy * dy)
  const dirX = dx / beamLen, dirY = dy / beamLen

  // Outward direction (perpendicular to beam, away from center)
  let outX = -dirY, outY = dirX
  const midX = (start.x + end.x) / 2, midY = (start.y + end.y) / 2
  if ((midX + outX - cx) * (midX - cx) + (midY + outY - cy) * (midY - cy) < 0) {
    outX = -outX; outY = -outY
  }

  const positions: number[] = []
  const indices: number[] = []

  // Two rings: at start and end of beam
  for (let ring = 0; ring < 2; ring++) {
    const baseX = ring === 0 ? start.x : end.x
    const baseY = ring === 0 ? start.y : end.y
    const miterAngle = ring === 0 ? miterAngleStart : miterAngleEnd

    for (let i = 0; i < n; i++) {
      const u = profilePts[i].x // 0=inner, 1=outer
      const v = profilePts[i].y // 0=front, 1=back

      // Width offset (perpendicular to beam)
      const wo = (u - 0.5) * fw

      // Miter cut: shift along beam direction so adjacent beams meet exactly
      const miterShift = (ring === 0 ? 1 : -1) * wo * Math.tan(miterAngle)

      // Add a tiny extension (0.1mm) to ensure overlap instead of gap
      const overlap = (ring === 0 ? -0.1 : 0.1)

      const px = baseX + outX * wo + dirX * (miterShift + overlap)
      const py = baseY + outY * wo + dirY * (miterShift + overlap)
      const pz = -(v - 0.5) * fd

      positions.push(px, py, pz)
    }
  }

  // Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    indices.push(i, next, n + next, i, n + next, n + i)
  }

  // No caps - beams meet at mitered joints, caps would create visible artifacts

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  geo.computeVertexNormals()
  return geo
}

/**
 * Generate frame from polygon path (rectangle, hexagon, etc.)
 * Each edge → mitered beam.
 */
function generatePolygonFrame(
  dims: FrameDimensions, profile: FrameProfile, pathPts: { x: number; y: number }[]
): FrameGeneratorResult {
  const { frameWidth: fw, frameDepth: fd, backThickness: bt, backOverlap: bo } = dims
  const n = pathPts.length
  const parts: PartNode[] = [], geos = new Map<string, THREE.BufferGeometry>()

  // Center
  let cx = 0, cy = 0
  for (const p of pathPts) { cx += p.x; cy += p.y }
  cx /= n; cy /= n

  // Compute miter angle at each vertex
  // For a regular polygon: miter = π/2 - interior_angle/2
  // For irregular: compute from actual edge directions using dot product
  for (let i = 0; i < n; i++) {
    const prev = pathPts[(i - 1 + n) % n]
    const curr = pathPts[i]
    const next = pathPts[(i + 1) % n]
    const next2 = pathPts[(i + 2) % n]

    // Miter angle at start of this edge (= at vertex 'curr')
    // = half the turn angle between incoming and outgoing edges
    const miterStart = computeMiterAngle(prev, curr, next)
    const miterEnd = computeMiterAngle(curr, next, next2)

    const beam = buildMiteredBeam(profile, curr, next, fw, fd, cx, cy, miterStart, miterEnd)
    addPart(parts, geos, `Edge ${i + 1}`, 'frame-rail', beam, 'frame-rail', { edge: String(i) })
  }

  // Back plate - shrunk inward by (frameWidth - backOverlap)
  const shrinkAmount = Math.max(0, fw - (bo ?? 5))
  const backPts = pathPts.map(pt => {
    const dx = pt.x - cx, dy = pt.y - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.001) return pt
    const inner = Math.max(1, len - shrinkAmount) / len
    return { x: cx + dx * inner, y: cy + dy * inner }
  })
  const backShape = new THREE.Shape()
  backShape.moveTo(backPts[0].x, backPts[0].y)
  for (let i = 1; i < backPts.length; i++) backShape.lineTo(backPts[i].x, backPts[i].y)
  backShape.closePath()
  const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: bt, bevelEnabled: false })
  backGeo.translate(0, 0, -(fd / 2 + bt))
  addPart(parts, geos, 'Back', 'frame-back', backGeo, 'frame-back', {})

  return { parts, geometries: geos }
}

/**
 * Generate frame from smooth path (circle, ellipse, freehand).
 */
function generateSmoothFrame(
  dims: FrameDimensions, profile: FrameProfile, pathPts: { x: number; y: number }[]
): FrameGeneratorResult {
  const { frameWidth: fw, frameDepth: fd, backThickness: bt, backOverlap: bo } = dims
  const parts: PartNode[] = [], geos = new Map<string, THREE.BufferGeometry>()

  const frameGeo = extrudeProfileAlongPath(pathPts, profile, fw, fd, true, 128)
  addPart(parts, geos, 'Frame', 'frame-rail', frameGeo, 'spline-frame', {})

  // Back plate
  let cx = 0, cy = 0
  for (const p of pathPts) { cx += p.x; cy += p.y }
  cx /= pathPts.length; cy /= pathPts.length
  const shrinkAmount = Math.max(0, fw - (bo ?? 5))
  const backPts = pathPts.map(pt => {
    const dx = pt.x - cx, dy = pt.y - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.001) return pt
    const inner = Math.max(1, len - shrinkAmount) / len
    return { x: cx + dx * inner, y: cy + dy * inner }
  })
  const backShape = new THREE.Shape()
  backShape.moveTo(backPts[0].x, backPts[0].y)
  for (let i = 1; i < backPts.length; i++) backShape.lineTo(backPts[i].x, backPts[i].y)
  backShape.closePath()
  const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: bt, bevelEnabled: false })
  backGeo.translate(0, 0, -(fd / 2 + bt))
  addPart(parts, geos, 'Back', 'frame-back', backGeo, 'frame-back', {})

  return { parts, geometries: geos }
}

export function generateFrame(
  dims: FrameDimensions, profile: FrameProfile,
  symmetry?: FrameSymmetry, cornerSettings?: CornerSettings, framePath?: FramePath
): FrameGeneratorResult {
  const fp = framePath ?? { type: 'rectangle' as const, controlPoints: [], useCorners: false }
  const pathPts = buildPathPoints(fp, dims)
  const isSmooth = fp.type === 'circle' || fp.type === 'ellipse' || fp.type === 'freehand'

  return isSmooth
    ? generateSmoothFrame(dims, profile, pathPts)
    : generatePolygonFrame(dims, profile, pathPts)
}

export function regenerateFrameGeometries(
  parts: Record<string, PartNode>, childIds: string[],
  dims: FrameDimensions, profile: FrameProfile,
  symmetry?: FrameSymmetry, cornerSettings?: CornerSettings, framePath?: FramePath
): { geometries: Map<string, THREE.BufferGeometry>; positions: Map<string, [number, number, number]> } {
  const result = generateFrame(dims, profile, symmetry, cornerSettings, framePath)
  const geometries = new Map<string, THREE.BufferGeometry>()
  const positions = new Map<string, [number, number, number]>()
  const nameToGeo = new Map<string, THREE.BufferGeometry>()
  for (const np of result.parts) { const g = result.geometries.get(np.id); if (g) nameToGeo.set(np.name, g) }
  for (const id of childIds) { const p = parts[id]; if (p) { const g = nameToGeo.get(p.name); if (g) { geometries.set(id, g); positions.set(id, [0, 0, 0]) } } }
  return { geometries, positions }
}
