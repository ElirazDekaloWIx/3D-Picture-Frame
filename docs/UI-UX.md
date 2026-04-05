# 3D Picture Frame Designer - UI/UX Design Document

**Version**: 1.0
**Date**: 2026-04-03
**Status**: Draft

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Viewport First** | The 3D viewport is the hero. UI panels support it, never compete with it. |
| **Progressive Disclosure** | Simple by default, power on demand. Advanced options hidden behind expand arrows. |
| **Non-Destructive** | Every operation is undoable. Destructive ops (delete, boolean commit) require confirmation. |
| **Direct Manipulation** | Prefer gizmos in viewport over sliders in panels. Click-drag > type values. |
| **Contextual Tools** | Panels and tools change based on selection and active mode. |
| **Dark by Default** | Dark theme standard for 3D tools. Reduces eye strain, better contrast for 3D content. |

---

## 2. Color System

```
Background:
  --bg-primary:     #1a1a2e    Panel backgrounds
  --bg-secondary:   #16213e    Sidebar backgrounds
  --bg-viewport:    #0f0f23    3D viewport background (gradient)
  --bg-hover:       #1f2940    Hover state
  --bg-active:      #253550    Active/selected state

Text:
  --text-primary:   #e8e8e8    Primary text
  --text-secondary: #8892a0    Labels, hints
  --text-disabled:  #4a5060    Disabled text

Accent:
  --accent-blue:    #4a9eff    Primary actions, selected items
  --accent-green:   #4ade80    Success, printable indicator
  --accent-orange:  #fb923c    Warnings, split planes
  --accent-red:     #f87171    Errors, delete actions
  --accent-purple:  #a78bfa    CSG operations, boolean

Gizmo Colors:
  --gizmo-x:        #ff4444    X axis (red)
  --gizmo-y:        #44ff44    Y axis (green)
  --gizmo-z:        #4488ff    Z axis (blue)

Viewport:
  --grid-major:     #333355    Major grid lines
  --grid-minor:     #222244    Minor grid lines
  --build-volume:   #fb923c33  Build volume ghost (semi-transparent orange)
```

---

## 3. Typography

```
Font Family: Inter (UI), JetBrains Mono (values/measurements)

Sizes:
  --text-xs:    11px    Status bar, tooltips
  --text-sm:    12px    Panel labels, tree items
  --text-base:  13px    Panel content, inputs
  --text-lg:    14px    Panel titles
  --text-xl:    16px    Dialog titles
  --text-2xl:   20px    Welcome screen

Weights:
  Regular (400): Body text, labels
  Medium (500):  Panel titles, button text
  SemiBold (600): Section headers
  Bold (700):    Dialog titles only
```

---

## 4. Application Layout

### 4.1 Main Layout (Master Wireframe)

```
+--[1]------------------------------------------------------------------+
| Logo  File  Edit  View  Tools  Frame  Render  Help         _ [] X     |
+--[2]------------------------------------------------------------------+
| [New] [Open] [Save] | [Select] [Move] [Rotate] [Scale] | [Split]     |
| [Undo] [Redo]       | [Snap] [Grid] [BuildVol]         | [Render▾]  |
+--[3]----+--[4]--------------------------------------------+--[5]------+
|         |                                                  |           |
| PART    |              3D VIEWPORT                         | PROPERTY  |
| TREE    |                                                  | PANEL     |
|         |        +--------+                                |           |
| > Frame |        | Gizmo  |     [camera cube]              | Transform |
|   > Rail|        +--------+                                |  X: 0.00  |
|   > Rail|                                                  |  Y: 0.00  |
|   > Rail|                                                  |  Z: 0.00  |
|   > Rail|                                                  |           |
|   > Corn|         [grid floor]                             | Geometry  |
|   > Corn|                                                  |  Profile  |
|   > Back|                                                  |  Width    |
|   > Stan|                                                  |           |
|         |                                                  | Material  |
| LAYERS  |                                                  |  [preset] |
| [+][-]  |                                                  |           |
|         |                                                  | Connector |
| 240px   |              flex (min 400px)                    | 280px     |
+---------+--------------------------------------------------+-----------+
|--[6]--------------------------------------------------------------------|
| Verts: 12,450 | Faces: 24,800 | Manifold: Yes | Fits: Yes | [PBR|PT]  |
+-------------------------------------------------------------------------|

Zones:
  [1] Menu Bar - Native Electron menu
  [2] Toolbar - Icon buttons, grouped by function
  [3] Part Tree Panel - Hierarchical scene outliner (left sidebar)
  [4] 3D Viewport - Main workspace (center)
  [5] Properties Panel - Context-sensitive inspector (right sidebar)
  [6] Status Bar - Stats, mode indicator, render toggle
```

