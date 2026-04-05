/**
 * BasReliefGenerator - converts a 3D model into a flat relief.
 *
 * Algorithm:
 * 1. Cast rays from front toward -Z through a grid
 * 2. For each ray, find max depth intersection with source mesh → heightmap
 * 3. Create subdivided plane, displace vertices by heightmap × maxDepth
 * 4. Result is ready for CSG union with frame surface
 */

import * as THREE from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import type { ReliefParams } from '../types'

// Enable BVH accelerated raycast
THREE.Mesh.prototype.raycast = acceleratedRaycast

export function generateBasRelief(
  sourceGeometry: THREE.BufferGeometry,
  params: ReliefParams
): THREE.BufferGeometry {
  const { maxDepth, resolution, smoothing, contrast, invert } = params

  // 1. Compute source bounds
  sourceGeometry.computeBoundingBox()
  const bbox = sourceGeometry.boundingBox!
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const center = new THREE.Vector3()
  bbox.getCenter(center)

  const width = size.x
  const height = size.y

  // 2. Build BVH for fast raycasting
  const tempMesh = new THREE.Mesh(sourceGeometry)
  tempMesh.geometry.boundsTree = new MeshBVH(sourceGeometry)

  const raycaster = new THREE.Raycaster()
  const heightMap = new Float32Array(resolution * resolution)

  // 3. Cast rays from front (+Z) toward -Z
  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const u = ix / (resolution - 1)
      const v = iy / (resolution - 1)

      const x = bbox.min.x + u * width
      const y = bbox.min.y + v * height
      const z = bbox.max.z + 10 // start in front

      raycaster.set(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1))
      const hits = raycaster.intersectObject(tempMesh)

      if (hits.length > 0) {
        // Depth = distance from front face
        const frontZ = bbox.max.z
        const hitZ = hits[0].point.z
        const depth = (frontZ - hitZ) / size.z // normalized 0..1
        heightMap[iy * resolution + ix] = depth
      }
    }
  }

  // 4. Apply Gaussian blur for smoothing
  if (smoothing > 0) {
    gaussianBlur(heightMap, resolution, resolution, smoothing)
  }

  // 5. Apply contrast
  if (contrast !== 1.0) {
    for (let i = 0; i < heightMap.length; i++) {
      heightMap[i] = Math.pow(heightMap[i], 1 / contrast)
    }
  }

  // 6. Invert if needed
  if (invert) {
    for (let i = 0; i < heightMap.length; i++) {
      heightMap[i] = 1 - heightMap[i]
    }
  }

  // 7. Create displaced plane
  const planeGeo = new THREE.PlaneGeometry(width, height, resolution - 1, resolution - 1)
  const positions = planeGeo.attributes.position

  for (let i = 0; i < positions.count; i++) {
    const ix = i % resolution
    const iy = Math.floor(i / resolution)
    const h = heightMap[iy * resolution + ix]
    // Displace along Z (plane faces +Z by default)
    positions.setZ(i, h * maxDepth)
  }

  positions.needsUpdate = true

  // Add back face (solid box behind the relief)
  const backGeo = new THREE.PlaneGeometry(width, height, 1, 1)
  backGeo.translate(0, 0, -0.5) // thin back wall

  // Merge front relief + back
  // For simplicity, just use the displaced plane with thickness via extrusion
  // Add a thin box behind
  const reliefPositions = Array.from(positions.array) as number[]
  const reliefIndices = Array.from(planeGeo.index!.array) as number[]

  // Create back vertices (same XY, Z=0)
  const frontCount = positions.count
  for (let i = 0; i < frontCount; i++) {
    reliefPositions.push(positions.getX(i), positions.getY(i), 0)
  }

  // Back face triangles (reversed winding)
  const idx = planeGeo.index!
  for (let i = 0; i < idx.count; i += 3) {
    reliefIndices.push(
      idx.array[i + 2] + frontCount,
      idx.array[i + 1] + frontCount,
      idx.array[i] + frontCount
    )
  }

  // Side faces (connect front edge to back edge)
  // Top edge
  for (let ix = 0; ix < resolution - 1; ix++) {
    const iy = resolution - 1
    const a = iy * resolution + ix
    const b = iy * resolution + ix + 1
    reliefIndices.push(a, b, b + frontCount, a, b + frontCount, a + frontCount)
  }
  // Bottom edge
  for (let ix = 0; ix < resolution - 1; ix++) {
    const a = ix
    const b = ix + 1
    reliefIndices.push(b, a, a + frontCount, b, a + frontCount, b + frontCount)
  }
  // Left edge
  for (let iy = 0; iy < resolution - 1; iy++) {
    const a = iy * resolution
    const b = (iy + 1) * resolution
    reliefIndices.push(a, b, b + frontCount, a, b + frontCount, a + frontCount)
  }
  // Right edge
  for (let iy = 0; iy < resolution - 1; iy++) {
    const ix = resolution - 1
    const a = iy * resolution + ix
    const b = (iy + 1) * resolution + ix
    reliefIndices.push(b, a, a + frontCount, b, a + frontCount, b + frontCount)
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(reliefPositions), 3))
  result.setIndex(new THREE.BufferAttribute(new Uint32Array(reliefIndices), 1))
  result.computeVertexNormals()

  // Center the relief
  result.translate(-width / 2 + center.x, -height / 2 + center.y, 0)

  // Cleanup
  tempMesh.geometry.boundsTree = undefined as any

  return result
}

/**
 * Simple Gaussian blur on a 2D heightmap.
 */
function gaussianBlur(data: Float32Array, w: number, h: number, sigma: number): void {
  const kernel = Math.ceil(sigma * 3)
  const temp = new Float32Array(data.length)

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, weight = 0
      for (let k = -kernel; k <= kernel; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k))
        const g = Math.exp(-(k * k) / (2 * sigma * sigma))
        sum += data[y * w + sx] * g
        weight += g
      }
      temp[y * w + x] = sum / weight
    }
  }

  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, weight = 0
      for (let k = -kernel; k <= kernel; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k))
        const g = Math.exp(-(k * k) / (2 * sigma * sigma))
        sum += temp[sy * w + x] * g
        weight += g
      }
      data[y * w + x] = sum / weight
    }
  }
}
