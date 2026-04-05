import { useProjectStore } from '@store/useProjectStore'
import { useSelectionStore } from '@store/useSelectionStore'
import { MATERIAL_PRESETS } from '@rendering/MaterialLibrary'
import type { PartNode, SymmetryMode } from '@core/types'

// ─── Styles ────────────────────────────────────────────────────

const S = {
  panel: { display: 'flex', flexDirection: 'column' as const, height: '100%' },
  header: { padding: '8px 12px', borderBottom: '1px solid #222244', fontSize: 13, fontWeight: 500, color: '#e8e8e8' },
  section: { borderBottom: '1px solid #222244' },
  sectionTitle: {
    padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#8892a0',
    textTransform: 'uppercase' as const, letterSpacing: 1, background: '#141e30'
  },
  sectionBody: { padding: '8px 12px', display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 11, color: '#8892a0', marginBottom: 2 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  axisLabel: { width: 14, fontSize: 11, color: '#4a9eff', fontFamily: 'monospace' },
  input: {
    flex: 1, background: '#1a1a2e', border: '1px solid #333355', borderRadius: 4,
    padding: '2px 8px', fontSize: 12, color: '#e8e8e8', fontFamily: 'monospace', outline: 'none'
  } as React.CSSProperties,
  unit: { fontSize: 10, color: '#4a5060', width: 24 },
  profileBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#4a9eff' : '#1a1a2e', color: active ? '#fff' : '#8892a0'
  }),
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 },
  empty: { padding: '32px 12px', textAlign: 'center' as const, fontSize: 12, color: '#4a5060' }
}

function NumInput({ label, value, unit, onChange, min, max }: {
  label: string; value: number; unit?: string; min?: number; max?: number; onChange: (v: number) => void
}) {
  return (
    <div style={S.row}>
      <span style={S.axisLabel}>{label}</span>
      <input type="number" value={Number(value.toFixed(1))} style={S.input}
        min={min} max={max}
        onChange={(e) => {
          let v = parseFloat(e.target.value)
          if (isNaN(v)) return
          if (min !== undefined) v = Math.max(min, v)
          if (max !== undefined) v = Math.min(max, v)
          onChange(v)
        }} />
      <span style={S.unit}>{unit ?? 'mm'}</span>
    </div>
  )
}

function DimensionsSection() {
  const dims = useProjectStore((s) => s.frameDimensions)
  const set = useProjectStore((s) => s.setFrameDimensions)
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Frame Dimensions</div>
      <div style={S.sectionBody}>
        <div style={S.label}>Picture Size</div>
        <NumInput label="W" value={dims.pictureWidth} min={10} max={1000} onChange={(v) => set({ pictureWidth: v })} />
        <NumInput label="H" value={dims.pictureHeight} min={10} max={1000} onChange={(v) => set({ pictureHeight: v })} />
        <div style={{ ...S.label, marginTop: 8 }}>Frame</div>
        <NumInput label="W" value={dims.frameWidth} min={5} max={200} onChange={(v) => set({ frameWidth: v })} />
        <NumInput label="D" value={dims.frameDepth} min={3} max={100} onChange={(v) => set({ frameDepth: v })} />
        <div style={{ ...S.label, marginTop: 8 }}>Back</div>
        <NumInput label="T" value={dims.backThickness} min={1} max={20} onChange={(v) => set({ backThickness: v })} />
        <NumInput label="O" value={dims.backOverlap ?? 5} min={0} max={100} onChange={(v) => set({ backOverlap: v })} />
      </div>
    </div>
  )
}