### 4.2 Panel Behavior

| Panel | Default Width | Min Width | Collapsible | Resizable |
|-------|-------------|-----------|-------------|-----------|
| Part Tree | 240px | 180px | Yes (to 0) | Right edge drag |
| Properties | 280px | 220px | Yes (to 0) | Left edge drag |
| Viewport | flex | 400px | No | Fills remaining space |
| Toolbar | 100% | 100% | No | No |
| Status Bar | 100% | 100% | No | No |

**Collapse behavior**: Double-click on panel edge to collapse/expand. Collapsed panel shows a thin strip with expand arrow.

---

## 5. Toolbar Detail

### 5.1 Toolbar Layout

```
+-------------------------------------------------------------------------+
| [SECTION 1: File]  | [SECTION 2: Transform] | [SECTION 3: Tools]       |
|                     |                        |                          |
| [New][Open][Save]   | [Select][Move]         | [Split][Connect]         |
| [Undo][Redo]        | [Rotate][Scale]        | [Import][Decorate]       |
|                     |                        |                          |
+---------------------+------------------------+--------------------------+
|                        [SECTION 4: View]                                |
| [Snap: ON] [Grid: ON] [BuildVol: ON] [Wireframe: OFF]  |  [PBR ▾]    |
+-------------------------------------------------------------------------+
```

### 5.2 Tool Buttons

| Icon | Name | Shortcut | Behavior |
|------|------|----------|----------|
| 📄 | New Project | Ctrl+N | New project dialog |
| 📂 | Open | Ctrl+O | File open dialog |
| 💾 | Save | Ctrl+S | Save (Save As if no path) |
| ↩️ | Undo | Ctrl+Z | Undo last action |
| ↪️ | Redo | Ctrl+Shift+Z | Redo |
| ◇ | Select | V | Box/click select mode |
| ✥ | Move | G | Translate gizmo |
| ⟳ | Rotate | R | Rotation gizmo |
| ⤡ | Scale | S | Scale gizmo |
| ✂️ | Split | X | Enter split mode |
| 🔗 | Connectors | C | Connector placement mode |
| 📥 | Import Model | Ctrl+I | Import 3D file dialog |
| 🎨 | Decorate | D | Decoration placement mode |
| 🧲 | Snap | Shift+S | Toggle surface snapping |
| # | Grid | Shift+G | Toggle grid visibility |
| 📦 | Build Volume | Shift+B | Toggle build volume ghost |
| 🔲 | Wireframe | Z | Toggle wireframe overlay |

---

## 6. Panel Details

### 6.1 Part Tree Panel

```
+--[ Part Tree ]--[+][📁][🗑]--+
|                               |
| 🔍 [Search parts...]         |
|                               |
| ▼ 📦 Classic Frame           |
|   ├─ ▶ 📐 Rail Top           |
|   │    👁 🔒 🖨               |
|   ├─ ▶ 📐 Rail Bottom        |
|   │    👁 🔒 🖨               |
|   ├─ ▶ 📐 Rail Left          |
|   ├─ ▶ 📐 Rail Right         |
|   ├─ ▶ ◆ Corner TL           |
|   ├─ ▶ ◆ Corner TR           |
|   ├─ ▶ ◆ Corner BL           |
|   ├─ ▶ ◆ Corner BR           |
|   ├─ ▶ ▬ Back                |
|   └─ ▶ △ Stand               |
|                               |
| --- Decorations ---           |
|   ├─ 🌸 Flower Ornament      |
|   │    [Attached] 👁 🖨       |
|   ├─ 🦁 Lion Relief          |
|   │    [Bas-Relief] 👁 🖨     |
|   └─ ⭐ Star Pattern ×8      |
|        [Array] 👁 🖨          |
|                               |
+-------------------------------+

Icons:
  👁 = Visibility toggle (eye)
  🔒 = Lock toggle (prevents editing)
  🖨 = Printable toggle (included in export)
  📦 = Group node
  📐 = Frame rail
  ◆  = Frame corner
  ▬  = Frame back
  △  = Stand
  🌸 = Imported decoration
```

**Interactions**:
- Click: Select part (highlights in viewport)
- Double-click: Rename part inline
- Drag: Reorder / reparent (drag onto group to nest)
- Right-click: Context menu (Duplicate, Delete, Group, Ungroup, Focus, Hide Others)
- Shift+Click: Multi-select
- Ctrl+Click: Toggle selection

### 6.2 Properties Panel - Transform Section

