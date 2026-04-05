/**
 * Core types for the 3D Picture Frame Designer.
 * This file has NO React dependencies - pure TypeScript only.
 */

// ─── IDs ──────────────────────────────────────────────────────

export type PartId = string
export type ConnectorSlotId = string
export type ProfileId = string
export type MaterialId = string

// ─── Geometry Source (Discriminated Union) ─────────────────────

export interface ParametricSource {
  kind: 'parametric'
  generator: string
  params: Record<string, unknown>
}

export interface ImportedSource {
  kind: 'imported'
  originalFile: string
  meshDataId: string
}

export interface CSGResultSource {
  kind: 'csg-result'
  operation: CSGOp
  operandIds: PartId[]
}

export interface NoGeometrySource {
  kind: 'none'
}

export type GeometrySource =
  | ParametricSource
  | ImportedSource
  | CSGResultSource
  | NoGeometrySource

// ─── CSG ──────────────────────────────────────────────────────

export type CSGOp = 'union' | 'subtract' | 'intersect'

// ─── Transform ────────────────────────────────────────────────

export interface Transform {
  position: [number, number, number]
  rotation: [number, number, number] // Euler XYZ in radians
  scale: [number, number, number]
}

export const DEFAULT_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

// ─── Part Types ───────────────────────────────────────────────

export type PartType =
  | 'group'
  | 'frame-rail'
  | 'frame-corner'
  | 'frame-back'
  | 'frame-stand'
  | 'connector'
  | 'decoration'
  | 'custom'
  | 'split-result'

// ─── Connector System ─────────────────────────────────────────

export type ConnectorType = 'snap-fit' | 'dovetail' | 'pin-hole' | 'mortise-tenon'

export interface ConnectorParams {
  tolerance: number       // mm, default 0.2
  size: number            // mm
  angle?: number          // degrees, for dovetail
  depth?: number          // mm, for mortise
  pinDiameter?: number    // mm, for pin-hole
}

export const DEFAULT_CONNECTOR_PARAMS: ConnectorParams = {
  tolerance: 0.2,
  size: 5.0
}

export interface ConnectorSlot {
  id: ConnectorSlotId
  type: ConnectorType
  position: [number, number, number]
  normal: [number, number, number]
  role: 'male' | 'female'
  params: ConnectorParams
  pairedWith?: ConnectorSlotId
}

// ─── Decoration ───────────────────────────────────────────────

export type DecorationMode = 'attached' | 'merged' | 'bas-relief' | 'cookie-cutter'

export interface ReliefParams {
  maxDepth: number        // mm, default 2.0
  resolution: number      // pixels, default 512
  smoothing: number       // sigma, default 1.0
  contrast: number        // default 1.0
  invert: boolean         // default false
}

export const DEFAULT_RELIEF_PARAMS: ReliefParams = {
  maxDepth: 2.0,
  resolution: 512,
  smoothing: 1.0,
  contrast: 1.0,
  invert: false
}

export interface CookieCutterParams {
  cutDepth: number        // mm, how deep to cut
  offset: number          // mm, outline offset
  draftAngle: number      // degrees, default 0
}

export const DEFAULT_COOKIE_CUTTER_PARAMS: CookieCutterParams = {
  cutDepth: 5.0,
  offset: 0.0,
  draftAngle: 0
}

export interface DecorationInfo {
  mode: DecorationMode
  sourceMeshId: string
  reliefParams?: ReliefParams
  cookieCutterParams?: CookieCutterParams
}

// ─── Split Info ───────────────────────────────────────────────

export interface SplitInfo {
  originalPartId: PartId
  planeNormal: [number, number, number]
  planeOffset: number
  side: 'positive' | 'negative'
}

// ─── Array Duplication ────────────────────────────────────────

export type ArrayPattern = 'none' | 'linear' | 'circular' | 'grid'

export interface ArrayConfig {
  pattern: ArrayPattern
  count: number
  spacing: number         // mm
  // Linear
  direction?: [number, number, number]
  // Circular
  center?: [number, number, number]
  axis?: [number, number, number]
  angleRange?: number     // degrees
  // Grid
  direction2?: [number, number, number]
  count2?: number
  spacing2?: number
}

// ─── Part Node (Central Type) ─────────────────────────────────

export interface PartNode {
  id: PartId
  name: string
  type: PartType
  parentId: PartId | null
  children: PartId[]

  transform: Transform
  geometry: GeometrySource

