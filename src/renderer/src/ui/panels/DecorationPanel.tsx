/**
 * DecorationPanel - controls for imported decoration parts.
 * Includes Transform + Mode + Apply buttons for merge/relief/cookie.
 */

import { useState, useCallback } from 'react'
import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { useClonerStore } from '@store/useClonerStore'
import type { DecorationMode } from '@core/types'

const S = {
  panel: { display: 'flex', flexDirection: 'column' as const, height: '100%' },
  header: { padding: '8px 12px', borderBottom: '1px solid #222244', fontSize: 13, fontWeight: 500, color: '#e8e8e8' },
  section: { borderBottom: '1px solid #222244' },
  sectionTitle: {
    padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#8892a0',
    textTransform: 'uppercase' as const, letterSpacing: 1, background: '#141e30'
  },
  body: { padding: '8px 12px', display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 11, color: '#8892a0' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  axisLabel: { width: 14, fontSize: 11, color: '#4a9eff', fontFamily: 'monospace', cursor: 'ew-resize', userSelect: 'none' as const },
  input: {
    flex: 1, background: '#1a1a2e', border: '1px solid #333355', borderRadius: 4,
    padding: '2px 8px', fontSize: 12, color: '#e8e8e8', fontFamily: 'monospace', outline: 'none'
  } as React.CSSProperties,
  unit: { fontSize: 10, color: '#4a5060', width: 24 },
  modeBtn: (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#4a9eff' : '#1a1a2e', color: active ? '#fff' : '#8892a0'
  }),
  applyBtn: { padding: '8px 16px', fontSize: 12, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: '#4a9eff', color: '#fff', width: '100%' } as React.CSSProperties,
  quickBtn: { padding: '4px 8px', fontSize: 10, borderRadius: 3, border: 'none', cursor: 'pointer', background: '#252540', color: '#8892a0' } as React.CSSProperties,
  slider: { width: '100%', accentColor: '#4a9eff' } as React.CSSProperties,
  error: { fontSize: 11, color: '#f87171', padding: '4px 0' },
}

function NumInput({ label, value, unit, step = 1, onChange }: {
  label: string; value: number; unit?: string; step?: number; onChange: (v: number) => void
}) {
  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX, startVal = value
    const onMove = (me: MouseEvent) => onChange(startVal + (me.clientX - startX) * (me.shiftKey ? 0.1 : 1) * step)
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }
  return (
    <div style={S.row}>
      <span style={S.axisLabel} onMouseDown={handleDrag} title="Drag to scrub">{label}</span>
      <input type="number" step={step} value={Number(value.toFixed(1))} style={S.input}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v) }} />
      <span style={S.unit}>{unit ?? 'mm'}</span>
    </div>
  )
}

const MODES: { id: DecorationMode; label: string }[] = [
  { id: 'attached', label: 'Attached' },
  { id: 'merged', label: 'Merged' },
  { id: 'bas-relief', label: 'Bas-Relief' },
  { id: 'cookie-cutter', label: 'Cookie Cut' },
]

const QUICK_ROTS = [
  { label: 'Front', rot: [0, 0, 0] as [number, number, number] },
  { label: 'Back', rot: [0, Math.PI, 0] as [number, number, number] },
  { label: 'Flip', rot: [Math.PI, 0, 0] as [number, number, number] },
  { label: 'Lay', rot: [-Math.PI / 2, 0, 0] as [number, number, number] },
]

