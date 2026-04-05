/**
 * AppLayout - Main layout with tab-based right panel.
 */

import { useState } from 'react'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { PartTreePanel } from '@ui/panels/PartTreePanel'
import { PropertiesPanel } from '@ui/panels/PropertiesPanel'
import { SplitPanel } from '@ui/panels/SplitPanel'
import { DecorationPanel } from '@ui/panels/DecorationPanel'
import { ProfileEditor } from '@ui/panels/ProfileEditor'
import { Viewport } from '@scene/Viewport'
import { useFrameInit } from '@store/useFrameInit'
import { useToolStore } from '@store/useToolStore'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 11, fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer',
  background: active ? '#1a1a2e' : 'transparent', color: active ? '#e8e8e8' : '#5a6a8a',
  borderBottom: active ? '2px solid #4a9eff' : '2px solid transparent',
})

export function AppLayout() {
  useFrameInit()
  const activeTool = useToolStore((s) => s.activeTool)
  const parts = useProjectStore((s) => s.parts)
  const sel = useSelectionStore((s) => s.selectedPartIds)
  const selectedPart = sel.length === 1 ? parts[sel[0]] : null
  const isDecoration = selectedPart?.type === 'decoration'

  const [rightTab, setRightTab] = useState<'profile' | 'properties'>('profile')

  // Force split panel when split tool active
  const showSplit = activeTool === 'split'
  // Force decoration panel when decoration selected
  const showDeco = isDecoration && !showSplit

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
      overflow: 'hidden', background: '#1a1a2e', color: '#e8e8e8', userSelect: 'none'
    }}>
      <Toolbar />

      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Left - Part Tree */}
        <div style={{ width: 240, minWidth: 180, background: '#16213e', borderRight: '1px solid #222244', overflowY: 'auto', flexShrink: 0 }}>
          <PartTreePanel />
        </div>

        {/* Center - Viewport */}
        <Viewport />

        {/* Right - Tabbed panel */}
        <div style={{ width: 280, minWidth: 220, background: '#16213e', borderLeft: '1px solid #222244', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Tab bar */}
          {!showSplit && !showDeco && (
            <div style={{ display: 'flex', borderBottom: '1px solid #222244', background: '#141e30' }}>
              <button style={TAB_STYLE(rightTab === 'profile')} onClick={() => setRightTab('profile')}>Profile</button>
              <button style={TAB_STYLE(rightTab === 'properties')} onClick={() => setRightTab('properties')}>Properties</button>
            </div>
          )}

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {showSplit ? <SplitPanel />
              : showDeco ? <DecorationPanel />
              : rightTab === 'profile' ? <ProfileEditor />
              : <PropertiesPanel />
            }
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
