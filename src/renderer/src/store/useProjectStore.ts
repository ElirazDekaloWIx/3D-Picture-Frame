/**
 * Central project store - holds the part tree, frame dimensions, and printer config.
 * Uses Zustand + Immer + undo/redo middleware.
 */

import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type * as THREE from 'three'
import type {
  PartNode,
  PartId,
  FrameDimensions,
  FrameProfile,
  FrameSymmetry,
  CornerSettings,
  FramePath,
  ProfileId,
  PrinterConfig,
  Transform
} from '@core/types'
import {
  DEFAULT_FRAME_DIMENSIONS,
  DEFAULT_FRAME_SYMMETRY,
  DEFAULT_CORNER_SETTINGS,
  DEFAULT_FRAME_PATH,
  BAMBU_LAB_A1
} from '@core/types'
import { createGroupNode } from '@core/PartTree'
import { BUILTIN_PROFILES } from '@core/parametric/FrameProfile'

// ─── State Shape ──────────────────────────────────────────────

interface ProjectState {
  // Part tree
  parts: Record<PartId, PartNode>
  rootPartId: PartId

  // Transient geometry cache (NOT in undo, NOT serialized)
  meshCache: Record<PartId, THREE.BufferGeometry>

  // Frame settings
  frameDimensions: FrameDimensions
  activeProfileId: ProfileId
  profiles: Record<ProfileId, FrameProfile>
  symmetry: FrameSymmetry
  cornerSettings: CornerSettings
  framePath: FramePath

  // Printer
  printerConfig: PrinterConfig

  // Project metadata
  projectName: string
  projectPath: string | null
  isDirty: boolean
}

// ─── Actions ──────────────────────────────────────────────────

interface ProjectActions {
  // Part CRUD
  addPart: (part: PartNode, parentId?: PartId) => void
  removePart: (partId: PartId) => void
  updatePart: (partId: PartId, updates: Partial<PartNode>) => void
  updateTransform: (partId: PartId, transform: Partial<Transform>) => void
  reparentPart: (partId: PartId, newParentId: PartId, index?: number) => void

  // Frame
  setFrameDimensions: (dims: Partial<FrameDimensions>) => void
  setActiveProfile: (profileId: ProfileId) => void
  setSymmetry: (sym: Partial<FrameSymmetry>) => void
  breakSymmetry: () => void
  setCornerSettings: (cs: Partial<CornerSettings>) => void
  setFramePath: (fp: Partial<FramePath>) => void

  // Printer
  setPrinterConfig: (config: PrinterConfig) => void

  // Import
  importModel: (fileName: string, geometry: THREE.BufferGeometry) => PartId

  // Decoration operations
  applyMerge: (decoPartId: PartId, targetPartId: PartId) => Promise<void>
  applyCookieCutter: (decoPartId: PartId, targetPartId: PartId) => Promise<void>

  // Mesh cache (transient)
  setMeshCache: (partId: PartId, geometry: THREE.BufferGeometry) => void
  clearMeshCache: () => void

  // Project
  setProjectName: (name: string) => void
  setProjectPath: (path: string | null) => void
  markDirty: () => void
  markClean: () => void

  // Reset
  resetProject: () => void
}

// ─── Initial State ────────────────────────────────────────────

function createInitialState(): ProjectState {
  const rootNode = createGroupNode('Frame')

  return {
    parts: { [rootNode.id]: rootNode },
    rootPartId: rootNode.id,
    meshCache: {},
    frameDimensions: { ...DEFAULT_FRAME_DIMENSIONS },
    activeProfileId: 'ogee',
    profiles: BUILTIN_PROFILES,
    symmetry: { ...DEFAULT_FRAME_SYMMETRY },
    cornerSettings: { ...DEFAULT_CORNER_SETTINGS },
    framePath: { ...DEFAULT_FRAME_PATH },
    printerConfig: { ...BAMBU_LAB_A1 },
    projectName: 'Untitled Frame',
    projectPath: null,
    isDirty: false
  }
}

