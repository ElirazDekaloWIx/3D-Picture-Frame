/**
 * Cloner store - manages live cloner state.
 * Cloner places copies of a source geometry along the frame path.
 */

import { create } from 'zustand'

export interface ClonerState {
  enabled: boolean
  sourcePartIds: string[]
  count: number
  offset: number              // distance from frame path (outward)
  rotationOffset: number      // degrees - base rotation
  scale: number
  zOffset: number
  spacing: 'even' | 'random'  // even = equal spacing, random = randomized positions along path
  stepRotation: number        // incremental rotation per clone (degrees)
  stepScale: number           // incremental scale per clone (multiplier, e.g. 0.95 = shrink each)
  flipAlternate: boolean      // flip every other clone
  randomSeed: number
  randomPosition: number      // random position jitter along outward (mm)
  randomRotation: number      // random rotation jitter (degrees)
  randomScale: number         // random scale jitter (0-1)
  randomSpacing: number       // random offset along path (0-1, 0=even, 1=fully random)
  randomZ: number             // random Z jitter (mm)

  setEnabled: (v: boolean) => void
  addSource: (id: string) => void
  removeSource: (id: string) => void
  clearSources: () => void
  set: (partial: Partial<ClonerState>) => void
}

export const useClonerStore = create<ClonerState>()((set) => ({
  enabled: false,
  sourcePartIds: [],
  count: 8,
  offset: 0,
  rotationOffset: 0,
  scale: 1,
  zOffset: 0,
  spacing: 'even',
  stepRotation: 0,
  stepScale: 0,
  flipAlternate: false,
  randomSeed: 42,
  randomPosition: 0,
  randomRotation: 0,
  randomScale: 0,
  randomSpacing: 0,
  randomZ: 0,

  setEnabled: (v) => set({ enabled: v }),
  addSource: (id) => set((s) => ({ sourcePartIds: s.sourcePartIds.includes(id) ? s.sourcePartIds : [...s.sourcePartIds, id] })),
  removeSource: (id) => set((s) => ({ sourcePartIds: s.sourcePartIds.filter(x => x !== id) })),
  clearSources: () => set({ sourcePartIds: [], enabled: false }),
  set: (partial) => set(partial),
}))
