# 3D Picture Frame Designer - Project Guidelines

## Project Overview
Desktop application (Electron + React + Three.js) for designing 3D-printable picture frames.
Target printer: Bambu Lab A1 (256x256x256mm). See `docs/PRD.md` and `docs/TDD.md` for full specs.

## Tech Stack
- Electron 41 + electron-vite 5
- React 19 + TypeScript 5 + @react-three/fiber 9
- Three.js 0.183
- manifold-3d (WASM CSG)
- Zustand 5 + Immer 11
- Tailwind CSS 4
- Vitest for testing

## Project Structure
```
src/main/           -- Electron main process
src/preload/        -- Context bridge
src/renderer/src/
  core/             -- Pure TS geometry engine (NO React imports)
  store/            -- Zustand stores
  scene/            -- R3F 3D scene components
  rendering/        -- Materials, path tracer
  io/               -- Import/export
  ui/               -- React UI panels and layout
  workers/          -- Web Workers for CSG/relief
```

## Architecture Rules

### Core Engine Isolation
`src/renderer/src/core/` must NEVER import React, R3F, or any UI code.
It operates on plain TypeScript types and Three.js math/geometry only.
This enables testing without DOM and running in Web Workers.

### State Management
- All app state lives in Zustand stores (`src/renderer/src/store/`)
- Use Immer for all store updates (immutable)
- Undo/redo via Immer patches middleware
- `meshCache` is transient - never in undo stack, never serialized

### CSG Dual-Engine
- `three-bvh-csg`: Real-time preview ONLY. May produce non-manifold output.
- `manifold-3d`: Final commit. Always watertight. Runs in Web Worker.
- NEVER use three-bvh-csg output for export. Always use Manifold for final geometry.

### Web Workers
- All CSG operations > trivial must run in csg.worker.ts
- All relief operations must run in relief.worker.ts
- Use transferable ArrayBuffers for mesh data transfer
- Show progress bar during worker operations

## Coding Conventions

### TypeScript
- Strict mode enabled
- No `any` types - use `unknown` if type is truly unknown
- Prefer interfaces for object shapes, types for unions
- Use discriminated unions for geometry source kinds

### React / R3F
- Functional components only
- Use `useFrame` hook for per-frame logic in R3F
- Never access Three.js scene directly - use refs and R3F patterns
- Keep R3F components focused - one component per visual concern

### Naming
- Files: PascalCase for components/classes (`FrameGenerator.ts`), camelCase for utils (`meshUtils.ts`)
- Types: PascalCase (`PartNode`, `ConnectorSlot`)
- Functions: camelCase (`generateFrame`, `autoSplit`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_TOLERANCE`)
- Store hooks: `use{Name}Store` (`useProjectStore`)

### Testing
- Test files: `*.test.ts` next to source files OR in `tests/` directory
- Core engine: 90% unit test coverage target
- ManifoldAdapter: 95% coverage (critical for print quality)
- Test CSG output is manifold (watertight) using `Manifold.status()`

## Common Commands
```bash
npm run dev        # Start Electron dev mode with HMR
npm run build      # Build for production
npm run test       # Run Vitest tests
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
```

## Key Decisions Log
| Decision | Choice | Rationale |
|----------|--------|-----------|
| CSG engine | manifold-3d | Only library guaranteeing watertight output for 3D printing |
| State management | Zustand + Immer | Standard for R3F apps, no Provider wrapper needed |
| Build tool | electron-vite | Vite speed + proper Electron multi-process handling |
| CSG preview | three-bvh-csg | Instant visual feedback before committing with Manifold |
| Path tracer | three-gpu-pathtracer | Best Three.js path tracer, progressive rendering |
| STEP support | opencascade.js | Only WASM option for STEP, lazy-loaded due to 20MB size |

## File Format Notes
- All exported meshes MUST be manifold (watertight)
- Binary STL preferred for export (smaller files)
- 3MF is a ZIP containing XML + binary mesh data
- STEP import requires lazy-loading opencascade.js (~20MB WASM)
- Project format (.3dpf) is fflate ZIP with JSON metadata + binary meshes

## UI Language
- Primary UI: English
- RTL support: prepared for Hebrew (future)
- Dark theme default

## Performance Guidelines
- Frame generation: < 500ms
- CSG preview: < 100ms (three-bvh-csg)
- Viewport: > 30 FPS during editing
- Heavy operations (CSG commit, relief): always in Web Worker with progress
- Lazy-load: opencascade.js, path tracer module