```
+--[ Properties ]---------------+
|                               |
| [Transform] [Geometry]        |
| [Material] [Connectors]       |
|                               |
| ─── Transform ─────────────  |
|                               |
| Position                      |
|  X [  0.00  ] mm             |
|  Y [  0.00  ] mm             |
|  Z [  0.00  ] mm             |
|                               |
| Rotation                      |
|  X [  0.00  ] deg            |
|  Y [  0.00  ] deg            |
|  Z [  0.00  ] deg            |
|                               |
| Scale                         |
|  X [  1.00  ]  🔗            |
|  Y [  1.00  ]  (linked)      |
|  Z [  1.00  ]                |
|                               |
| ─── Info ───────────────────  |
|                               |
| Vertices: 2,340               |
| Faces: 4,680                  |
| Bounding Box: 120×40×25 mm   |
| Manifold: ✅ Yes              |
| Fits Build Vol: ✅ Yes        |
|                               |
+-------------------------------+

Interactions:
  - Click value: Enter edit mode, type number
  - Drag label (X/Y/Z): Scrub value (hold Shift for fine)
  - 🔗 icon: Toggle uniform/independent scale
  - Tab: Next field
  - Enter: Confirm value
```

### 6.3 Properties Panel - Geometry Section

```
+--[ Geometry ]------------------+
|                                |
| Source: Parametric             |
| Generator: FrameRail           |
|                                |
| ─── Frame Dimensions ────────  |
|                                |
| Picture Size                   |
|  Width  [ 200.0 ] mm          |
|  Height [ 300.0 ] mm          |
|                                |
| Frame                          |
|  Width  [  40.0 ] mm          |
|  Depth  [  20.0 ] mm          |
|                                |
| Back                           |
|  Thickness [  2.0 ] mm        |
|                                |
| ─── Profile ─────────────────  |
|                                |
|  [Flat][Ogee][Round][Bevel]    |
|  [Scoop][Custom]               |
|                                |
|  Preview:                      |
|  ┌──────────────┐              |
|  │    ╭──╮      │  <- profile  |
|  │   ╱    ╲     │     curve    |
|  │  │      │    │              |
|  │  └──────┘    │              |
|  └──────────────┘              |
|                                |
|  ▶ Advanced (spline editor)    |
|                                |
+--------------------------------+
```

### 6.4 Properties Panel - Material Section

```
+--[ Material ]------------------+
|                                |
| ─── Filament Preset ─────────  |
|                                |
| [PLA Matte      ▾]            |
|                                |
|  ┌────┐ ┌────┐ ┌────┐        |
|  │████│ │████│ │████│  ...    |
|  │Wht │ │Blk │ │Red │        |
|  └────┘ └────┘ └────┘        |
|                                |
| ─── Properties ──────────────  |
|                                |
| Color      [■ #FFFFFF] [🎨]   |
| Roughness  [====●=====] 0.80  |
| Metalness  [●=========] 0.00  |
| Clearcoat  [●=========] 0.00  |
|                                |
| ▶ Advanced                     |
|   Transmission  0.00           |
|   IOR           1.45           |
|   Sheen         0.00           |
|                                |
+--------------------------------+
```

### 6.5 Properties Panel - Connectors Section
(Visible when a split part is selected)

```
+--[ Connectors ]----------------+
|                                |
| Split: Rail-Top → 2 parts     |
|                                |
| ─── Connector Type ──────────  |
|                                |
| [Snap-fit ▾]                   |
|                                |
| ┌──────────────────────┐      |
| │  ╔══╗      ┌──┐      │  <- |
| │  ║  ║ ←──→ │  │      │  vis|
| │  ╚══╝      └──┘      │     |
| │  male      female     │     |
| └──────────────────────┘      |
|                                |
| Tolerance  [===●======] 0.20mm|
| Size       [=====●====] 5.0mm |
|                                |
| [Snap-fit] [Dovetail]         |
| [Pin+Hole] [Mortise]          |
|                                |
| [Preview Fit]  [Apply]         |
|                                |
+--------------------------------+
```

### 6.6 Properties Panel - Decoration Section
(Visible when a decoration is selected)

```
+--[ Decoration ]----------------+
|                                |
| Source: lion_statue.stl        |
| Triangles: 45,200             |
|                                |
| ─── Placement Mode ──────────  |
|                                |
| (●) Attached  (full volume)   |
| ( ) Merged    (boolean union)  |
| ( ) Bas-Relief (flattened)     |
| ( ) Cookie Cutter (cut out)    |
|                                |
| ─── Surface Snap ────────────  |
|                                |
| Offset [ 0.0 ] mm             |
| Align to Normal: [✓]          |
|                                |
| ─── Array ───────────────────  |
|                                |
| Pattern: [None ▾]              |
|   Linear | Circular | Grid     |
|                                |
| Count:   [ 8 ]                 |
| Spacing: [ 25.0 ] mm          |
| Mirror X: [ ]  Mirror Y: [ ]  |
|                                |
| [Edit Individual Copies]       |
|                                |
+--------------------------------+
```

