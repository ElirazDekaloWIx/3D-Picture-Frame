/**
 * Zustand middleware for undo/redo using Immer patches.
 * Captures forward and inverse patches for each state mutation.
 */

import { produceWithPatches, enablePatches, applyPatches, type Patch } from 'immer'
import type { StateCreator, StoreMutatorIdentifier } from 'zustand'

enablePatches()

interface UndoEntry {
  patches: Patch[]
  inversePatches: Patch[]
  description: string
}

export interface UndoState {
  _undo: {
    undoStack: UndoEntry[]
    redoStack: UndoEntry[]
    maxHistory: number
  }
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  getUndoDescription: () => string | undefined
  getRedoDescription: () => string | undefined
}

/** Fields excluded from undo tracking (transient/derived state) */
const EXCLUDED_FIELDS = new Set(['meshCache', '_undo'])

function filterPatches(patches: Patch[]): Patch[] {
  return patches.filter((p) => {
    const rootField = String(p.path[0])
    return !EXCLUDED_FIELDS.has(rootField)
  })
}

type UndoMiddleware = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<T, Mps, Mcs>,
  maxHistory?: number
) => StateCreator<T & UndoState, Mps, Mcs>

export const undoMiddleware: UndoMiddleware = (config, maxHistory = 100) => (set, get, api) => {
  const undoState: UndoState = {
    _undo: {
      undoStack: [],
      redoStack: [],
      maxHistory
    },

    undo: () => {
      const state = get() as unknown as UndoState
      const { undoStack, redoStack } = state._undo
      if (undoStack.length === 0) return

      const entry = undoStack[undoStack.length - 1]
      const newState = applyPatches(state as object, entry.inversePatches)

      set({
        ...newState,
        _undo: {
          ...state._undo,
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, entry]
        }
      } as Partial<typeof state> as never)
    },

    redo: () => {
      const state = get() as unknown as UndoState
      const { undoStack, redoStack } = state._undo
      if (redoStack.length === 0) return

      const entry = redoStack[redoStack.length - 1]
      const newState = applyPatches(state as object, entry.patches)

      set({
        ...newState,
        _undo: {
          ...state._undo,
          undoStack: [...undoStack, entry],
          redoStack: redoStack.slice(0, -1)
        }
      } as Partial<typeof state> as never)
    },

    canUndo: () => {
      const state = get() as unknown as UndoState
      return state._undo.undoStack.length > 0
    },

    canRedo: () => {
      const state = get() as unknown as UndoState
      return state._undo.redoStack.length > 0
    },

    getUndoDescription: () => {
      const state = get() as unknown as UndoState
      const stack = state._undo.undoStack
      return stack.length > 0 ? stack[stack.length - 1].description : undefined
    },

    getRedoDescription: () => {
      const state = get() as unknown as UndoState
      const stack = state._undo.redoStack
      return stack.length > 0 ? stack[stack.length - 1].description : undefined
    }
  }

  /** Tracked set that captures undo patches */
  const trackedSet = (
    updater: ((state: object) => void) | object,
    description = 'Edit'
  ): void => {
    const currentState = get() as object

    if (typeof updater === 'function') {
      const [nextState, patches, inversePatches] = produceWithPatches(currentState, updater)

      const filteredPatches = filterPatches(patches)
      const filteredInverse = filterPatches(inversePatches)

      if (filteredPatches.length === 0) {
        // Only transient fields changed, no undo entry
        set(nextState as never)
        return
      }

      const undoData = (currentState as UndoState)._undo
      const newUndoStack = [
        ...undoData.undoStack.slice(-(maxHistory - 1)),
        { patches: filteredPatches, inversePatches: filteredInverse, description }
      ]

      set({
        ...nextState,
        _undo: {
          ...undoData,
          undoStack: newUndoStack,
          redoStack: [] // Clear redo on new action
        }
      } as never)
    } else {
      // Direct object set (no undo tracking)
      set(updater as never)
    }
  }

  return {
    ...config(trackedSet as typeof set, get, api),
    ...undoState
  }
}
