# 3D Picture Frame Designer - Technical Design Document

**Version**: 1.0
**Date**: 2026-04-03
**Status**: Draft

---

## 1. System Architecture

```
+-----------------------------------------------------------+
|                    Electron Main Process                    |
|  File I/O | Menu | Printer Profiles | Window Management    |
+----------------------------+------------------------------+
                             | IPC (contextBridge)
+----------------------------+------------------------------+
|                   Electron Renderer Process                 |
|                                                             |
|  +------------------+  +--------------------------------+  |
|  |   React UI       |  |   Three.js / R3F Scene         |  |
|  |   (Panels,       |  |   (Viewport, Gizmos,           |  |
|  |    Dialogs,      |  |    Materials, PathTracer)       |  |
|  |    Toolbar)      |  |                                |  |
|  +--------+---------+  +---------------+----------------+  |
|           |                             |                   |
|  +--------+-----------------------------+----------------+  |
|  |              Zustand Stores                           |  |
|  |  Project | Selection | Tool | Render | UI             |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------+---------------------------+  |
|  |           Core Geometry Engine (pure TS)              |  |
|  |  PartTree | Parametric | CSG | Splitting |            |  |
|  |  Connectors | Decoration | Mesh Utils                |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------+---------------------------+  |
|  |              Web Workers                              |  |
|  |  csg.worker | relief.worker                           |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|---------------|-------------|
| **Electron Main** | File system, native menus, window management, printer profiles | Node.js APIs |
| **React UI** | Panels, dialogs, toolbar, layout, user interaction | Zustand stores |
| **R3F Scene** | 3D viewport, camera, controls, rendering, gizmos | Three.js, stores |
| **Zustand Stores** | Application state, undo/redo, derived state | Immer |
| **Core Engine** | Geometry generation, CSG, splitting, connectors | manifold-3d, Three.js math |
| **Web Workers** | Heavy computation (CSG, relief) off main thread | manifold-3d WASM |
| **I/O** | Import/export 3D formats, project serialization | Three.js loaders, fflate |

### Key Constraint: Core Engine has NO React dependency
The `core/` directory contains pure TypeScript with no React imports. It operates on plain data structures and Three.js geometry. This enables:
- Testing without a DOM
- Running in Web Workers
- Reuse outside React context

---

## 2. Data Model

### 2.1 PartNode (Central Type)

```typescript
interface PartNode {
  id: string;                    // nanoid
  name: string;
  type: PartType;
  parentId: string | null;
  children: string[];            // child IDs (order matters)

  // Transform (local space, relative to parent)
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];  // Euler XYZ radians
    scale: [number, number, number];
  };

  // Geometry source (discriminated union)
  geometry:
    | { kind: 'parametric'; generator: string; params: Record<string, unknown> }
    | { kind: 'imported'; originalFile: string; meshDataId: string }
    | { kind: 'csg-result'; operation: CSGOp; operandIds: string[] }
    | { kind: 'none' };  // group nodes

  // Visual
  visible: boolean;
  locked: boolean;
  printable: boolean;
  materialId: string;

  // Connectors
  connectorSlots: ConnectorSlot[];

  // Split metadata
  splitInfo?: {
    originalPartId: string;
    planeNormal: [number, number, number];
    planeOffset: number;
    side: 'positive' | 'negative';
  };

  // Decoration metadata
  decorationInfo?: {
    mode: 'attached' | 'merged' | 'bas-relief' | 'cookie-cutter';
    sourceMeshId: string;
    reliefParams?: ReliefParams;
    cookieCutterParams?: CookieCutterParams;
  };
}

type PartType =
  | 'group'
  | 'frame-rail'
  | 'frame-corner'
  | 'frame-back'
  | 'frame-stand'
  | 'connector'
  | 'decoration'
  | 'custom'
  | 'split-result';

type CSGOp = 'union' | 'subtract' | 'intersect';
```

### 2.2 ConnectorSlot

```typescript
interface ConnectorSlot {
  id: string;
  type: ConnectorType;
  position: [number, number, number];  // local space
  normal: [number, number, number];
  role: 'male' | 'female';
  params: ConnectorParams;
  pairedWith?: string;  // ID of matching slot on other part
}

type ConnectorType = 'snap-fit' | 'dovetail' | 'pin-hole' | 'mortise-tenon';

interface ConnectorParams {
  tolerance: number;      // mm, default 0.2
  size: number;           // mm, relative to connector type
  angle?: number;         // degrees, for dovetail
  depth?: number;         // mm, for mortise
  pinDiameter?: number;   // mm, for pin-hole
}
```

### 2.3 Project State

```typescript
interface ProjectState {
  // Part tree
  parts: Record<string, PartNode>;
  rootPartId: string;

