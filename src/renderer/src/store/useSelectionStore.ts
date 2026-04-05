import { create } from 'zustand'
import type { PartId } from '@core/types'

interface SelectionState {
  selectedPartIds: PartId[]
  hoveredPartId: PartId | null

  select: (partId: PartId) => void
  selectMultiple: (partIds: PartId[]) => void
  toggleSelect: (partId: PartId) => void
  addToSelection: (partId: PartId) => void
  deselectAll: () => void
  setHovered: (partId: PartId | null) => void
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedPartIds: [],
  hoveredPartId: null,

  select: (partId) => set({ selectedPartIds: [partId] }),

  selectMultiple: (partIds) => set({ selectedPartIds: partIds }),

  toggleSelect: (partId) => {
    const current = get().selectedPartIds
    if (current.includes(partId)) {
      set({ selectedPartIds: current.filter((id) => id !== partId) })
    } else {
      set({ selectedPartIds: [...current, partId] })
    }
  },

  addToSelection: (partId) => {
    const current = get().selectedPartIds
    if (!current.includes(partId)) {
      set({ selectedPartIds: [...current, partId] })
    }
  },

  deselectAll: () => set({ selectedPartIds: [] }),

  setHovered: (partId) => set({ hoveredPartId: partId })
}))