### 6.7 Bas-Relief Sub-Panel
(Expands when Bas-Relief mode selected)

```
| ─── Bas-Relief Settings ─────  |
|                                |
| Max Depth   [====●====] 2.0mm |
| Resolution  [======●==]  512  |
| Smoothing   [==●======]  1.0  |
| Contrast    [=====●===]  1.0  |
| Invert:     [ ]               |
|                                |
|  Preview:                      |
|  ┌──────────────┐              |
|  │ ░░▒▒▓▓██▓▒░ │  depth map  |
|  │ ░▒▓██████▓▒ │  preview    |
|  │ ░░▒▒▓▓██▓▒░ │              |
|  └──────────────┘              |
|                                |
| [Preview CSG]  [Commit]        |
|                                |
```

---

## 7. Viewport Detail

### 7.1 Viewport Elements

```
+------------------------------------------------------------------+
|  [Perspective ▾]                            ┌───┐               |
|                                              │ T │  Navigation   |
|                                              │ F │  Cube         |
|                                              │ R │               |
|                                              └───┘               |
|                                                                   |
|           ╔═══════════════════╗                                  |
|           ║                   ║                                  |
|           ║   ┌─── Gizmo     ║                                  |
|           ║   │  ↑Y           ║                                  |
|     ┌─────╫───┼──→X          ╠─────┐                            |
|     │     ║   ↙Z             ║     │                            |
|     │     ║   FRAME MODEL    ║     │                            |
|     │     ╚═══════════════════╝     │  <- Build Volume          |
|     │          (orange wireframe)    │     Ghost                 |
|     └────────────────────────────────┘                           |
|                                                                   |
|  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  <- Grid floor         |
|                                                                   |
|  [+][-][Fit] [Ortho/Persp]                                      |
+------------------------------------------------------------------+
```

### 7.2 Camera Controls

| Action | Mouse | Touchpad | Keyboard |
|--------|-------|----------|----------|
| Orbit | Middle-drag | Two-finger drag | Alt+Left-drag |
| Pan | Shift+Middle-drag | Shift+Two-finger | Shift+Alt+Left-drag |
| Zoom | Scroll wheel | Pinch | + / - |
| Focus selected | - | - | Numpad . (or F) |
| Front view | - | - | Numpad 1 |
| Right view | - | - | Numpad 3 |
| Top view | - | - | Numpad 7 |
| Toggle ortho/persp | - | - | Numpad 5 |

### 7.3 Navigation Cube
Top-right corner. Click faces/edges/corners to snap to that view angle. Drag to orbit.

```
      ┌─────┐
     /  TOP /│
    ┌─────┐ │
    │FRONT│ R
    │     │/
    └─────┘
```

### 7.4 Gizmo Behavior

**Translate Gizmo (G)**:
```
        ↑ Y (green)
        │
        │    ╱ Z (blue)
   ─────┼───╱────→ X (red)
        │  ╱
        │

  - Drag axis arrow: Move along axis
  - Drag plane square: Move in plane
  - Drag center: Free move
  - Hold Shift: Snap to grid (5mm default)
  - Hold Ctrl: Fine mode (0.1mm steps)
```

**Rotate Gizmo (R)**:
```
     ╭───────╮
    ╱    Y    ╲
   │  ╭───╮   │
   │ │  Z  │  │ X
   │  ╰───╯   │
    ╲         ╱
     ╰───────╯

  - Drag ring: Rotate around axis
  - Hold Shift: Snap to 15° increments
  - Hold Ctrl: Snap to 5° increments
```

**Scale Gizmo (S)**:
```
     ■──────────■ Y
     │
     │    ■ Z
     │   ╱
     ■──■──────■ X

  - Drag cube handle: Scale along axis
  - Drag center cube: Uniform scale
  - Hold Shift: Snap to 0.1 increments
```

---

## 8. Dialogs

### 8.1 New Project Dialog