function ClonerSection({ partId }: { partId: string }) {
  const cloner = useClonerStore()
  const isSource = cloner.sourcePartIds.includes(partId)

  const SliderRow = ({ label, value, min, max, step, unit, onChange }: {
    label: string; value: number; min: number; max: number; step: number; unit?: string;
    onChange: (v: number) => void
  }) => (
    <div style={S.row}>
      <span style={{ ...S.label, width: 50 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#4a9eff' }} />
      <span style={{ fontSize: 10, color: '#8892a0', width: 35, textAlign: 'right' }}>
        {Number.isInteger(step) ? value : value.toFixed(1)}{unit ?? ''}
      </span>
    </div>
  )

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Cloner</div>
      <div style={S.body}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => {
            if (isSource) { cloner.removeSource(partId); if (cloner.sourcePartIds.length <= 1) cloner.setEnabled(false) }
            else { cloner.addSource(partId); cloner.setEnabled(true) }
          }} style={{
            padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none',
            cursor: 'pointer', flex: 1,
            background: isSource ? '#f87171' : '#4a9eff', color: '#fff'
          }}>
            {isSource ? 'Remove from Cloner' : 'Add to Cloner'}
          </button>
          {cloner.sourcePartIds.length > 0 && (
            <button onClick={() => cloner.clearSources()} style={{
              padding: '6px 8px', fontSize: 10, borderRadius: 4, border: 'none',
              cursor: 'pointer', background: '#3a1a1a', color: '#f87171'
            }}>Clear All</button>
          )}
        </div>
        {cloner.sourcePartIds.length > 1 && (
          <div style={{ fontSize: 10, color: '#4a9eff', marginTop: 2 }}>
            {cloner.sourcePartIds.length} sources → iterate mode
          </div>
        )}

        {cloner.enabled && (<>
          {/* Distribution */}
          <div style={{ fontSize: 10, color: '#5a6a8a', marginTop: 2 }}>Distribution</div>
          <SliderRow label="Count" value={cloner.count} min={1} max={60} step={1} onChange={(v) => cloner.set({ count: v })} />
          <SliderRow label="Offset" value={cloner.offset} min={-60} max={60} step={1} onChange={(v) => cloner.set({ offset: v })} />
          <SliderRow label="Z" value={cloner.zOffset} min={-30} max={30} step={1} onChange={(v) => cloner.set({ zOffset: v })} />

          {/* Transform */}
          <div style={{ fontSize: 10, color: '#5a6a8a', marginTop: 4 }}>Transform</div>
          <SliderRow label="Rotate" value={cloner.rotationOffset} min={0} max={360} step={5} unit="°" onChange={(v) => cloner.set({ rotationOffset: v })} />
          <SliderRow label="Scale" value={cloner.scale} min={0.1} max={3} step={0.1} onChange={(v) => cloner.set({ scale: v })} />

          {/* Step (accumulate per clone) */}
          <div style={{ fontSize: 10, color: '#5a6a8a', marginTop: 4 }}>Step (per clone)</div>
          <SliderRow label="Rot+" value={cloner.stepRotation} min={0} max={90} step={1} unit="°" onChange={(v) => cloner.set({ stepRotation: v })} />
          <SliderRow label="Scale+" value={cloner.stepScale} min={-0.1} max={0.1} step={0.005} onChange={(v) => cloner.set({ stepScale: v })} />
          <div style={S.row}>
            <span style={{ ...S.label, width: 50 }}>Flip Alt</span>
            <input type="checkbox" checked={cloner.flipAlternate}
              onChange={(e) => cloner.set({ flipAlternate: e.target.checked })} />
          </div>

          {/* Random */}
          <div style={{ fontSize: 10, color: '#5a6a8a', marginTop: 4 }}>Random</div>
          <SliderRow label="Seed" value={cloner.randomSeed} min={1} max={999} step={1} onChange={(v) => cloner.set({ randomSeed: v })} />
          <SliderRow label="Spacing" value={cloner.randomSpacing} min={0} max={1} step={0.05} onChange={(v) => cloner.set({ randomSpacing: v })} />
          <SliderRow label="Pos" value={cloner.randomPosition} min={0} max={20} step={1} onChange={(v) => cloner.set({ randomPosition: v })} />
          <SliderRow label="Rot" value={cloner.randomRotation} min={0} max={180} step={5} unit="°" onChange={(v) => cloner.set({ randomRotation: v })} />
          <SliderRow label="Scale" value={cloner.randomScale} min={0} max={1} step={0.05} onChange={(v) => cloner.set({ randomScale: v })} />
          <SliderRow label="Z" value={cloner.randomZ} min={0} max={15} step={1} onChange={(v) => cloner.set({ randomZ: v })} />
        </>)}
      </div>
    </div>
  )
}

