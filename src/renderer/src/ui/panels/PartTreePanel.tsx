import { useState } from 'react'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import type { PartId } from '@core/types'

const ICONS: Record<string, string> = {
  'group': '📦', 'frame-rail': '📐', 'frame-corner': '◆', 'frame-back': '▬',
  'frame-stand': '△', 'connector': '🔗', 'decoration': '🌸', 'custom': '✦', 'split-result': '✂'
}

function TreeNode({ partId, depth }: { partId: PartId; depth: number }) {
  const part = useProjectStore((s) => s.parts[partId])
  const updatePart = useProjectStore((s) => s.updatePart)
  const removePart = useProjectStore((s) => s.removePart)
  const selected = useSelectionStore((s) => s.selectedPartIds)
  const select = useSelectionStore((s) => s.select)
  const toggleSelect = useSelectionStore((s) => s.toggleSelect)

  const [collapsed, setCollapsed] = useState(false)

  if (!part) return null
  const isSel = selected.includes(partId)
  const hasChildren = part.children.length > 0

  return (
    <div>
      <div
        onClick={(e) => { e.stopPropagation(); e.ctrlKey ? toggleSelect(partId) : select(partId) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', paddingLeft: depth * 16 + 8,
          cursor: 'pointer', fontSize: 12,
          background: isSel ? '#253550' : 'transparent',
          color: isSel ? '#e8e8e8' : '#8892a0',
          borderLeft: isSel ? '2px solid #4a9eff' : '2px solid transparent'
        }}
        onMouseEnter={(e) => { (e.currentTarget).style.background = isSel ? '#253550' : '#1f2940' }}
        onMouseLeave={(e) => { (e.currentTarget).style.background = isSel ? '#253550' : 'transparent' }}
      >
        {/* Expand/collapse arrow */}
        <span
          onClick={(e) => { e.stopPropagation(); if (hasChildren) setCollapsed(!collapsed) }}
          style={{ width: 12, textAlign: 'center', fontSize: 10, cursor: hasChildren ? 'pointer' : 'default', color: '#5a6a8a' }}
        >
          {hasChildren ? (collapsed ? '▶' : '▼') : ''}
        </span>

        <span style={{ fontSize: 11 }}>{ICONS[part.type] ?? '•'}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part.name}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); updatePart(partId, { visible: !part.visible }) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10,
            color: part.visible ? '#6a7a9a' : '#f87171', padding: 2, opacity: 0.7 }}
          title={part.visible ? 'Hide' : 'Show'}
        >{part.visible ? '👁' : '🚫'}</button>

        {part.type !== 'group' && (
          <button
            onClick={(e) => { e.stopPropagation(); removePart(partId) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#f87171', padding: 2, opacity: 0.7 }}
            title="Delete"
          >✕</button>
        )}
      </div>

      {/* Children - collapsible */}
      {!collapsed && part.children.map((cid) => (
        <TreeNode key={cid} partId={cid} depth={depth + 1} />
      ))}
    </div>
  )
}

export function PartTreePanel() {
  const rootPartId = useProjectStore((s) => s.rootPartId)
  const deselectAll = useSelectionStore((s) => s.deselectAll)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onClick={deselectAll}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid #222244',
        fontSize: 13, fontWeight: 500, color: '#e8e8e8'
      }}>Part Tree</div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
        <TreeNode partId={rootPartId} depth={0} />
      </div>
    </div>
  )
}