```
+--[ New Project ]------------------------------+
|                                                |
|  Project Name: [  My Frame  ]                 |
|                                                |
|  ─── Template ────────────────────────────    |
|                                                |
|  ┌────────┐ ┌────────┐ ┌────────┐            |
|  │ ┌────┐ │ │ ┌────┐ │ │ ┌────┐ │            |
|  │ │    │ │ │ │    │ │ │ │    │ │            |
|  │ │CLAS│ │ │ │FLOA│ │ │ │SHAD│ │            |
|  │ │SIC │ │ │ │TING│ │ │ │ BOX│ │            |
|  │ └────┘ │ │ └────┘ │ │ └────┘ │            |
|  │Classic │ │Floating│ │Shadow  │            |
|  │(●)     │ │( )     │ │Box ( ) │            |
|  └────────┘ └────────┘ └────────┘            |
|                                                |
|  ┌────────┐                                   |
|  │        │                                   |
|  │ BLANK  │                                   |
|  │        │                                   |
|  │Empty   │                                   |
|  │( )     │                                   |
|  └────────┘                                   |
|                                                |
|  ─── Dimensions ─────────────────────────     |
|                                                |
|  Picture:  Width [ 200 ] × Height [ 300 ] mm  |
|  Frame:    Width [  40 ] mm  Depth [  20 ] mm |
|  Profile:  [ Ogee ▾ ]                         |
|                                                |
|  ─── Printer ────────────────────────────     |
|                                                |
|  Preset: [ Bambu Lab A1 ▾ ]                   |
|  Build Volume: 256 × 256 × 256 mm             |
|                                                |
|          [Cancel]        [Create]              |
+------------------------------------------------+
```

### 8.2 Import Model Dialog

```
+--[ Import 3D Model ]--------------------------+
|                                                |
|  File: lion_statue.stl                         |
|  Size: 2.3 MB | 45,200 triangles             |
|                                                |
|  ─── Preview ────────────────────────────     |
|                                                |
|  ┌──────────────────────────────────┐         |
|  │                                   │         |
|  │       [3D preview of model]       │         |
|  │                                   │         |
|  └──────────────────────────────────┘         |
|                                                |
|  ─── Transform ──────────────────────────     |
|                                                |
|  Scale:    [ 100.0 ] %  [ ] mm mode           |
|  Auto-size to frame: [Fit Width ▾]            |
|                                                |
|  ─── Placement Mode ────────────────────     |
|                                                |
|  (●) Attached   - Full 3D on surface          |
|  ( ) Bas-Relief  - Flatten to surface          |
|  ( ) Cookie Cut  - Cut silhouette              |
|                                                |
|  ─── Mesh Quality ──────────────────────     |
|                                                |
|  ⚠ High poly (45K tris). Simplify?           |
|  [ ] Simplify to [ 10000 ] triangles          |
|                                                |
|  Manifold check: ✅ Watertight                |
|                                                |
|          [Cancel]     [Place on Frame]         |
+------------------------------------------------+
```

### 8.3 Split Dialog

```
+--[ Split for Printing ]------------------------+
|                                                 |
|  ─── Build Volume ──────────────────────────   |
|                                                 |
|  Printer: Bambu Lab A1 (256×256×256mm)         |
|  Part size: 380 × 40 × 20 mm                  |
|  ⚠ Exceeds X axis by 124mm                    |
|                                                 |
|  ─── Split Plan ────────────────────────────   |
|                                                 |
|  ┌──────────────────────────────────┐          |
|  │      ┊            ┊              │          |
|  │  A   ┊     B      ┊     C       │  <- top  |
|  │      ┊            ┊              │   view   |
|  └──────────────────────────────────┘          |
|         ↑ Split 1     ↑ Split 2                |
|                                                 |
|  Splits: 2 → 3 parts                          |
|  All parts fit: ✅                             |
|                                                 |
|  ─── Connector ─────────────────────────────   |
|                                                 |
|  Type: [ Snap-fit ▾ ]                          |
|  Tolerance: [ 0.20 ] mm                        |
|  Size: [ 5.0 ] mm                              |
|  Apply to: (●) All splits  ( ) Individual      |
|                                                 |
|  [ ] Include alignment pins                     |
|                                                 |
|       [Cancel]  [Edit Planes]  [Apply Split]   |
+-------------------------------------------------+
```

### 8.4 Export Dialog

```
+--[ Export ]------------------------------------+
|                                                |
|  ─── Parts ──────────────────────────────     |
|                                                |
|  [✓] Rail-Top-A          120×40×20mm  ✅      |
|  [✓] Rail-Top-B          136×40×20mm  ✅      |
|  [✓] Rail-Bottom-A       120×40×20mm  ✅      |
|  [✓] Rail-Bottom-B       136×40×20mm  ✅      |
|  [✓] Rail-Left           200×40×20mm  ✅      |
|  [✓] Rail-Right          200×40×20mm  ✅      |
|  [✓] Corner-TL           45×45×20mm   ✅      |
|  ...                                          |
|                                                |
|  [Select All] [Deselect] [Printable Only]     |
|                                                |
|  ─── Format ─────────────────────────────     |
|                                                |
|  (●) STL Binary  (recommended for slicing)     |
|  ( ) OBJ + MTL                                 |
|  ( ) 3MF                                       |
|  ( ) GLTF/GLB                                  |
|                                                |
|  ─── Options ────────────────────────────     |
|                                                |
|  Coordinate: [ Y-up ▾ ]                       |
|  Scale: [ 1.0 ] (mm)                          |
|  [✓] Generate assembly guide (PDF)            |
|  [✓] Include print recommendations             |
|                                                |
|  Output folder: [C:\Prints\MyFrame  ] [📁]    |
|                                                |
|          [Cancel]           [Export 12 parts]  |
+------------------------------------------------+
```

