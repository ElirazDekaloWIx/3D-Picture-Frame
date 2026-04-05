# 3D Picture Frame Designer - Product Requirements Document

**Version**: 1.0
**Date**: 2026-04-03
**Status**: Draft

---

## 1. Overview

### 1.1 Product Vision
A desktop application that enables users to design, customize, and prepare 3D-printable picture frames. The tool bridges the gap between creative frame design and 3D printing production - allowing users to go from idea to print-ready files in a single workflow.

### 1.2 Problem Statement
Designing 3D-printable picture frames today requires:
- CAD software expertise (Fusion 360, Blender) for frame modeling
- Manual splitting of large frames to fit print beds
- Separate tools for adding decorative elements
- No dedicated workflow for connectors between split parts
- No specialized bas-relief or surface decoration tools

This tool consolidates the entire workflow into one purpose-built application.

### 1.3 Target Users
- **Primary**: 3D printing enthusiasts who want custom picture frames
- **Secondary**: Small businesses producing custom frames
- **Tertiary**: Artists wanting to incorporate 3D-printed frames in their work

### 1.4 Target Printer
- **Reference**: Bambu Lab A1 (256x256x256mm build volume)
- **Configurable**: Any FDM printer with custom build volume settings

---

## 2. User Stories

### 2.1 Frame Design
- **US-1**: As a user, I can create a picture frame by specifying dimensions (width, height, depth) and selecting a cross-section profile
- **US-2**: As a user, I can choose from template frames (Classic, Floating, Shadow Box) as starting points
- **US-3**: As a user, I can build a frame from scratch using free-form modular parts
- **US-4**: As a user, I can edit frame profile curves (flat, ogee, round, bevel, scoop, custom spline)
- **US-5**: As a user, I can duplicate parts with mirror/symmetry options
- **US-6**: As a user, I can see a part tree (outliner) and select/rename/reorder parts

### 2.2 Splitting & Connectors
- **US-7**: As a user, I can auto-split a frame to fit my printer's build volume
- **US-8**: As a user, I can manually place split planes anywhere on the frame
- **US-9**: As a user, I can choose connector types (snap-fit, dovetail, pin+hole, mortise-tenon) for each split
- **US-10**: As a user, I can adjust connector parameters (tolerance, size, angle)
- **US-11**: As a user, I can preview how split parts fit together

### 2.3 Decoration & Model Import
- **US-12**: As a user, I can import 3D models (STL, OBJ, GLTF, PLY, STEP, 3MF)
- **US-13**: As a user, I can place imported models on the frame surface with snap-to-surface
- **US-14**: As a user, I can keep imported models as full 3D volumes attached to the frame
- **US-15**: As a user, I can convert imported models to bas-relief (flatten to surface)
- **US-16**: As a user, I can use cookie-cutter mode to cut a model's silhouette from the frame
- **US-17**: As a user, I can merge (boolean union) decorations into the frame geometry
- **US-18**: As a user, I can array-duplicate decorations (linear, circular, grid patterns)
- **US-19**: As a user, I can mirror decorations across frame axes
- **US-20**: As a user, I can manually adjust individual copies in a duplicated array

### 2.4 Model Placement Modes
When an imported model is placed on the frame, the user selects one of these modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Attached** | Full 3D model sits on surface, keeps original volume | Figurines, ornaments, raised elements |
| **Merged** | Boolean union into frame (becomes one mesh) | Structural decorations, integrated design |
| **Bas-Relief** | Flattened to surface with controllable depth | Portraits, patterns, texture |
| **Cookie Cutter** | Silhouette cut from frame surface | Openwork, negative space designs |

### 2.5 Rendering & Preview
- **US-21**: As a user, I can work in real-time PBR mode with filament material presets
- **US-22**: As a user, I can switch to ray-traced preview for photorealistic rendering
- **US-23**: As a user, I can choose materials that match real filaments (PLA, Wood PLA, Silk PLA, Marble PLA, etc.)
- **US-24**: As a user, I can select HDRI environments for realistic lighting
- **US-25**: As a user, I can save high-resolution renders as PNG/JPEG

### 2.6 Export & Production
- **US-26**: As a user, I can export individual parts as STL/OBJ/3MF for slicing
- **US-27**: As a user, I can batch-export all parts at once
- **US-28**: As a user, I can generate an assembly guide (exploded view, numbered parts, PDF)
- **US-29**: As a user, I can save/load projects (.3dpf format)
- **US-30**: As a user, I can see print setting recommendations per part (infill, supports, orientation)

---

## 3. Functional Requirements

### 3.1 Frame Designer (FR-100)
- **FR-101**: Parametric frame generation from dimensions + profile
- **FR-102**: Profile editor with preset profiles and custom spline editing
- **FR-103**: Template system (Classic, Floating, Shadow Box, extensible)
- **FR-104**: Free-form part creation (extrude, revolve from curves)
- **FR-105**: Part tree management (add, delete, rename, reorder, group, lock, hide)
- **FR-106**: Transform gizmo (translate, rotate, scale) per part
- **FR-107**: Undo/redo (unlimited, session-scoped)

### 3.2 Splitting System (FR-200)
- **FR-201**: Auto-split based on printer build volume
- **FR-202**: Manual split plane placement (draggable in viewport)
- **FR-203**: Recursive splitting if parts still exceed build volume
- **FR-204**: Split preview before committing
- **FR-205**: Part labeling post-split

### 3.3 Connector System (FR-300)
- **FR-301**: Snap-fit connectors (male/female clips)
- **FR-302**: Dovetail connectors
- **FR-303**: Pin + hole connectors
- **FR-304**: Mortise-tenon connectors
- **FR-305**: Per-connector parameter editing (tolerance 0.1-0.5mm, size, angle)
- **FR-306**: Auto-insertion at split planes
- **FR-307**: Manual connector placement

