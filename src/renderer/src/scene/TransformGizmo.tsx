/**
 * TransformGizmo - finds mesh by partId userData and attaches controls.
 */

import { useEffect, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree, invalidate } from '@react-three/fiber'
import * as THREE from 'three'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { useToolStore } from '@store/useToolStore'

const TOOL_TO_MODE: Record<string, 'translate' | 'rotate' | 'scale' | undefined> = {
  move: 'translate', rotate: 'rotate', scale: 'scale'
}

export function TransformGizmo() {
  const selectedIds = useSelectionStore((s) => s.selectedPartIds)
  const activeTool = useToolStore((s) => s.activeTool)
  const parts = useProjectStore((s) => s.parts)
  const updateTransform = useProjectStore((s) => s.updateTransform)
  const { scene } = useThree()

  const [targetMesh, setTargetMesh] = useState<THREE.Object3D | null>(null)
  const dragging = useRef(false)

  const mode = TOOL_TO_MODE[activeTool]
  const selectedPart = selectedIds.length === 1 ? parts[selectedIds[0]] : null

  // Find mesh by userData.partId
  useEffect(() => {
    if (!selectedPart || !mode) {
      setTargetMesh(null)
      return
    }

    let found: THREE.Object3D | null = null
    scene.traverse((obj) => {
      if (found) return
      if ((obj as THREE.Mesh).isMesh && obj.userData?.partId === selectedPart.id) {
        // Use the parent group (which contains both mesh + wireframe)
        found = obj.parent && obj.parent.type === 'Group' ? obj.parent : obj
      }
    })

    setTargetMesh(found)
    invalidate()
  }, [selectedPart, mode, scene])

  if (!targetMesh || !mode || !selectedPart) return null

  const handleChange = () => {
    if (!targetMesh || !selectedPart) return
    dragging.current = true

    updateTransform(selectedPart.id, {
      position: [targetMesh.position.x, targetMesh.position.y, targetMesh.position.z],
      rotation: [targetMesh.rotation.x, targetMesh.rotation.y, targetMesh.rotation.z],
      scale: [targetMesh.scale.x, targetMesh.scale.y, targetMesh.scale.z]
    })
    invalidate()
  }

  const handleMouseUp = () => {
    setTimeout(() => { dragging.current = false }, 100)
  }

  return (
    <TransformControls
      object={targetMesh}
      mode={mode}
      size={0.8}
      onObjectChange={handleChange}
      onMouseUp={handleMouseUp}
      onChange={() => invalidate()}
    />
  )
}
