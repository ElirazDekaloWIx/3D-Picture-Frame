/**
 * Global keyboard shortcuts hook.
 * Must be called once at app root level.
 */

import { useEffect } from 'react'
import { useToolStore } from '@store/useToolStore'
import { useRenderStore } from '@store/useRenderStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { useProjectStore } from '@store/useProjectStore'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input fields
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      // ─── Tools ─────────────────────────────
      if (!ctrl && !shift) {
        const toolStore = useToolStore.getState()
        switch (key) {
          case 'w': toolStore.setTool('move'); e.preventDefault(); return
          case 'e': toolStore.setTool('scale'); e.preventDefault(); return
          case 'r': toolStore.setTool('rotate'); e.preventDefault(); return
          case 'q':
            // Toggle gizmo: if already on a transform tool → go to select. If on select → go to move
            if (['move', 'rotate', 'scale'].includes(toolStore.activeTool)) {
              toolStore.setTool('select')
            } else {
              toolStore.setTool('move')
            }
            e.preventDefault(); return
          case 'v': toolStore.setTool('select'); e.preventDefault(); return
          case 'x': toolStore.setTool('split'); e.preventDefault(); return
          case 'd': toolStore.setTool('decorate'); e.preventDefault(); return
          case 'escape': toolStore.setTool('select'); useSelectionStore.getState().deselectAll(); e.preventDefault(); return
        }
      }

      // ─── View toggles ─────────────────────
      if (shift && !ctrl) {
        switch (key) {
          case 's': useToolStore.getState().toggleSnap(); e.preventDefault(); return
          case 'g': useToolStore.getState().toggleGrid(); e.preventDefault(); return
          case 'b': useToolStore.getState().toggleBuildVolume(); e.preventDefault(); return
        }
      }

      if (!ctrl && !shift && key === 'z') {
        useToolStore.getState().toggleWireframe(); e.preventDefault(); return
      }

      // ─── Render mode ──────────────────────
      if (key === 'tab' && !ctrl) {
        useRenderStore.getState().toggleRenderMode(); e.preventDefault(); return
      }

      // ─── Delete ────────────────────────────
      if (key === 'delete' || key === 'backspace') {
        const sel = useSelectionStore.getState().selectedPartIds
        if (sel.length > 0) {
          const store = useProjectStore.getState()
          for (const id of sel) {
            // Don't delete root
            if (id !== store.rootPartId) {
              store.removePart(id)
            }
          }
          useSelectionStore.getState().deselectAll()
          e.preventDefault()
          return
        }
      }

      // ─── Select all ───────────────────────
      if (ctrl && key === 'a') {
        const store = useProjectStore.getState()
        const root = store.parts[store.rootPartId]
        if (root) {
          useSelectionStore.getState().selectMultiple(root.children)
        }
        e.preventDefault()
        return
      }

      // ─── Undo/Redo stubs ─────────────────
      if (ctrl && key === 'z' && !shift) {
        console.log('[3DPF] Undo not yet connected')
        e.preventDefault()
        return
      }
      if (ctrl && key === 'z' && shift) {
        console.log('[3DPF] Redo not yet connected')
        e.preventDefault()
        return
      }

      // ─── Duplicate ────────────────────────
      if (ctrl && key === 'd') {
        e.preventDefault()
        return
      }

      // ─── Hide selected ────────────────────
      if (key === 'h' && !ctrl && !shift) {
        const sel = useSelectionStore.getState().selectedPartIds
        const store = useProjectStore.getState()
        for (const id of sel) {
          store.updatePart(id, { visible: false })
        }
        e.preventDefault()
        return
      }

      // ─── Show all ─────────────────────────
      if (key === 'h' && shift && !ctrl) {
        const store = useProjectStore.getState()
        for (const part of Object.values(store.parts)) {
          if (!part.visible) {
            store.updatePart(part.id, { visible: true })
          }
        }
        e.preventDefault()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