  // Transient (not saved, not in undo)
  meshCache: Record<string, THREE.BufferGeometry>;  // partId -> geometry

  // Frame settings
  frameDimensions: {
    pictureWidth: number;   // mm
    pictureHeight: number;  // mm
    frameWidth: number;     // mm
    frameDepth: number;     // mm
    backThickness: number;  // mm
  };
  activeProfileId: string;
  profiles: Record<string, FrameProfile>;

  // Printer
  printerConfig: PrinterConfig;

  // Project metadata
  projectName: string;
  projectPath?: string;
  isDirty: boolean;
}
```

---

## 3. Key Subsystems

### 3.1 Parametric Frame Generator

**Input**: `frameDimensions` + `FrameProfile`
**Output**: 4 rail PartNodes + 4 corner PartNodes + 1 back + 1 stand

**Algorithm**:
1. Profile is a 2D polyline `{x, y}[]` (x = width axis, y = depth axis)
2. For each rail: extrude profile along rail length
3. At corners: miter cut at 45 degrees, generate corner piece
4. Back: flat rectangle with configurable thickness
5. Stand: parametric easel or wall-mount hook

**Frame Profile Types**:
```
Flat:    |__|      Simple rectangle cross-section
Ogee:    |~_|      S-curve, classic wood frame look
Round:   |⌒_|      Semicircle top
Bevel:   |/_|      45-degree chamfer
Scoop:   |U_|      Concave curve
Custom:  |?_|      User-defined spline points
```

### 3.2 CSG Pipeline

```
User Action -> CSG Preview (three-bvh-csg, instant) -> "Apply" -> Worker -> Manifold (watertight) -> Result
```

**Dual-engine approach**:
- `three-bvh-csg`: Real-time preview in viewport. May produce non-manifold output. Used ONLY for visual feedback.
- `manifold-3d`: Final commit. Guarantees watertight output. Runs in Web Worker to avoid UI freeze.

**ManifoldAdapter** responsibilities:
1. Convert `THREE.BufferGeometry` -> `Manifold.Mesh` (extract position/index arrays)
2. Handle non-indexed geometry (auto-index via weld vertices)
3. Handle degenerate triangles (filter out zero-area faces)
4. Convert `Manifold.Mesh` -> `THREE.BufferGeometry` (with computed normals)

### 3.3 Splitting System

**Auto-split algorithm**:
```
function autoSplit(part, buildVolume):
  bbox = computeBoundingBox(part)
  if bbox fits in buildVolume:
    return [part]

  axis = longestExceedingAxis(bbox, buildVolume)
  planeOffset = bbox.center[axis]

  [partA, partB] = manifold.splitByPlane(part, axis, planeOffset)

  connectors = generateConnectors(axis, planeOffset, connectorType)
  partA = manifold.union(partA, connectors.male)
  partB = manifold.union(partB, connectors.female)

  return [...autoSplit(partA, buildVolume), ...autoSplit(partB, buildVolume)]