export function DecorationPanel() {
  const parts = useProjectStore((s) => s.parts)
  const meshCache = useProjectStore((s) => s.meshCache)
  const rootPartId = useProjectStore((s) => s.rootPartId)
  const updatePart = useProjectStore((s) => s.updatePart)
  const updateTransform = useProjectStore((s) => s.updateTransform)
  const applyMerge = useProjectStore((s) => s.applyMerge)
  const applyCookieCutter = useProjectStore((s) => s.applyCookieCutter)
  const sel = useSelectionStore((s) => s.selectedPartIds)
  const deselectAll = useSelectionStore((s) => s.deselectAll)

  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const part = sel.length === 1 ? parts[sel[0]] : null
  if (!part || part.type !== 'decoration') return null

  const geo = meshCache[part.id]
  const verts = geo?.attributes.position?.count ?? 0
  const mode = part.decorationInfo?.mode ?? 'attached'

  // Find frame rails as merge/cut targets
  const rootPart = parts[rootPartId]
  const railParts = rootPart?.children
    .map(id => parts[id])
    .filter(p => p && p.type === 'frame-rail') ?? []

  const setPos = (a: 0|1|2, v: number) => { const p: [number, number, number] = [...part.transform.position]; p[a] = v; updateTransform(part.id, { position: p }) }
  const setRot = (a: 0|1|2, d: number) => { const r: [number, number, number] = [...part.transform.rotation]; r[a] = d * Math.PI / 180; updateTransform(part.id, { rotation: r }) }
  const setScale = (v: number) => updateTransform(part.id, { scale: [v, v, v] })

  const handleApply = useCallback(async () => {
    if (railParts.length === 0) { setError('No frame rails to apply to'); return }
    setApplying(true)
    setError(null)

    // Use first rail as target (TODO: let user pick)
    const targetId = railParts[0].id

    try {
      if (mode === 'merged') {
        await applyMerge(part.id, targetId)
      } else if (mode === 'cookie-cutter') {
        await applyCookieCutter(part.id, targetId)
      } else if (mode === 'bas-relief') {
        // TODO: bas-relief implementation
        setError('Bas-Relief coming soon')
        setApplying(false)
        return
      }
      deselectAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [part, mode, railParts, applyMerge, applyCookieCutter, deselectAll])

  return (
    <div style={S.panel}>
      <div style={S.header}>{part.name}</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Position */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Position</div>
          <div style={S.body}>
            <NumInput label="X" value={part.transform.position[0]} onChange={(v) => setPos(0, v)} />
            <NumInput label="Y" value={part.transform.position[1]} onChange={(v) => setPos(1, v)} />
            <NumInput label="Z" value={part.transform.position[2]} onChange={(v) => setPos(2, v)} />
          </div>
        </div>

        {/* Rotation */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Rotation</div>
          <div style={S.body}>
            <NumInput label="X" value={part.transform.rotation[0]*180/Math.PI} unit="deg" onChange={(v) => setRot(0, v)} />
            <NumInput label="Y" value={part.transform.rotation[1]*180/Math.PI} unit="deg" onChange={(v) => setRot(1, v)} />
            <NumInput label="Z" value={part.transform.rotation[2]*180/Math.PI} unit="deg" onChange={(v) => setRot(2, v)} />
            <div style={{ display: 'flex', gap: 3 }}>
              {QUICK_ROTS.map(q => (
                <button key={q.label} style={S.quickBtn}
                  onClick={() => updateTransform(part.id, { rotation: q.rot })}>{q.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Scale */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Scale</div>
          <div style={S.body}>
            <NumInput label="S" value={part.transform.scale[0]} unit="x" step={0.1} onChange={setScale} />
          </div>
        </div>

        {/* Placement Mode */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Mode</div>
          <div style={{ ...S.body, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {MODES.map(m => (
              <button key={m.id} style={S.modeBtn(mode === m.id)}
                onClick={() => updatePart(part.id, { decorationInfo: { ...part.decorationInfo!, mode: m.id } })}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply button for non-attached modes */}
        {mode !== 'attached' && (
          <div style={S.section}>
            <div style={S.body}>
              <div style={S.label}>
                {mode === 'merged' && 'Boolean union into frame rail'}
                {mode === 'bas-relief' && 'Flatten to relief on frame surface'}
                {mode === 'cookie-cutter' && 'Cut silhouette from frame rail'}
              </div>
              <button style={{ ...S.applyBtn, opacity: applying ? 0.5 : 1 }} onClick={handleApply} disabled={applying}>
                {applying ? 'Applying...' : `Apply ${mode === 'merged' ? 'Merge' : mode === 'bas-relief' ? 'Relief' : 'Cut'}`}
              </button>
              {error && <div style={S.error}>{error}</div>}
            </div>
          </div>
        )}

        {/* Cloner */}
        <ClonerSection partId={part.id} />

        {/* Info */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Info</div>
          <div style={S.body}>
            <div style={{ ...S.row, justifyContent: 'space-between', fontSize: 11, color: '#8892a0' }}>
              <span>Vertices</span><span>{verts.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
