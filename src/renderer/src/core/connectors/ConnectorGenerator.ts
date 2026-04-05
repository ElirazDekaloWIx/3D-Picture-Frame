/**
 * ConnectorGenerator - creates male/female connector geometry pairs.
 * All connectors use simple box-based shapes for reliable CSG operations.
 * Generated centered at origin, facing +Y direction (away from split face).
 */

import * as THREE from 'three'
import type { ConnectorType, ConnectorParams } from '../types'

export interface ConnectorPair {
  male: THREE.BufferGeometry
  female: THREE.BufferGeometry
}

/** Snap-fit: rectangular tab with wider head */
function generateSnapFit(params: ConnectorParams): ConnectorPair {
  const { size, tolerance } = params
  const w = size
  const h = size * 0.6
  const d = size * 0.8
  const headExtra = Math.max(size * 0.25, 1.5) // minimum 1.5mm for CSG reliability

  // Male: shaft + wider head
  const shaft = new THREE.BoxGeometry(w, d * 0.6, h)
  shaft.translate(0, d * 0.3, 0)
  const head = new THREE.BoxGeometry(w + headExtra * 2, d * 0.4, h)
  head.translate(0, d * 0.8, 0)

  // Merge into one geometry
  const male = mergeGeometries([shaft, head])

  // Female: slot matching the head size + tolerance
  const t = tolerance
  const female = new THREE.BoxGeometry(w + headExtra * 2 + t * 2, d + t, h + t * 2)
  female.translate(0, (d + t) / 2, 0)

  return { male, female }
}

/** Dovetail: trapezoidal tab */
function generateDovetail(params: ConnectorParams): ConnectorPair {
  const { size, tolerance, angle = 15 } = params
  const w = size
  const h = size * 0.6
  const d = size * 0.8
  const spread = Math.tan((angle * Math.PI) / 180) * d

  const maleShape = new THREE.Shape()
  maleShape.moveTo(-w / 2, 0)
  maleShape.lineTo(-w / 2 - spread, d)
  maleShape.lineTo(w / 2 + spread, d)
  maleShape.lineTo(w / 2, 0)
  maleShape.closePath()

  const male = new THREE.ExtrudeGeometry(maleShape, { depth: h, bevelEnabled: false })
  male.translate(0, 0, -h / 2)
  male.computeVertexNormals()

  const t = tolerance
  const femaleShape = new THREE.Shape()
  femaleShape.moveTo(-w / 2 - t, -t)
  femaleShape.lineTo(-w / 2 - spread - t, d + t)
  femaleShape.lineTo(w / 2 + spread + t, d + t)
  femaleShape.lineTo(w / 2 + t, -t)
  femaleShape.closePath()

  const female = new THREE.ExtrudeGeometry(femaleShape, { depth: h + t * 2, bevelEnabled: false })
  female.translate(0, 0, -(h + t * 2) / 2)
  female.computeVertexNormals()

  return { male, female }
}

/** Pin + hole: cylindrical alignment */
function generatePinHole(params: ConnectorParams): ConnectorPair {
  const { size, tolerance, pinDiameter } = params
  const radius = (pinDiameter ?? size * 0.4) / 2
  const depth = size * 0.8

  const male = new THREE.CylinderGeometry(radius, radius, depth, 16)
  male.rotateX(-Math.PI / 2)
  male.translate(0, depth / 2, 0)
  male.computeVertexNormals()

  const holeR = radius + tolerance
  const female = new THREE.CylinderGeometry(holeR, holeR, depth + tolerance, 16)
  female.rotateX(-Math.PI / 2)
  female.translate(0, (depth + tolerance) / 2, 0)
  female.computeVertexNormals()

  return { male, female }
}

/** Mortise-tenon: rectangular peg and hole */
function generateMortiseTenon(params: ConnectorParams): ConnectorPair {
  const { size, tolerance, depth } = params
  const d = depth ?? size * 0.8
  const w = size * 0.6
  const h = size * 0.4

  const male = new THREE.BoxGeometry(w, d, h)
  male.translate(0, d / 2, 0)

  const t = tolerance
  const female = new THREE.BoxGeometry(w + t * 2, d + t, h + t * 2)
  female.translate(0, (d + t) / 2, 0)

  return { male, female }
}

export function generateConnector(type: ConnectorType, params: ConnectorParams): ConnectorPair {
  switch (type) {
    case 'snap-fit': return generateSnapFit(params)
    case 'dovetail': return generateDovetail(params)
    case 'pin-hole': return generatePinHole(params)
    case 'mortise-tenon': return generateMortiseTenon(params)
  }
}

/** Merge multiple geometries into one */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0, totalIdx = 0
  for (const g of geos) {
    totalVerts += g.attributes.position.count
    totalIdx += g.index ? g.index.count : g.attributes.position.count
  }

  const positions = new Float32Array(totalVerts * 3)
  const indices = new Uint32Array(totalIdx)
  let vOff = 0, iOff = 0, iBase = 0

  for (const g of geos) {
    const pos = g.attributes.position.array
    positions.set(pos, vOff)
    vOff += pos.length

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOff++] = g.index.array[i] + iBase
      }
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) {
        indices[iOff++] = i + iBase
      }
    }
    iBase += g.attributes.position.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  merged.computeVertexNormals()
  return merged
}