```

**Manual split**: User drags a plane gizmo in viewport. Same connector insertion flow.

### 3.4 Bas-Relief Pipeline

```
1. Position orthographic camera facing target surface
2. Render source model to offscreen WebGL depth buffer
3. Read depth as Float32Array height map
4. Apply Gaussian blur (configurable kernel size)
5. Apply contrast/gamma adjustment
6. Create subdivided plane matching target surface area
7. Displace vertices along surface normal: offset = heightMap[uv] * maxDepth
8. CSG union displaced mesh with frame surface
```

**Parameters**:
- `maxDepth`: Maximum relief height (mm), default 2.0
- `resolution`: Height map resolution (pixels), default 512x512
- `smoothing`: Gaussian blur sigma, default 1.0
- `invert`: Flip depth (raised vs. recessed)
- `contrast`: Height map contrast, default 1.0

### 3.5 Cookie Cutter Pipeline

```
1. Project source model silhouette onto target surface (orthographic)
2. Extract 2D contour from silhouette
3. Extrude contour through frame depth (+ optional offset)
4. Optional: add draft angle to extrusion
5. CSG subtract extrusion from frame
```

### 3.6 Decoration Placement

**Surface Snapping**:
- BVH-accelerated raycast from mouse position
- Hit point + face normal determine placement position and orientation
- Model aligned so its "bottom" faces the surface normal
- User can offset distance from surface

**Array Duplication**:
- Linear: start point, direction vector, count, spacing
- Circular: center, axis, count, angle range
- Grid: two direction vectors, counts, spacings
- Each copy is an independent PartNode (allows individual editing)

### 3.7 Undo/Redo System

Zustand middleware using Immer patches:

```typescript
function undoMiddleware(config) {
  let undoStack: Patch[][] = [];
  let redoStack: Patch[][] = [];

  return (set, get, api) => {
    const trackedSet = (updater) => {
      const [nextState, patches, inversePatches] = produceWithPatches(get(), updater);
      undoStack.push(inversePatches);
      redoStack = [];  // clear redo on new action
      set(nextState);
    };

    return config(trackedSet, get, api);
  };
}
```

**Excluded from undo**: `meshCache` (derived/transient), `hoveredPartId`, render settings.

---

## 4. Rendering Architecture

### 4.1 Work Mode (PBR)
- `THREE.MeshPhysicalMaterial` with configurable properties
- Environment map for reflections (drei `<Environment>`)
- Shadow casting on grid floor
- Build volume ghost (wireframe box showing printer limits)

### 4.2 Preview Mode (Path Tracer)
- `three-gpu-pathtracer` progressive rendering
- Builds BVH from scene
- Progressive: starts noisy, converges to clean image
- Pause on camera move, restart on interaction
- Denoise filter for faster visual convergence

### 4.3 Material Library

| Material | Roughness | Metalness | Special |
|----------|-----------|-----------|---------|
| PLA Matte | 0.8 | 0.0 | Base colors |
| PLA Glossy | 0.3 | 0.0 | Clear coat |
| Wood PLA | 0.9 | 0.0 | Wood grain texture |
| Silk PLA | 0.2 | 0.7 | Anisotropic sheen |
| Marble PLA | 0.4 | 0.0 | Procedural veins |
| Carbon Fiber | 0.6 | 0.1 | Woven texture |
| TPU | 0.95 | 0.0 | Translucent |

---

## 5. File I/O Architecture

### 5.1 Import Pipeline
```
File -> Format Detection (by extension + magic bytes)
     -> Loader (Three.js / opencascade.js)
     -> THREE.BufferGeometry
     -> Validation (manifold check, triangle count)
     -> Optional repair (Manifold)
     -> Add to scene as PartNode
```

### 5.2 Export Pipeline
```
PartNode -> Resolve geometry (from cache or regenerate)
         -> Apply world transform
         -> Format-specific serializer
         -> Write via Electron file dialog
```

### 5.3 Project Format (.3dpf)
```
project.3dpf (fflate ZIP archive):
  manifest.json       -- version, metadata
  state.json          -- full ProjectState (excluding meshCache)
  profiles.json       -- custom frame profiles
  meshes/
    {meshDataId}.bin  -- binary mesh data for imported models
  thumbnails/
    preview.png       -- project thumbnail
```

---

## 6. Electron IPC API

```typescript
// Exposed via contextBridge as window.api
interface ElectronAPI {
  // File operations
  openFile(filters: FileFilter[]): Promise<{ path: string; data: ArrayBuffer } | null>;
  saveFile(data: ArrayBuffer, defaultName: string, filters: FileFilter[]): Promise<string | null>;

  // Project
  openProject(): Promise<{ path: string; data: ArrayBuffer } | null>;
  saveProject(data: ArrayBuffer, path?: string): Promise<string | null>;

  // Printer profiles
  getPrinterProfiles(): Promise<PrinterConfig[]>;
  savePrinterProfile(profile: PrinterConfig): Promise<void>;
  deletePrinterProfile(id: string): Promise<void>;

  // App
  getAppPath(): Promise<string>;
  setTitle(title: string): void;
  isMaximized(): Promise<boolean>;
  onMenuAction(callback: (action: string) => void): void;
}
```

---

## 7. Web Workers

### 7.1 CSG Worker (`csg.worker.ts`)
```typescript
// Messages IN:
| { type: 'init' }                                    // Load Manifold WASM
| { type: 'boolean'; op: CSGOp; meshA: TransferableMesh; meshB: TransferableMesh }
| { type: 'split'; mesh: TransferableMesh; plane: { normal: vec3; offset: number } }

// Messages OUT:
| { type: 'ready' }
| { type: 'result'; mesh: TransferableMesh }
| { type: 'progress'; percent: number }
| { type: 'error'; message: string }