### 3.4 Decoration System (FR-400)
- **FR-401**: Import models in STL, OBJ, GLTF/GLB, PLY, STEP, 3MF formats
- **FR-402**: Surface snapping via BVH raycasting
- **FR-403**: Placement modes: Attached, Merged, Bas-Relief, Cookie Cutter
- **FR-404**: Bas-relief parameters: max depth, resolution, smoothing, invert
- **FR-405**: Cookie cutter parameters: cut depth, offset, draft angle
- **FR-406**: Array duplication: linear, circular, grid with spacing/count
- **FR-407**: Mirror duplication across X/Y/Z planes
- **FR-408**: Individual variation editing of array copies
- **FR-409**: Boolean operations: union, subtract, intersect (via Manifold, watertight)

### 3.5 Rendering (FR-500)
- **FR-501**: Real-time PBR mode (MeshPhysicalMaterial)
- **FR-502**: Path-traced mode (three-gpu-pathtracer)
- **FR-503**: Material presets matching real filaments
- **FR-504**: HDRI environment maps (preset + custom load)
- **FR-505**: Render capture (PNG/JPEG, configurable resolution)

### 3.6 Export (FR-600)
- **FR-601**: STL export (binary)
- **FR-602**: OBJ + MTL export
- **FR-603**: GLTF/GLB export
- **FR-604**: 3MF export (XML + binary mesh, ZIP)
- **FR-605**: Batch export (all parts, per-part naming)
- **FR-606**: Assembly guide PDF (exploded view, part list, connector instructions)
- **FR-607**: Project save/load (.3dpf: JSON metadata + binary meshes, fflate compressed)

### 3.7 Printer Configuration (FR-700)
- **FR-701**: Build volume (X, Y, Z)
- **FR-702**: Nozzle diameters (0.2/0.4/0.6/0.8mm)
- **FR-703**: Material compatibility list
- **FR-704**: Build volume ghost visualization in viewport
- **FR-705**: Printer profile save/load (presets for popular printers)

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1**: Frame generation < 500ms for standard frames
- **NFR-2**: CSG operations run in Web Workers (no UI freeze)
- **NFR-3**: Viewport maintains 30+ FPS during editing
- **NFR-4**: Path tracer reaches acceptable quality within 10 seconds
- **NFR-5**: Project load < 3 seconds for typical projects

### 4.2 Usability
- **NFR-6**: Keyboard shortcuts for all common operations
- **NFR-7**: RTL UI support (Hebrew)
- **NFR-8**: Dark theme default (standard for 3D tools)
- **NFR-9**: Tooltips on all tools and parameters

### 4.3 Reliability
- **NFR-10**: Auto-save every 2 minutes
- **NFR-11**: Crash recovery (restore last auto-save)
- **NFR-12**: All exported meshes must be manifold (watertight) - verified via Manifold library

### 4.4 Compatibility
- **NFR-13**: Windows 10/11 (primary), macOS (secondary), Linux (tertiary)
- **NFR-14**: GPU: WebGL 2.0 minimum, WebGPU optional for path tracer

---

## 5. User Flows

### 5.1 Create a Frame (Happy Path)
1. Open app -> New Project
2. Select template (Classic Frame) or start blank
3. Set dimensions: picture size (e.g., 20x30cm), frame width (4cm), depth (2cm)
4. Choose profile (e.g., Ogee)
5. Preview in viewport, adjust as needed
6. Save project

### 5.2 Add Decoration
1. Click "Import Model" -> select STL file
2. Model appears floating in viewport
3. Hover over frame surface -> model snaps to surface normal
4. Click to place
5. Choose mode: Attached / Bas-Relief / Cookie Cutter
6. Adjust parameters (for relief: depth, smoothing)
7. Optionally: Array duplicate along frame edge
8. Commit (for Merged/Relief/Cookie: CSG operation runs in background)

### 5.3 Split for Printing
1. Click "Auto-Split" -> system analyzes frame vs build volume
2. Split planes shown as translucent red planes
3. User adjusts planes if needed (drag)
4. Select connector type per split
5. Click "Apply Split"
6. Parts appear in tree with labels ("Rail-Top-Left", "Rail-Top-Right", etc.)

### 5.4 Export for Printing
1. Click "Export" -> Export dialog
2. Select parts (all or specific)
3. Choose format (STL recommended for slicing)
4. Set options (binary, coordinate system)
5. Click "Export" -> parts saved to chosen folder
6. Optionally: Generate assembly guide PDF

---

## 6. Edge Cases & Constraints

- **EC-1**: Imported models may be non-manifold -> auto-repair attempt via Manifold, warn user if fails
- **EC-2**: Very large models (>1M triangles) -> offer simplification before CSG
- **EC-3**: STEP files require opencascade.js (~20MB) -> lazy-load with progress indicator
- **EC-4**: Cookie cutter on thin frame walls may create unprintable geometry -> warn if wall thickness < 1mm
- **EC-5**: Connector tolerance varies by printer -> include printer-specific presets and test print recommendations

---

## 7. Success Metrics

- **M-1**: User can go from empty project to print-ready files in under 15 minutes for a simple frame
- **M-2**: All exported meshes pass slicer manifold check (0 errors in PrusaSlicer/Bambu Studio)
- **M-3**: Split parts fit together with < 0.3mm gap using default connector tolerances
- **M-4**: Application handles frames with 50+ decoration elements without dropping below 30 FPS

---

## 8. Out of Scope (v1)

- Resin/SLA printer support (different constraints)
- Multi-color printing support
- Cloud sync / collaboration
- Marketplace for sharing frame designs
- AI-generated decorations
- Animation / turntable video export
- Direct slicer integration (e.g., send to Bambu Studio)