// ─── Store ────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState & ProjectActions>()((set, get) => ({
  ...createInitialState(),

  // ─── Part CRUD ────────────────────────────────────────

  addPart: (part, parentId) => {
    const state = get()
    const targetParentId = parentId ?? state.rootPartId

    set({
      parts: {
        ...state.parts,
        [part.id]: { ...part, parentId: targetParentId },
        [targetParentId]: {
          ...state.parts[targetParentId],
          children: [...state.parts[targetParentId].children, part.id]
        }
      },
      isDirty: true
    })
  },

  removePart: (partId) => {
    const state = get()
    const part = state.parts[partId]
    if (!part || partId === state.rootPartId) return

    // Collect all descendants
    const toRemove = new Set<PartId>([partId])
    const collectChildren = (id: PartId): void => {
      const p = state.parts[id]
      if (p) {
        for (const childId of p.children) {
          toRemove.add(childId)
          collectChildren(childId)
        }
      }
    }
    collectChildren(partId)

    // Remove from parent's children
    const newParts = { ...state.parts }
    if (part.parentId && newParts[part.parentId]) {
      newParts[part.parentId] = {
        ...newParts[part.parentId],
        children: newParts[part.parentId].children.filter((id) => id !== partId)
      }
    }

    // Delete all collected parts
    for (const id of toRemove) {
      delete newParts[id]
    }

    set({ parts: newParts, isDirty: true })
  },

  updatePart: (partId, updates) => {
    const state = get()
    if (!state.parts[partId]) return

    set({
      parts: {
        ...state.parts,
        [partId]: { ...state.parts[partId], ...updates }
      },
      isDirty: true
    })
  },

  updateTransform: (partId, transform) => {
    const state = get()
    const part = state.parts[partId]
    if (!part) return

    set({
      parts: {
        ...state.parts,
        [partId]: {
          ...part,
          transform: { ...part.transform, ...transform }
        }
      },
      isDirty: true
    })
  },

  reparentPart: (partId, newParentId, index) => {
    const state = get()
    const part = state.parts[partId]
    if (!part || partId === newParentId) return

    const newParts = { ...state.parts }

    // Remove from old parent
    if (part.parentId && newParts[part.parentId]) {
      newParts[part.parentId] = {
        ...newParts[part.parentId],
        children: newParts[part.parentId].children.filter((id) => id !== partId)
      }
    }

    // Add to new parent
    const newChildren = [...newParts[newParentId].children]
    if (index !== undefined) {
      newChildren.splice(index, 0, partId)
    } else {
      newChildren.push(partId)
    }

    newParts[newParentId] = { ...newParts[newParentId], children: newChildren }
    newParts[partId] = { ...part, parentId: newParentId }

    set({ parts: newParts, isDirty: true })
  },

  // ─── Frame ────────────────────────────────────────────

  setFrameDimensions: (dims) => {
    set((state) => ({
      frameDimensions: { ...state.frameDimensions, ...dims },
      isDirty: true
    }))
  },

  setActiveProfile: (profileId) => {
    set({ activeProfileId: profileId, isDirty: true })
  },

  setSymmetry: (sym) => {
    set((state) => ({ symmetry: { ...state.symmetry, ...sym }, isDirty: true }))
  },

  breakSymmetry: () => {
    set({ symmetry: { mode: 'full', repeatCountH: 1, repeatCountV: 1 }, isDirty: true })
  },

  setCornerSettings: (cs) => {
    set((state) => ({ cornerSettings: { ...state.cornerSettings, ...cs }, isDirty: true }))
  },

  setFramePath: (fp) => {
    set((state) => ({ framePath: { ...state.framePath, ...fp }, isDirty: true }))
  },

  // ─── Printer ──────────────────────────────────────────

  setPrinterConfig: (config) => {
    set({ printerConfig: config })
  },

  // ─── Mesh Cache (transient) ───────────────────────────

  importModel: (fileName, geometry) => {
    const state = get()
    const name = fileName.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') ?? 'Imported'
    const id = nanoid()

    // Auto-scale: fit model to ~60% of picture height
    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox!
    const size = bbox.max.clone().sub(bbox.min)
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetSize = state.frameDimensions.pictureHeight * 0.6
    const autoScale = maxDim > 0 ? targetSize / maxDim : 1

    // Position at frame center, slightly in front (Z = frameDepth/2 so it sits on the front face)
    const posZ = state.frameDimensions.frameDepth * 0.3

    const part: PartNode = {
      id,
      name,
      type: 'decoration',
      parentId: state.rootPartId,
      children: [],
      transform: {
        position: [0, 0, posZ],
        rotation: [0, 0, 0],
        scale: [autoScale, autoScale, autoScale]
      },
      geometry: { kind: 'imported', originalFile: fileName, meshDataId: id },
      visible: true,
      locked: false,
      printable: true,
      materialId: 'default',
      connectorSlots: [],
      decorationInfo: { mode: 'attached', sourceMeshId: id }
    }

    set({
      parts: {
        ...state.parts,
        [id]: part,
        [state.rootPartId]: {
          ...state.parts[state.rootPartId],
          children: [...state.parts[state.rootPartId].children, id]
        }
      },
      meshCache: { ...state.meshCache, [id]: geometry },
      isDirty: true
    })

    return id
  },

  applyMerge: async (decoPartId, targetPartId) => {
    const { booleanOp } = await import('@core/csg/CSGOperations')
    const { initManifold } = await import('@core/csg/ManifoldAdapter')
    await initManifold()

    const state = get()
    const decoGeo = state.meshCache[decoPartId]
    const targetGeo = state.meshCache[targetPartId]
    if (!decoGeo || !targetGeo) throw new Error('Missing geometry')

    const decoPart = state.parts[decoPartId]
    if (!decoPart) throw new Error('Missing decoration part')

    // Transform decoration geometry to match its position/rotation/scale
    const transformedDeco = decoGeo.clone()
    const m = new (await import('three')).Matrix4()
    m.compose(
      new (await import('three')).Vector3(...decoPart.transform.position),
      new (await import('three')).Quaternion().setFromEuler(
        new (await import('three')).Euler(...decoPart.transform.rotation)
      ),
      new (await import('three')).Vector3(...decoPart.transform.scale)
    )
    transformedDeco.applyMatrix4(m)

    const result = await booleanOp('union', targetGeo, transformedDeco)
    transformedDeco.dispose()

    // Replace target geometry and remove decoration
    const newMeshCache = { ...state.meshCache, [targetPartId]: result }
    delete newMeshCache[decoPartId]

    const newParts = { ...state.parts }
    // Remove deco from parent
    const parent = newParts[decoPart.parentId!]
    if (parent) {
      newParts[parent.id] = { ...parent, children: parent.children.filter(id => id !== decoPartId) }
    }
    delete newParts[decoPartId]

    set({ parts: newParts, meshCache: newMeshCache, isDirty: true })
  },

  applyCookieCutter: async (decoPartId, targetPartId) => {
    const { booleanOp } = await import('@core/csg/CSGOperations')
    const { initManifold } = await import('@core/csg/ManifoldAdapter')
    const { generateCookieCutter } = await import('@core/decoration/CookieCutterGenerator')
    await initManifold()

    const state = get()
    const decoGeo = state.meshCache[decoPartId]
    const targetGeo = state.meshCache[targetPartId]
    if (!decoGeo || !targetGeo) throw new Error('Missing geometry')

    const decoPart = state.parts[decoPartId]
    if (!decoPart) throw new Error('Missing decoration part')

    const cutterParams = decoPart.decorationInfo?.cookieCutterParams ?? { cutDepth: 20, offset: 0, draftAngle: 0 }
    const cutterGeo = generateCookieCutter(decoGeo, cutterParams)

    // Transform cutter to decoration's position
    const THREE = await import('three')
    const m = new THREE.Matrix4()
    m.compose(
      new THREE.Vector3(...decoPart.transform.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...decoPart.transform.rotation)),
      new THREE.Vector3(...decoPart.transform.scale)
    )
    cutterGeo.applyMatrix4(m)

    const result = await booleanOp('subtract', targetGeo, cutterGeo)
    cutterGeo.dispose()

    const newMeshCache = { ...state.meshCache, [targetPartId]: result }
    delete newMeshCache[decoPartId]

    const newParts = { ...state.parts }
    const parent = newParts[decoPart.parentId!]
    if (parent) {
      newParts[parent.id] = { ...parent, children: parent.children.filter(id => id !== decoPartId) }
    }
    delete newParts[decoPartId]

    set({ parts: newParts, meshCache: newMeshCache, isDirty: true })
  },

  setMeshCache: (partId, geometry) => {
    set((state) => ({
      meshCache: { ...state.meshCache, [partId]: geometry }
    }))
  },

  clearMeshCache: () => {
    // Dispose old geometries
    const cache = get().meshCache
    for (const geo of Object.values(cache)) {
      geo.dispose()
    }
    set({ meshCache: {} })
  },

  // ─── Project ──────────────────────────────────────────

  setProjectName: (name) => set({ projectName: name }),
  setProjectPath: (path) => set({ projectPath: path }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  resetProject: () => {
    get().clearMeshCache()
    set(createInitialState())
  }
}))