// TransferableMesh uses SharedArrayBuffer or transferable ArrayBuffers
interface TransferableMesh {
  positions: Float32Array;  // [x,y,z, x,y,z, ...]
  indices: Uint32Array;     // [i0,i1,i2, ...]
}
```

### 7.2 Relief Worker (`relief.worker.ts`)
Receives height map + surface mesh, performs displacement, returns displaced mesh.

---

## 8. UI Layout

```
+-------------------------------------------------------------------+
|  Menu Bar                                                         |
+--------+------------------------------------------+---------------+
|        |                                          |               |
| Part   |         3D Viewport                      | Properties    |
| Tree   |         (R3F Canvas)                     | Panel         |
| Panel  |                                          |               |
|        |                                          | - Transform   |
|        |                                          | - Geometry    |
| 250px  |         flex                             | - Material    |
|        |                                          | - Connectors  |
|        |                                          |               |
|        |                                          | 300px         |
+--------+------------------------------------------+---------------+
|  Toolbar  | Status Bar                            | Render Mode   |
+-------------------------------------------------------------------+
```

**Panels**: Resizable with drag handles. Collapsible.
**Toolbar**: Frame tools, split tools, decoration tools, render mode toggle.
**Status Bar**: Vertex/face count, build volume fit status, operation progress.

---

## 9. Testing Strategy

| Layer | Test Type | Framework | Coverage Target |
|-------|-----------|-----------|----------------|
| Core Engine | Unit tests | Vitest | 90% |
| ManifoldAdapter | Unit tests | Vitest | 95% (critical for print quality) |
| Connectors | Unit + visual | Vitest + manual | 85% |
| Splitting | Unit tests | Vitest | 90% |
| Importers | Integration | Vitest + test files | 80% |
| Exporters | Integration | Vitest + round-trip | 85% |
| Stores | Unit tests | Vitest | 80% |
| UI Components | Manual | Manual QA | - |

**Key test cases**:
- CSG output is always manifold (watertight) - test with Manifold.status()
- Round-trip: create frame -> export STL -> re-import -> compare geometry
- Split + connectors: verify male/female pieces fit (no overlap, gap < tolerance)
- Bas-relief: height map values within expected range

---

## 10. Performance Budget

| Operation | Target | Strategy |
|-----------|--------|----------|
| Frame generation | < 500ms | Direct geometry construction |
| CSG preview | < 100ms | three-bvh-csg (approximate) |
| CSG commit | < 10s | Manifold in Worker, show progress |
| Bas-relief | < 5s | Offscreen render + Worker |
| File import (< 1M tris) | < 3s | Streaming parser |
| File import (STEP) | < 30s | opencascade.js, lazy loaded |
| Path tracer convergence | < 10s | Progressive, pause on interaction |
| Project save | < 2s | fflate compression in Worker |
| Viewport FPS | > 30 | LOD, frustum culling, instancing |

---

## 11. Dependencies

### Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| three | ^0.183.0 | 3D engine |
| @react-three/fiber | ^9.5.0 | React-Three.js bridge |
| @react-three/drei | ^10.7.0 | Three.js helpers |
| manifold-3d | ^3.4.0 | Watertight CSG (WASM) |
| three-gpu-pathtracer | ^0.0.24 | Path-traced rendering |
| three-mesh-bvh | ^0.9.9 | BVH raycasting |
| three-bvh-csg | ^0.0.18 | Fast CSG preview |
| zustand | ^5.0.0 | State management |
| immer | ^11.1.0 | Immutable state updates |
| react | ^19.0.0 | UI framework |
| react-dom | ^19.0.0 | React DOM |
| nanoid | ^5.0.0 | ID generation |
| fflate | ^0.8.0 | ZIP compression |
| opencascade.js | ^1.1.0 | STEP import (lazy) |
| jspdf | ^2.5.0 | Assembly guide PDF |
| tailwindcss | ^4.0.0 | UI styling |

### Dev
| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^41.0.0 | Desktop runtime |
| electron-vite | ^5.0.0 | Build tool |
| typescript | ^5.7.0 | Type system |
| vitest | ^3.0.0 | Testing |
| @vitejs/plugin-react | ^4.0.0 | React HMR |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Manifold WASM slow init | Medium | Low | Splash screen, WASM cache |
| opencascade.js 20MB+ download | High | Medium | Lazy-load on first STEP import with progress bar |
| Non-manifold imported meshes | High | High | Auto-repair via Manifold, warn if fails, offer simplification |
| CSG on complex meshes freezes | Medium | High | Web Worker + progress + mesh simplification option |
| Path tracer GPU compatibility | Medium | Medium | Fallback to PBR-only, detect WebGL2 vs WebGPU |
| Electron security (file access) | Low | High | contextBridge isolation, no nodeIntegration in renderer |
| Large project files | Low | Medium | fflate compression, store params not meshes where possible |
