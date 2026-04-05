/**
 * AutoSplitter - splits geometry into printable pieces using Manifold CSG.
 */

import * as THREE from 'three'
import { splitByPlane, booleanOp } from '../csg/CSGOperations'
import { generateConnector } from '../connectors/ConnectorGenerator'
import { calculateAutoSplitPlanes, type SplitPlane, type BuildVolume } from './SplitPlane'
import type { ConnectorType, ConnectorParams, SplitInfo } from '../types'

export interface SplitResult {
  geometry: THREE.BufferGeometry
  splitInfo: SplitInfo
  label: string
}

/**
 * Position a connector geometry at the split plane, oriented correctly.
 */
function positionConnector(
  geo: THREE.BufferGeometry,
  normal: [number, number, number],
  offset: number
): THREE.BufferGeometry {
  const g = geo.clone()
  // Default connector faces +Y. Rotate to face the split normal.
  const [nx, ny, nz] = normal
  if (nx === 1) g.rotateZ(-Math.PI / 2)
  else if (nx === -1) g.rotateZ(Math.PI / 2)
  else if (ny === 1) { /* already facing +Y */ }
  else if (ny === -1) g.rotateX(Math.PI)
  else if (nz === 1) g.rotateX(Math.PI / 2)
  else if (nz === -1) g.rotateX(-Math.PI / 2)

  // Translate to split plane
  g.translate(nx * offset, ny * offset, nz * offset)
  return g
}

/**
 * Split geometry by a plane and optionally attach connectors.
 */
export async function splitWithConnectors(
  geometry: THREE.BufferGeometry,
  plane: SplitPlane,
  connectorType: ConnectorType,
  connectorParams: ConnectorParams,
  originalPartId: string
): Promise<[SplitResult, SplitResult]> {
  // 1. Split
  const [geoPos, geoNeg] = await splitByPlane(geometry, plane.normal, plane.offset)

  // 2. Try to add connectors via CSG
  let resultPos = geoPos
  let resultNeg = geoNeg
  let connectorAdded = false

  try {
    const connector = generateConnector(connectorType, connectorParams)
    const maleGeo = positionConnector(connector.male, plane.normal, plane.offset)
    const femaleGeo = positionConnector(connector.female, plane.normal, plane.offset)

    resultPos = await booleanOp('union', geoPos, maleGeo)
    resultNeg = await booleanOp('subtract', geoNeg, femaleGeo)
    connectorAdded = true

    maleGeo.dispose()
    femaleGeo.dispose()
    connector.male.dispose()
    connector.female.dispose()
  } catch (err) {
    console.warn('[3DPF] Connector CSG failed, using plain split:', (err as Error).message)
  }

  const axisLabel = plane.axis.toUpperCase()

  return [
    {
      geometry: resultPos,
      splitInfo: { originalPartId, planeNormal: plane.normal, planeOffset: plane.offset, side: 'positive' },
      label: `${axisLabel}+${connectorAdded ? '' : ' (no connector)'}`
    },
    {
      geometry: resultNeg,
      splitInfo: { originalPartId, planeNormal: plane.normal, planeOffset: plane.offset, side: 'negative' },
      label: `${axisLabel}-${connectorAdded ? '' : ' (no connector)'}`
    }
  ]
}

/**
 * Auto-split geometry to fit the build volume.
 */
export async function autoSplit(
  geometry: THREE.BufferGeometry,
  buildVolume: BuildVolume,
  connectorType: ConnectorType,
  connectorParams: ConnectorParams,
  originalPartId: string
): Promise<SplitResult[]> {
  geometry.computeBoundingBox()
  const planes = calculateAutoSplitPlanes(geometry.boundingBox!, buildVolume)

  if (planes.length === 0) return []

  // Apply all planes sequentially
  let pieces: SplitResult[] = [{
    geometry,
    splitInfo: { originalPartId, planeNormal: [0, 0, 0], planeOffset: 0, side: 'positive' },
    label: 'original'
  }]

  for (const plane of planes) {
    const newPieces: SplitResult[] = []

    for (const piece of pieces) {
      piece.geometry.computeBoundingBox()
      const bb = piece.geometry.boundingBox!
      const min = plane.axis === 'x' ? bb.min.x : plane.axis === 'y' ? bb.min.y : bb.min.z
      const max = plane.axis === 'x' ? bb.max.x : plane.axis === 'y' ? bb.max.y : bb.max.z

      if (plane.offset > min + 0.1 && plane.offset < max - 0.1) {
        const [pos, neg] = await splitWithConnectors(
          piece.geometry, plane, connectorType, connectorParams, originalPartId
        )
        newPieces.push(pos, neg)
      } else {
        newPieces.push(piece)
      }
    }

    pieces = newPieces
  }

  // Return all pieces (don't filter - all are valid split results)
  return pieces
}
