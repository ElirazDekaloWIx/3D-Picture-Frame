/**
 * Temporary store for split preview state.
 * Holds the calculated split planes before the user commits them.
 */

import { create } from 'zustand'
import type { ConnectorType, ConnectorParams } from '@core/types'

interface SplitPlanePreview {
  normal: [number, number, number]
  offset: number
  axis: 'x' | 'y' | 'z'
}

interface SplitPreviewState {
  previewPlanes: SplitPlanePreview[]
  connectorType: ConnectorType
  connectorParams: ConnectorParams
  isSplitting: boolean  // true while CSG operation is running

  setPreviewPlanes: (planes: SplitPlanePreview[]) => void
  setConnectorType: (type: ConnectorType) => void
  setConnectorParams: (params: Partial<ConnectorParams>) => void
  clearPreview: () => void
  setIsSplitting: (v: boolean) => void
}

export const useSplitPreviewStore = create<SplitPreviewState>()((set) => ({
  previewPlanes: [],
  connectorType: 'snap-fit',
  connectorParams: { tolerance: 0.2, size: 5.0 },
  isSplitting: false,

  setPreviewPlanes: (planes) => set({ previewPlanes: planes }),
  setConnectorType: (type) => set({ connectorType: type }),
  setConnectorParams: (params) => set((s) => ({
    connectorParams: { ...s.connectorParams, ...params }
  })),
  clearPreview: () => set({ previewPlanes: [], isSplitting: false }),
  setIsSplitting: (v) => set({ isSplitting: v })
}))