### 8.5 Render Capture Dialog

```
+--[ Render Capture ]----------------------------+
|                                                 |
|  ┌──────────────────────────────────┐          |
|  │                                   │          |
|  │    [Progressive render preview]   │          |
|  │                                   │          |
|  │    Samples: 128/512  ████░░ 25%  │          |
|  │                                   │          |
|  └──────────────────────────────────┘          |
|                                                 |
|  Resolution: [ 1920 ] × [ 1080 ]              |
|  Presets: [HD ▾] 720p | 1080p | 4K | Custom   |
|  Samples: [ 512 ]                              |
|  Environment: [ Studio Soft ▾ ]                |
|                                                 |
|  Background:                                    |
|  (●) Environment  ( ) Transparent  ( ) Color   |
|                                                 |
|       [Cancel]  [Stop]  [Save PNG]  [Save JPG] |
+-------------------------------------------------+
```

---

## 9. Interaction Flows

### 9.1 Frame Creation Flow

```
[New Project] ──→ [Select Template] ──→ [Set Dimensions] ──→ [Choose Profile]
      │                                                            │
      ▼                                                            ▼
[Empty Canvas]                                          [Frame Generated]
                                                               │
                                                               ▼
                                                     [Adjust in Viewport]
                                                         │         │
                                                         ▼         ▼
                                                   [Gizmo Edit] [Panel Edit]
                                                         │         │
                                                         └────┬────┘
                                                              ▼
                                                     [Frame Ready]
```

### 9.2 Decoration Flow

```
[Import Model] ──→ [Import Dialog] ──→ [Choose Mode] ──→ [Place on Surface]
                        │                    │                    │
                        ▼                    ▼                    ▼
                  [Preview + Scale]   [Attached/Relief/     [Snap to Normal]
                  [Simplify?]         Cookie Cutter]        [Drag to Position]
                                                                  │
                                             ┌────────────────────┤
                                             ▼                    ▼
                                      [If Relief/Cookie]   [If Attached]
                                             │                    │
                                             ▼                    ▼
                                      [Set Params]          [Done - Edit
                                      [Preview CSG]          Transform]
                                             │
                                             ▼
                                      [Commit CSG]
                                      (Worker, progress)
                                             │
                                             ▼
                                      [Result in Tree]
```

### 9.3 Split Flow

```
[Select Part] ──→ [Split Tool] ──→ [Auto-Split?] ──→ Yes ──→ [Calculate Splits]
                                        │                           │
                                        ▼ No                       ▼
                                  [Manual Plane]            [Show Split Planes]
                                  [Drag in Viewport]        [Adjust if Needed]
                                        │                           │
                                        └──────────┬───────────────┘
                                                   ▼
                                          [Choose Connectors]
                                                   │
                                                   ▼
                                          [Apply Split]
                                          (Worker, progress)
                                                   │
                                                   ▼
                                          [Parts in Tree]
                                          [Labels + Colors]
```

### 9.4 Export Flow

```
[Export Button] ──→ [Export Dialog] ──→ [Select Parts] ──→ [Choose Format]
                                                                │
                                                                ▼
                                                        [Set Options]
                                                                │
                                                                ▼
                                                        [Export Files]
                                                        (per-part naming)
                                                                │
                                              ┌─────────────────┤
                                              ▼                 ▼
                                        [Assembly PDF?]   [Files Saved]
                                              │             [Open Folder]
                                              ▼
                                        [Generate PDF]
                                        [Exploded View]
                                        [Part Numbers]
```

---

## 10. State Machines

### 10.1 Tool State Machine

```
                    ┌──────────┐
         V key      │  SELECT  │  Default state
              ┌────▶│          │◀────┐
              │     └──────────┘     │
              │          │           │
              │     G key│     Esc   │
              │          ▼     key   │
              │     ┌──────────┐     │
              │     │   MOVE   │─────┤
              │     └──────────┘     │
              │          │           │
              │     R key│           │
              │          ▼           │
              │     ┌──────────┐     │
              │     │  ROTATE  │─────┤
              │     └──────────┘     │
              │          │           │
              │     S key│           │
              │          ▼           │
              │     ┌──────────┐     │
              │     │  SCALE   │─────┤
              │     └──────────┘     │
              │          │           │
              │     X key│           │
              │          ▼           │
              │     ┌──────────┐     │
              │     │  SPLIT   │─────┤
              │     └──────────┘     │
              │          │           │
              │     D key│           │
              │          ▼           │
              │     ┌──────────┐     │
              └─────│ DECORATE │─────┘
                    └──────────┘
```