function ProfileSection() {
  const profiles = useProjectStore((s) => s.profiles)
  const active = useProjectStore((s) => s.activeProfileId)
  const setProf = useProjectStore((s) => s.setActiveProfile)
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Profile</div>
      <div style={{ ...S.sectionBody, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {Object.values(profiles).map((p) => (
          <button key={p.id} style={S.profileBtn(active === p.id)} onClick={() => setProf(p.id)}>{p.name}</button>
        ))}
      </div>
    </div>
  )
}

function SymmetrySection() {
  const sym = useProjectStore((s) => s.symmetry)
  const setSym = useProjectStore((s) => s.setSymmetry)
  const breakSym = useProjectStore((s) => s.breakSymmetry)

  const modes: { id: SymmetryMode; label: string; desc: string }[] = [
    { id: 'quarter', label: '¼ Quarter', desc: '1 corner → 4, repeats mirror' },
    { id: 'half-x', label: '½ Left↔Right', desc: 'Left side mirrors to right' },
    { id: 'half-y', label: '½ Top↔Bottom', desc: 'Top mirrors to bottom' },
    { id: 'full', label: 'Full (no mirror)', desc: 'Everything independent' },
  ]

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Symmetry</div>
      <div style={S.sectionBody}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {modes.map((m) => (
            <button key={m.id} style={S.profileBtn(sym.mode === m.id)}
              onClick={() => setSym({ mode: m.id })} title={m.desc}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ ...S.label, marginTop: 4 }}>Repeat Units</div>
        <NumInput label="H" value={sym.repeatCountH} min={1} max={20}
          onChange={(v) => setSym({ repeatCountH: Math.round(Math.max(1, v)) })} />
        <NumInput label="V" value={sym.repeatCountV} min={1} max={20}
          onChange={(v) => setSym({ repeatCountV: Math.round(Math.max(1, v)) })} />
        {sym.mode !== 'full' && (
          <button onClick={breakSym} style={{
            padding: '5px 12px', fontSize: 11, borderRadius: 4, border: 'none',
            cursor: 'pointer', background: '#4a2020', color: '#f87171', width: '100%', marginTop: 4
          }}>Break Symmetry</button>
        )}
      </div>
    </div>
  )
}

function TransformSection({ part }: { part: PartNode }) {
  const update = useProjectStore((s) => s.updateTransform)
  const setP = (a: 0|1|2, v: number) => { const p: [number,number,number] = [...part.transform.position]; p[a] = v; update(part.id, { position: p }) }
  const setR = (a: 0|1|2, v: number) => { const r: [number,number,number] = [...part.transform.rotation]; r[a] = v*Math.PI/180; update(part.id, { rotation: r }) }
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Transform</div>
      <div style={S.sectionBody}>
        <div style={S.label}>Position</div>
        <NumInput label="X" value={part.transform.position[0]} onChange={(v) => setP(0, v)} />
        <NumInput label="Y" value={part.transform.position[1]} onChange={(v) => setP(1, v)} />
        <NumInput label="Z" value={part.transform.position[2]} onChange={(v) => setP(2, v)} />
        <div style={{ ...S.label, marginTop: 8 }}>Rotation</div>
        <NumInput label="X" value={part.transform.rotation[0]*180/Math.PI} unit="deg" onChange={(v) => setR(0, v)} />
        <NumInput label="Y" value={part.transform.rotation[1]*180/Math.PI} unit="deg" onChange={(v) => setR(1, v)} />
        <NumInput label="Z" value={part.transform.rotation[2]*180/Math.PI} unit="deg" onChange={(v) => setR(2, v)} />
      </div>
    </div>
  )
}

function MaterialSection({ part }: { part: PartNode }) {
  const updatePart = useProjectStore((s) => s.updatePart)
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Material</div>
      <div style={{ ...S.sectionBody, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {MATERIAL_PRESETS.map((m) => (
          <button
            key={m.id}
            onClick={() => updatePart(part.id, { materialId: m.id })}
            title={m.name}
            style={{
              width: 28, height: 28, borderRadius: 4, border: part.materialId === m.id ? '2px solid #4a9eff' : '2px solid transparent',
              background: m.color, cursor: 'pointer', padding: 0
            }}
          />
        ))}
      </div>
      <div style={{ padding: '4px 12px 8px', fontSize: 11, color: '#8892a0' }}>
        {MATERIAL_PRESETS.find(m => m.id === part.materialId)?.name ?? 'Default'}
      </div>
    </div>
  )
}

function InfoSection({ part }: { part: PartNode }) {
  const geo = useProjectStore((s) => s.meshCache[part.id])
  const v = geo?.attributes.position?.count ?? 0
  const f = geo?.index ? geo.index.count / 3 : v / 3
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Info</div>
      <div style={{ ...S.sectionBody }}>
        <div style={S.infoGrid}>
          <span style={{ color: '#8892a0' }}>Type</span><span>{part.type}</span>
          <span style={{ color: '#8892a0' }}>Vertices</span><span>{v.toLocaleString()}</span>
          <span style={{ color: '#8892a0' }}>Faces</span><span>{Math.floor(f).toLocaleString()}</span>
          <span style={{ color: '#8892a0' }}>Visible</span><span>{part.visible ? 'Yes' : 'No'}</span>
          <span style={{ color: '#8892a0' }}>Printable</span>
          <span style={{ color: part.printable ? '#4ade80' : '#f87171' }}>{part.printable ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const parts = useProjectStore((s) => s.parts)
  const sel = useSelectionStore((s) => s.selectedPartIds)
  const selPart = sel.length === 1 ? parts[sel[0]] : null

  return (
    <div style={S.panel}>
      <div style={S.header}>Properties</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DimensionsSection />
        {/* Profile moved to its own tab */}
        {/* Symmetry moved to Profile tab */}
        {selPart ? (
          <>
            <TransformSection part={selPart} />
            <MaterialSection part={selPart} />
            <InfoSection part={selPart} />
          </>
        ) : (
          <div style={S.empty}>Select a part to see its properties</div>
        )}
      </div>
    </div>
  )
}
