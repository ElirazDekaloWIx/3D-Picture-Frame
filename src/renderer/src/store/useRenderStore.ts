import { create } from 'zustand'
import type { RenderMode } from '@core/types'

interface RenderState {
  renderMode: RenderMode
  environmentPreset: string
  showShadows: boolean
  backgroundColor: string

  setRenderMode: (mode: RenderMode) => void
  toggleRenderMode: () => void
  setEnvironment: (preset: string) => void
  setShowShadows: (show: boolean) => void
}

export const useRenderStore = create<RenderState>()((set) => ({
  renderMode: 'pbr',
  environmentPreset: 'studio',
  showShadows: true,
  backgroundColor: '#0f0f23',

  setRenderMode: (mode) => set({ renderMode: mode }),
  toggleRenderMode: () =>
    set((s) => ({ renderMode: s.renderMode === 'pbr' ? 'pathtraced' : 'pbr' })),
  setEnvironment: (preset) => set({ environmentPreset: preset }),
  setShowShadows: (show) => set({ showShadows: show })
}))