### 10.2 Decoration Placement State Machine

```
┌─────────┐   Import    ┌──────────┐   Click     ┌──────────┐
│  IDLE   │────────────▶│ FLOATING │────surface──▶│  PLACED  │
└─────────┘             └──────────┘              └──────────┘
                             │                         │
                        Mouse move:              Mode change:
                        snap to surface          Relief/Cookie
                             │                         │
                             ▼                         ▼
                        [Follow cursor           ┌──────────┐
                         + ghost preview]        │  PARAMS  │
                                                 └──────────┘
                                                       │
                                                  "Commit"
                                                       │
                                                       ▼
                                                 ┌──────────┐
                                                 │ CSG WORK │
                                                 │ (Worker) │
                                                 └──────────┘
                                                       │
                                                       ▼
                                                 ┌──────────┐
                                                 │   DONE   │
                                                 └──────────┘
```

### 10.3 Render Mode State Machine

```
┌─────────┐   Toggle    ┌──────────────┐
│   PBR   │◀───────────▶│  PATH TRACE  │
│  (work) │   Tab key   │  (preview)   │
└─────────┘             └──────────────┘
                              │
                        Camera move:
                        Pause + clear
                              │
                        Camera stop:
                        Resume render
```

---

## 11. Keyboard Shortcuts (Complete)

### 11.1 Global

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New Project |
| Ctrl+O | Open Project |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+I | Import Model |
| Ctrl+E | Export |
| Delete | Delete selected |
| Ctrl+D | Duplicate selected |
| Ctrl+A | Select all |
| Ctrl+Shift+A | Deselect all |
| H | Hide selected |
| Shift+H | Show all |
| F | Focus/frame selected |
| Tab | Toggle PBR / Path Tracer |

### 11.2 Tools

| Shortcut | Tool |
|----------|------|
| V | Select |
| G | Move |
| R | Rotate |
| S | Scale |
| X | Split mode |
| C | Connector mode |
| D | Decorate mode |
| Escape | Back to Select / Cancel operation |

### 11.3 Viewport

| Shortcut | Action |
|----------|--------|
| Numpad 1 | Front view |
| Numpad 3 | Right view |
| Numpad 7 | Top view |
| Numpad 5 | Toggle ortho/perspective |
| Numpad . | Focus selected |
| + / - | Zoom in/out |
| Shift+S | Toggle snapping |
| Shift+G | Toggle grid |
| Shift+B | Toggle build volume |
| Z | Toggle wireframe |

### 11.4 Modifiers (during tool operation)

| Modifier | Effect |
|----------|--------|
| Shift | Snap to grid / increment |
| Ctrl | Fine mode (0.1mm steps) |
| Alt | Copy on transform (duplicate) |
| X/Y/Z during move | Constrain to axis |
| Shift+X/Y/Z | Constrain to plane (exclude axis) |

---

## 12. Context Menus

### 12.1 Viewport Right-Click (on part)

```
┌─────────────────────────┐
│ Select             V    │
│ ─────────────────────── │
│ Move               G    │
│ Rotate             R    │
│ Scale              S    │
│ ─────────────────────── │
│ Duplicate       Ctrl+D  │
│ Mirror X               │
│ Mirror Y               │
│ ─────────────────────── │
│ Boolean Union      ▶   │
│ Boolean Subtract   ▶   │
│ Boolean Intersect  ▶   │
│ ─────────────────────── │
│ Split Here         X    │
│ Add Connector      C    │
│ ─────────────────────── │
│ Hide               H    │
│ Lock               L    │
│ Delete           Del    │
│ ─────────────────────── │
│ Properties...           │
└─────────────────────────┘
```

### 12.2 Viewport Right-Click (empty space)

```
┌─────────────────────────┐
│ Add ▶                    │
│   Frame Rail             │
│   Custom Shape           │
│   Import Model...        │
│ ─────────────────────── │
│ Paste           Ctrl+V  │
│ ─────────────────────── │
│ Frame All          F    │
│ Reset Camera            │
│ Toggle Grid      Shift+G│
│ Toggle Build Vol Shift+B│
└─────────────────────────┘
```

### 12.3 Part Tree Right-Click

```
┌─────────────────────────┐
│ Rename           F2     │
│ Duplicate       Ctrl+D  │
│ ─────────────────────── │
│ Group           Ctrl+G  │
│ Ungroup       Ctrl+Sh+G │
│ ─────────────────────── │
│ Focus in Viewport  F    │
│ Hide / Show        H    │
│ Lock / Unlock      L    │
│ ─────────────────────── │
│ Move Up            ↑    │
│ Move Down          ↓    │
│ ─────────────────────── │
│ Delete            Del   │
└─────────────────────────┘
```

