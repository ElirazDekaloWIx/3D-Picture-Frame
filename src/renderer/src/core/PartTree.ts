/**
 * Part tree operations - pure functions, no React.
 * Operates on PartNode records for the scene graph.
 */

import { nanoid } from 'nanoid'
import { DEFAULT_TRANSFORM } from './types'
import type {
  PartNode,
  PartId,
  PartType
} from './types'

export function createPartNode(
  overrides: Partial<PartNode> & { name: string; type: PartType }
): PartNode {
  return {
    id: nanoid(),
    parentId: null,
    children: [],
    transform: { ...DEFAULT_TRANSFORM },
    geometry: { kind: 'none' },
    visible: true,
    locked: false,
    printable: true,
    materialId: 'default',
    connectorSlots: [],
    ...overrides
  }
}

export function createGroupNode(name: string, children: PartId[] = []): PartNode {
  return createPartNode({ name, type: 'group', children, printable: false })
}

/**
 * Get all descendants of a part (recursive)
 */
export function getDescendants(
  parts: Record<PartId, PartNode>,
  partId: PartId
): PartId[] {
  const part = parts[partId]
  if (!part) return []

  const result: PartId[] = []
  for (const childId of part.children) {
    result.push(childId)
    result.push(...getDescendants(parts, childId))
  }
  return result
}

/**
 * Get path from root to a specific part
 */
export function getAncestors(
  parts: Record<PartId, PartNode>,
  partId: PartId
): PartId[] {
  const ancestors: PartId[] = []
  let current = parts[partId]
  while (current?.parentId) {
    ancestors.unshift(current.parentId)
    current = parts[current.parentId]
  }
  return ancestors
}

/**
 * Traverse the tree in depth-first order
 */
export function traverseDepthFirst(
  parts: Record<PartId, PartNode>,
  rootId: PartId,
  callback: (part: PartNode, depth: number) => void,
  depth = 0
): void {
  const part = parts[rootId]
  if (!part) return

  callback(part, depth)
  for (const childId of part.children) {
    traverseDepthFirst(parts, childId, callback, depth + 1)
  }
}

/**
 * Collect all visible, printable leaf parts (for export)
 */
export function getPrintableParts(
  parts: Record<PartId, PartNode>,
  rootId: PartId
): PartNode[] {
  const result: PartNode[] = []
  traverseDepthFirst(parts, rootId, (part) => {
    if (part.visible && part.printable && part.geometry.kind !== 'none') {
      result.push(part)
    }
  })
  return result
}
