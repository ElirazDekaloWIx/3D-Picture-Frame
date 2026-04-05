/**
 * ModelImporter - imports 3D model files into Three.js BufferGeometry.
 * Auto-orients models to face +Z (forward) with bottom at Y=0.
 */

import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface ImportResult {
  geometry: THREE.BufferGeometry
  name: string
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function parseSTL(data: ArrayBuffer): THREE.BufferGeometry {
  return new STLLoader().parse(data)
}

function parseOBJ(data: ArrayBuffer): THREE.BufferGeometry {
  const group = new OBJLoader().parse(new TextDecoder().decode(data))
  let geo: THREE.BufferGeometry | null = null
  group.traverse((child) => {
    if (!geo && (child as THREE.Mesh).isMesh) geo = (child as THREE.Mesh).geometry as THREE.BufferGeometry
  })
  if (!geo) throw new Error('No mesh found in OBJ file')
  return geo
}

async function parseGLTF(data: ArrayBuffer): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(data, '', (gltf) => {
      let geo: THREE.BufferGeometry | null = null
      gltf.scene.traverse((child) => {
        if (!geo && (child as THREE.Mesh).isMesh) geo = (child as THREE.Mesh).geometry as THREE.BufferGeometry
      })
      geo ? resolve(geo) : reject(new Error('No mesh found in GLTF'))
    }, (err) => reject(err))
  })
}

function parsePLY(data: ArrayBuffer): THREE.BufferGeometry {
  return new PLYLoader().parse(data)
}

/**
 * Normalize geometry:
 * 1. Merge vertices for smooth normals
 * 2. Center at origin
 * 3. Auto-orient: if model is "lying down" (taller in Z than Y), rotate to stand up
 * 4. STL files are often Z-up → rotate to Y-up
 * 5. Bottom at Y=0
 */
function normalizeGeometry(geo: THREE.BufferGeometry, ext: string): THREE.BufferGeometry {
  let result = geo.index ? geo : mergeVertices(geo, 0.001)

  // No auto-rotation - just center the model and put bottom at Y=0.
  // User can rotate via Properties panel.

  // Center at origin
  result.computeBoundingBox()
  const center = new THREE.Vector3()
  result.boundingBox!.getCenter(center)
  result.translate(-center.x, -center.y, -center.z)

  // Bottom at Y=0
  result.computeBoundingBox()
  result.translate(0, -result.boundingBox!.min.y, 0)

  // Center X/Z
  result.computeBoundingBox()
  const c2 = new THREE.Vector3()
  result.boundingBox!.getCenter(c2)
  result.translate(-c2.x, 0, -c2.z)

  result.computeVertexNormals()
  return result
}

export async function importModel(fileName: string, data: ArrayBuffer): Promise<ImportResult> {
  const ext = getExtension(fileName)
  let geometry: THREE.BufferGeometry

  switch (ext) {
    case 'stl': geometry = parseSTL(data); break
    case 'obj': geometry = parseOBJ(data); break
    case 'gltf': case 'glb': geometry = await parseGLTF(data); break
    case 'ply': geometry = parsePLY(data); break
    default: throw new Error(`Unsupported format: .${ext}`)
  }

  geometry = normalizeGeometry(geometry, ext)

  const name = fileName.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') ?? 'Imported Model'
  console.log(`[3DPF] Imported "${name}": ${geometry.attributes.position.count} verts`)
  return { geometry, name }
}

export const MODEL_FILE_FILTERS = [
  { name: '3D Models', extensions: ['stl', 'obj', 'gltf', 'glb', 'ply'] },
  { name: 'STL', extensions: ['stl'] },
  { name: 'OBJ', extensions: ['obj'] },
  { name: 'GLTF/GLB', extensions: ['gltf', 'glb'] },
  { name: 'PLY', extensions: ['ply'] }
]