  // Visual
  visible: boolean
  locked: boolean
  printable: boolean
  materialId: MaterialId

  // Connectors
  connectorSlots: ConnectorSlot[]

  // Optional metadata
  splitInfo?: SplitInfo
  decorationInfo?: DecorationInfo
  arrayConfig?: ArrayConfig
}

// ─── Frame Path ───────────────────────────────────────────────

export type FramePathType = 'rectangle' | 'circle' | 'ellipse' | 'polygon' | 'freehand' | 'svg'

export interface FramePathPoint {
  x: number  // mm, world space
  y: number  // mm, world space
}

export interface FramePath {
  type: FramePathType
  /** Control points for the path (in 2D, XY plane) */
  controlPoints: FramePathPoint[]
  /** For polygon: number of sides */
  sides?: number
  /** For ellipse: radiusX and radiusY */
  radiusX?: number
  radiusY?: number
  /** Whether corners should have custom blocks */
  useCorners: boolean
}

export const DEFAULT_FRAME_PATH: FramePath = {
  type: 'rectangle',
  controlPoints: [],
  useCorners: false
}

// ─── Corner Settings ──────────────────────────────────────────

export type CornerShape = 'none' | 'square' | 'circle' | 'triangle' | 'hexagon' | 'octagon' | 'ellipse'

export interface CornerSettings {
  shape: CornerShape
  size: number  // multiplier of frameWidth (1 = same as frameWidth, 1.5 = 50% bigger)
}

export const DEFAULT_CORNER_SETTINGS: CornerSettings = {
  shape: 'square',
  size: 1
}

// ─── Symmetry ─────────────────────────────────────────────────

export type SymmetryMode = 'full' | 'half-x' | 'half-y' | 'quarter'

export interface FrameSymmetry {
  mode: SymmetryMode
  /** How many times the repeat unit tiles along horizontal rails */
  repeatCountH: number
  /** How many times the repeat unit tiles along vertical rails */
  repeatCountV: number
}

export const DEFAULT_FRAME_SYMMETRY: FrameSymmetry = {
  mode: 'full',
  repeatCountH: 1,
  repeatCountV: 1
}

// ─── Frame Dimensions ─────────────────────────────────────────

export interface FrameDimensions {
  pictureWidth: number    // mm
  pictureHeight: number   // mm
  frameWidth: number      // mm (width of frame border)
  frameDepth: number      // mm (thickness)
  backThickness: number   // mm
  backOverlap: number     // mm (how much back extends beyond inner opening, 0 = flush)
}

export const DEFAULT_FRAME_DIMENSIONS: FrameDimensions = {
  pictureWidth: 200,
  pictureHeight: 300,
  frameWidth: 40,
  frameDepth: 20,
  backThickness: 2,
  backOverlap: 5
}

// ─── Frame Profile ────────────────────────────────────────────

export interface ProfilePoint {
  x: number   // width axis (0 = inner edge, 1 = outer edge)
  y: number   // depth axis (0 = front face)
}

export type ProfilePreset = 'flat' | 'ogee' | 'round' | 'bevel' | 'scoop' | 'custom'

export interface FrameProfile {
  id: ProfileId
  name: string
  preset: ProfilePreset
  points: ProfilePoint[]
}

// ─── Printer Configuration ────────────────────────────────────

export interface PrinterConfig {
  id: string
  name: string
  buildVolume: {
    x: number   // mm
    y: number   // mm
    z: number   // mm
  }
  nozzleDiameters: number[]     // mm
  defaultNozzle: number         // mm
  materials: string[]
}

export const BAMBU_LAB_A1: PrinterConfig = {
  id: 'bambu-lab-a1',
  name: 'Bambu Lab A1',
  buildVolume: { x: 256, y: 256, z: 256 },
  nozzleDiameters: [0.2, 0.4, 0.6, 0.8],
  defaultNozzle: 0.4,
  materials: ['PLA', 'PETG', 'TPU', 'ABS', 'PLA-CF', 'PA']
}

// ─── Render Mode ──────────────────────────────────────────────

export type RenderMode = 'pbr' | 'pathtraced'

// ─── Tool Mode ────────────────────────────────────────────────

export type ToolMode =
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'split'
  | 'connector'
  | 'decorate'

// ─── Transferable Mesh (for Web Workers) ──────────────────────

export interface TransferableMesh {
  positions: Float32Array
  indices: Uint32Array
  normals?: Float32Array
}
