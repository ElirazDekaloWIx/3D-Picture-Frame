/**
 * ManifoldAdapter - Bridge between Three.js BufferGeometry and manifold-3d.
 *
 * Uses MeshGL.merge() pipeline to handle Three.js duplicate vertices
 * (per-face normals create duplicate verts at same position).
 */

import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { TransferableMesh } from '../types'

let wasm: any = null

export async function initManifold(): Promise<void> {
  if (wasm) return
  try {
    const Module = (await import('manifold-3d')).default
    wasm = await Module({
      locateFile: (file: string) => file.endsWith('.wasm') ? '/manifold.wasm' : file
    })
    console.log('[3DPF] Manifold WASM initialized')
  } catch (err) {
    throw new Error(`Manifold WASM init failed: ${err}`)
  }
}

function getWasm() {
  if (!wasm) throw new Error('Manifold not initialized')
  return wasm
}

/**
 * Convert Three.js BufferGeometry to Manifold.
 * Uses mergeVertices + MeshGL construction.
 */
export function toManifold(geometry: THREE.BufferGeometry): any {
  const m = getWasm()

  // Step 1: Ensure indexed geometry with merged vertices
  let geo = geometry
  if (!geo.index) {
    geo = mergeVertices(geo.clone(), 1e-4)
  } else {
    // Even indexed geometry may have duplicate positions (different normals)
    geo = mergeVertices(geo.clone(), 1e-4)
  }

  const positions = new Float32Array(geo.attributes.position.array)
  const indices = geo.index ? new Uint32Array(geo.index.array) : null

  if (!indices || indices.length === 0) {
    throw new Error('Cannot convert non-indexed geometry to Manifold')
  }

  // Step 2: Create Manifold mesh data
  const meshData = {
    numProp: 3,
    vertProperties: positions,
    triVerts: indices
  }

  // Step 3: Try to construct Manifold
  try {
    const manifold = new m.Manifold(meshData)
    const status = manifold.status?.()
    // status can be 0 (OK), "NoError", or undefined - all are fine
    if (status !== undefined && status !== 0 && status !== 'NoError' && status !== '') {
      manifold.delete?.()
      throw new Error(`Manifold construction failed with status ${status}`)
    }
    return manifold
  } catch (e) {
    throw new Error(`Cannot create Manifold: ${e}. Geometry has ${positions.length / 3} verts, ${indices.length / 3} tris`)
  }
}

/**
 * Convert Manifold back to Three.js BufferGeometry.
 */
export function toThreeJS(manifold: any): THREE.BufferGeometry {
  let mesh: any
  try {
    mesh = typeof manifold._GetMeshJS === 'function' ? manifold._GetMeshJS() : manifold.getMesh()
  } catch (e) {
    throw new Error(`Failed to extract mesh: ${e}`)
  }

  const verts = mesh.vertProperties ?? mesh.vertPos
  const tris = mesh.triVerts ?? mesh.faces

  if (!verts || !tris || verts.length === 0 || tris.length === 0) {
    throw new Error(`Empty mesh from Manifold`)
  }

  const geometry = new THREE.BufferGeometry()
  const numProp = mesh.numProp ?? 3

  if (numProp === 3) {
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  } else {
    const count = verts.length / numProp
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = verts[i * numProp]
      pos[i * 3 + 1] = verts[i * numProp + 1]
      pos[i * 3 + 2] = verts[i * numProp + 2]
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  }

  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1))
  geometry.computeVertexNormals()
  return geometry
}

export function isManifoldReady(): boolean { return wasm !== null }

/**
 * Check if a geometry can be converted to manifold.
 * Returns true if valid, false if not.
 */
export function isGeometryManifold(geometry: THREE.BufferGeometry): boolean {
  if (!wasm) return false
  try {
    const manifold = toManifold(geometry)
    manifold.delete?.()
    return true
  } catch {
    return false
  }
}
