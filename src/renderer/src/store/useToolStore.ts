import { create } from 'zustand'
import type { ToolMode } from '@core/types'

interface ToolState {
  activeTool: ToolMode
  snapEnabled: boolean
  gridVisible: boolean
  buildVolumeVisible: boolean
  wireframeOverlay: boolean

  setTool: (tool: ToolMode) => void
  toggleSnap: () => void
  toggleGrid: () => void
  toggleBuildVolume: () => void
  toggleWireframe: () => void
}

export const useToolStore = create<ToolState>()((set) => ({
  activeTool: 'select',
  snapEnabled: true,
  gridVisible: false,
  buildVolumeVisible: false,
  wireframeOverlay: true,

  setTool: (tool) => set({ activeTool: tool }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleBuildVolume: () => set((s) => ({ buildVolumeVisible: !s.buildVolumeVisible })),
  toggleWireframe: () => set((s) => ({ wireframeOverlay: !s.wireframeOverlay }))
}))