---

## 13. Progress & Loading States

### 13.1 CSG Operation Progress

```
+--[ Boolean Union ]----+
|                        |
|  Merging geometry...   |
|                        |
|  ████████░░░░░ 65%    |
|                        |
|  Vertices: 8,420       |
|  ETA: ~3s              |
|                        |
|       [Cancel]         |
+------------------------+
```

### 13.2 STEP Import Loading

```
+--[ Loading STEP File ]--------+
|                                |
|  Loading opencascade.js...     |
|  ██████░░░░░░░░░░ 40%        |
|                                |
|  First use: downloading       |
|  WASM engine (~20MB)          |
|                                |
|       [Cancel]                 |
+--------------------------------+
```

### 13.3 Path Tracer Progress

```
Shown as overlay in viewport bottom:

  ┌──────────────────────────────────────┐
  │ Path Tracing: 128/512 samples  25%   │
  │ ████████░░░░░░░░░░░░░░░░░░░░░       │
  └──────────────────────────────────────┘
```

---

## 14. Responsive Behavior

### 14.1 Small Window (< 1200px)

```
+---------------------------------------+
| Menu | Toolbar (compact, overflow ▾)  |
+-------+-------------------------------+
|       |                               |
| Tree  |   3D Viewport                 |
| (180) |                               |
|       |                               |
+-------+-------------------------------+
| Properties (collapsed to bottom bar)  |
+---------------------------------------+
| Status Bar                            |
+---------------------------------------+

Properties panel moves to a collapsible bottom drawer.
```

### 14.2 Very Wide Window (> 1920px)

```
+-------------------------------------------------------------------+
| Menu | Toolbar (full, with labels)                                 |
+--------+------------------------------------------+--------+------+
|        |                                          |        |      |
| Part   |         3D Viewport                      | Props  | Lib  |
| Tree   |         (larger)                         |        | rary |
| (280)  |                                          | (300)  |(200) |
|        |                                          |        |      |
+--------+------------------------------------------+--------+------+
| Status Bar                                                        |
+-------------------------------------------------------------------+

Extra "Library" panel appears for materials/templates/decorations browser.
```

---

## 15. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | All panels navigable via Tab, all tools via shortcuts |
| Screen reader | ARIA labels on all interactive elements |
| Color contrast | All text meets WCAG AA (4.5:1 ratio) on dark background |
| Focus indicators | Visible blue ring on focused elements |
| Tooltips | All tools have descriptive tooltips with shortcut hints |
| Font scaling | UI respects system font size preference |
| Motion | Reduce motion preference disables viewport animations |

---

## 16. Empty States

### 16.1 Welcome Screen (No Project)

```
+------------------------------------------------------------------+
|                                                                    |
|              ┌──────────────────────┐                             |
|              │   3D Picture Frame   │                             |
|              │      Designer        │                             |
|              └──────────────────────┘                             |
|                                                                    |
|         ┌──────────┐    ┌──────────┐    ┌──────────┐            |
|         │          │    │          │    │          │            |
|         │  + New   │    │  📂 Open │    │  Recent  │            |
|         │ Project  │    │ Project  │    │ Projects │            |
|         │          │    │          │    │          │            |
|         └──────────┘    └──────────┘    └──────────┘            |
|                                                                    |
|         Recent:                                                    |
|         ├─ Wedding Frame.3dpf        (2 days ago)                |
|         ├─ Art Deco Frame.3dpf       (1 week ago)                |
|         └─ Minimalist Frame.3dpf     (2 weeks ago)               |
|                                                                    |
+------------------------------------------------------------------+
```

### 16.2 Empty Part Tree

```
+--[ Part Tree ]--------+
|                        |
|   No parts yet.        |
|                        |
|   Start by creating    |
|   a frame or importing |
|   a model.             |
|                        |
|   [+ New Frame]        |
|   [📥 Import Model]   |
|                        |
+------------------------+
```

---

## 17. Notifications & Feedback

| Event | Feedback Type | Duration |
|-------|--------------|----------|
| Save successful | Toast (green) | 2s |
| Export complete | Toast (green) + folder link | 5s |
| CSG operation complete | Toast (blue) | 3s |
| Manifold error | Toast (red) + details button | Persistent until dismissed |
| Part doesn't fit printer | Warning badge on part | Persistent |
| Undo | Toast (gray) "Undid: Move Rail-Top" | 2s |
| Clipboard | Toast (gray) "Copied 3 parts" | 2s |
