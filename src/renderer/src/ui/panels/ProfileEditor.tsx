/**
 * ProfileEditor - Interactive 2D profile editor with:
 * - Freehand drawing mode
 * - Point editing mode (drag points)
 * - Smooth slider (Chaikin subdivision)
 * - Preset loading
 * - Apply button to update frame
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useProjectStore } from '@store/useProjectStore'
import type { ProfilePoint, SymmetryMode, CornerShape, FramePathType } from '@core/types'

const CW = 250, CH = 200, PAD = 24

const S = {
  panel: { display: 'flex', flexDirection: 'column' as const, height: '100%' },
  header: { padding: '8px 12px', borderBottom: '1px solid #222244', fontSize: 13, fontWeight: 500, color: '#e8e8e8' },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  section: { borderBottom: '1px solid #222244' },
  sTitle: { padding: '5px 12px', fontSize: 10, fontWeight: 600, color: '#5a6a8a', textTransform: 'uppercase' as const, letterSpacing: 1, background: '#141e30' },
  presetBtn: { padding: '4px 10px', fontSize: 10, borderRadius: 3, border: 'none', cursor: 'pointer', background: '#1a1a2e', color: '#8892a0' } as React.CSSProperties,
  modeBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 10, borderRadius: 3, border: 'none', cursor: 'pointer',
    background: active ? '#4a9eff' : '#252540', color: active ? '#fff' : '#8892a0'
  }),
  applyBtn: { padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer', background: '#4a9eff', color: '#fff', width: '100%' } as React.CSSProperties,
  slider: { width: '100%', accentColor: '#4a9eff' } as React.CSSProperties,
  label: { fontSize: 10, color: '#5a6a8a' },
  row: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8892a0' },
}

// ─── Presets ──────────────────────────────────────────────

const PRESETS: Record<string, ProfilePoint[]> = {
  Flat: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
  Ogee: (() => { const p: ProfilePoint[] = [{ x: 0, y: 1 }]; for (let i = 0; i <= 12; i++) { const t = i / 12; const y = t < 0.5 ? 0.5 * (1 - Math.cos(Math.PI * t * 2)) * 0.4 : 0.4 + 0.6 * (1 - Math.cos(Math.PI * (t - 0.5) * 2)) * 0.5; p.push({ x: t, y: 1 - y }) } p.push({ x: 1, y: 1 }); return p })(),
  Round: (() => { const p: ProfilePoint[] = [{ x: 0, y: 1 }]; for (let i = 0; i <= 12; i++) { const t = i / 12; p.push({ x: t, y: 1 - Math.sin(Math.PI * t) * 0.5 }) } p.push({ x: 1, y: 1 }); return p })(),
  Bevel: [{ x: 0, y: 1 }, { x: 0, y: 0.3 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  Scoop: (() => { const p: ProfilePoint[] = [{ x: 0, y: 1 }]; for (let i = 0; i <= 12; i++) { const t = i / 12; p.push({ x: t, y: 1 - (1 - Math.cos(Math.PI / 2 * t)) * 0.6 }) } p.push({ x: 1, y: 1 }); return p })(),
  Step: [{ x: 0, y: 1 }, { x: 0, y: 0.5 }, { x: 0.4, y: 0.5 }, { x: 0.4, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
}

// ─── Chaikin smooth ──────────────────────────────────────

function chaikinSmooth(points: ProfilePoint[], iterations: number): ProfilePoint[] {
  if (iterations <= 0 || points.length < 3) return points
  let result = [...points]

  for (let iter = 0; iter < iterations; iter++) {
    const newPts: ProfilePoint[] = []

    for (let i = 0; i < result.length; i++) {
      const p0 = result[i]
      const p1 = result[(i + 1) % result.length]

      // Keep base points (y ≈ 1) locked - don't smooth the back wall
      const isBase0 = Math.abs(p0.y - 1) < 0.01
      const isBase1 = Math.abs(p1.y - 1) < 0.01

      if (isBase0 && isBase1) {
        // Both on base - keep as-is
        newPts.push(p0)
      } else if (isBase0) {
        // Transition from base to profile - keep base point, add one smooth point
        newPts.push(p0)
        newPts.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 })
      } else if (isBase1) {
        // Transition from profile to base - add one smooth point, keep base
        newPts.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 })
      } else {
        // Both in profile area - full Chaikin
        newPts.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 })
        newPts.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 })
      }
    }

    result = newPts
  }

  // Ensure base is always closed: first and last at y=1
  if (result.length > 0 && Math.abs(result[0].y - 1) > 0.01) {
    result.unshift({ x: result[0].x, y: 1 })
  }
  if (result.length > 0 && Math.abs(result[result.length - 1].y - 1) > 0.01) {
    result.push({ x: result[result.length - 1].x, y: 1 })
  }

  return result
}

// ─── Canvas drawing ──────────────────────────────────────

function draw(ctx: CanvasRenderingContext2D, rawPoints: ProfilePoint[], smoothedPoints: ProfilePoint[], dragIdx: number | null, hoverIdx: number | null) {
  const iw = CW - PAD * 2, ih = CH - PAD * 2
  const toX = (x: number) => PAD + x * iw
  const toY = (y: number) => PAD + y * ih

  ctx.fillStyle = '#12121e'
  ctx.fillRect(0, 0, CW, CH)

  // Grid
  ctx.strokeStyle = '#1e1e35'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const x = toX(i / 4), y = toY(i / 4)
    ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, CH - PAD); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(CW - PAD, y); ctx.stroke()
  }

  // Labels
  ctx.fillStyle = '#3a4a6a'
  ctx.font = '8px sans-serif'
  ctx.fillText('inner', PAD, CH - 6)
  ctx.fillText('outer', CW - PAD - 22, CH - 6)
  ctx.fillText('front', 2, PAD + 3)
  ctx.fillText('back', 2, CH - PAD)

  // Smoothed profile fill
  if (smoothedPoints.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(toX(smoothedPoints[0].x), toY(smoothedPoints[0].y))
    for (let i = 1; i < smoothedPoints.length; i++) ctx.lineTo(toX(smoothedPoints[i].x), toY(smoothedPoints[i].y))
    ctx.closePath()
    ctx.fillStyle = 'rgba(74, 158, 255, 0.08)'
    ctx.fill()
  }

  // Smoothed line
  ctx.beginPath()
  ctx.moveTo(toX(smoothedPoints[0].x), toY(smoothedPoints[0].y))
  for (let i = 1; i < smoothedPoints.length; i++) ctx.lineTo(toX(smoothedPoints[i].x), toY(smoothedPoints[i].y))
  ctx.closePath()
  ctx.strokeStyle = '#4a9eff'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Raw control polygon (faint)
  if (rawPoints.length !== smoothedPoints.length) {
    ctx.beginPath()
    ctx.moveTo(toX(rawPoints[0].x), toY(rawPoints[0].y))
    for (let i = 1; i < rawPoints.length; i++) ctx.lineTo(toX(rawPoints[i].x), toY(rawPoints[i].y))
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Control points
  for (let i = 0; i < rawPoints.length; i++) {
    const px = toX(rawPoints[i].x), py = toY(rawPoints[i].y)
    const r = i === dragIdx ? 5 : i === hoverIdx ? 4 : 3
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fillStyle = i === dragIdx ? '#fff' : i === hoverIdx ? '#80c0ff' : '#4a9eff'
    ctx.fill()
    ctx.strokeStyle = '#0a0a1a'; ctx.lineWidth = 1; ctx.stroke()
  }
}

// ─── Component ───────────────────────────────────────────

function SymmetrySection() {
  const sym = useProjectStore((s) => s.symmetry)
  const setSym = useProjectStore((s) => s.setSymmetry)
  const breakSym = useProjectStore((s) => s.breakSymmetry)

  const modes: { id: SymmetryMode; label: string; desc: string }[] = [
    { id: 'full', label: 'None', desc: 'No mirroring - each side independent' },
    { id: 'half-x', label: '↔ Left=Right', desc: 'Left side mirrors to right' },
    { id: 'half-y', label: '↕ Top=Bottom', desc: 'Top mirrors to bottom' },
    { id: 'quarter', label: '¼ Quarter', desc: 'Top-left mirrors to all 4 corners' },
  ]

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Symmetry Mirror</div>
      <div style={S.body}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {modes.map(m => (
            <button key={m.id} style={S.modeBtn(sym.mode === m.id)} title={m.desc}
              onClick={() => setSym({ mode: m.id })}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#4a5a7a', marginTop: 2 }}>
          {sym.mode === 'full' && 'Each part is independent'}
          {sym.mode === 'half-x' && 'Decorations on left auto-mirror to right'}
          {sym.mode === 'half-y' && 'Decorations on top auto-mirror to bottom'}
          {sym.mode === 'quarter' && 'Decorations auto-mirror to all 4 quadrants'}
        </div>
        {sym.mode !== 'full' && (
          <button onClick={breakSym} style={{
            padding: '4px 10px', fontSize: 10, borderRadius: 3, border: 'none',
            cursor: 'pointer', background: '#3a1a1a', color: '#f87171', width: '100%', marginTop: 4
          }}>Break Symmetry (make all independent)</button>
        )}
      </div>
    </div>
  )
}

function FrameShapeSection() {
  const fp = useProjectStore((s) => s.framePath)
  const setFP = useProjectStore((s) => s.setFramePath)

  const shapes: { id: FramePathType; label: string; icon: string }[] = [
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'ellipse', label: 'Ellipse', icon: '⬮' },
    { id: 'polygon', label: 'Polygon', icon: '⬡' },
    { id: 'freehand', label: 'Freehand', icon: '〰' },
  ]

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Frame Shape</div>
      <div style={S.body}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {shapes.map(s => (
            <button key={s.id} style={S.modeBtn(fp.type === s.id)}
              onClick={() => setFP({ type: s.id })}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        {fp.type === 'polygon' && (
          <div style={{ ...S.row, marginTop: 4 }}>
            <span style={S.label}>Sides</span>
            <input type="number" min={3} max={12} value={fp.sides ?? 6}
              onChange={(e) => setFP({ sides: Math.max(3, parseInt(e.target.value) || 6) })}
              style={{ width: 50, background: '#1a1a2e', border: '1px solid #333355', borderRadius: 3, padding: '2px 6px', fontSize: 11, color: '#e8e8e8', textAlign: 'center' }} />
          </div>
        )}
        {fp.type === 'freehand' && <FreehandPathCanvas />}
      </div>
    </div>
  )
}

function chaikinSmoothPath(points: { x: number; y: number }[], iterations: number): { x: number; y: number }[] {
  if (iterations <= 0 || points.length < 3) return points
  let result = [...points]
  for (let iter = 0; iter < iterations; iter++) {
    const newPts: { x: number; y: number }[] = []
    for (let i = 0; i < result.length; i++) {
      const p0 = result[i], p1 = result[(i + 1) % result.length]
      newPts.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 })
      newPts.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 })
    }
    result = newPts
  }
  return result
}

function FreehandPathCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setFP = useProjectStore((s) => s.setFramePath)
  const fp = useProjectStore((s) => s.framePath)
  const dims = useProjectStore((s) => s.frameDimensions)
  const [drawing, setDrawing] = useState(false)
  const [pts, setPts] = useState<{ x: number; y: number }[]>(fp.controlPoints)
  const [pathSmooth, setPathSmooth] = useState(2)

  const W = 240, H = 200, P = 20
  const scale = Math.max(dims.pictureWidth + dims.frameWidth * 4, dims.pictureHeight + dims.frameWidth * 4) / (Math.min(W, H) - P * 2)

  const toLocal = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = (e.clientX - rect.left - W / 2) * scale
    const py = -(e.clientY - rect.top - H / 2) * scale // flip Y
    return { x: px, y: py }
  }

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#12121e'
    ctx.fillRect(0, 0, W, H)

    // Grid crosshair
    ctx.strokeStyle = '#1e1e35'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()

    if (pts.length < 2) return

    // Draw path
    ctx.beginPath()
    const sx = (p: { x: number; y: number }) => W / 2 + p.x / scale
    const sy = (p: { x: number; y: number }) => H / 2 - p.y / scale
    ctx.moveTo(sx(pts[0]), sy(pts[0]))
    for (let i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i]), sy(pts[i]))
    ctx.closePath()
    ctx.fillStyle = 'rgba(74, 158, 255, 0.08)'
    ctx.fill()
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Points
    for (const p of pts) {
      ctx.beginPath(); ctx.arc(sx(p), sy(p), 3, 0, Math.PI * 2)
      ctx.fillStyle = '#4a9eff'; ctx.fill()
    }
  }, [pts, scale])

  const handleMouseDown = (e: React.MouseEvent) => {
    setPts([toLocal(e)])
    setDrawing(true)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return
    setPts(prev => [...prev, toLocal(e)])
  }
  const handleMouseUp = () => {
    setDrawing(false)
    if (pts.length >= 3) {
      // Simplify
      const step = Math.max(1, Math.floor(pts.length / 30))
      const simplified = pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % step === 0)
      setPts(simplified)
      const smoothed = chaikinSmoothPath(simplified, pathSmooth)
      setFP({ controlPoints: smoothed })
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <canvas
        ref={canvasRef} width={W} height={H}
        style={{ borderRadius: 4, cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div style={{ fontSize: 10, color: '#4a5a7a', marginTop: 2 }}>
        Draw the frame outline. Points: {pts.length}
      </div>
      <div style={{ ...S.row, marginTop: 4 }}>
        <span style={S.label}>Smooth: {pathSmooth}</span>
        <input type="range" min={0} max={5} step={1} value={pathSmooth}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            setPathSmooth(v)
            if (pts.length >= 3) {
              const smoothed = chaikinSmoothPath(pts, v)
              setFP({ controlPoints: smoothed })
            }
          }}
          style={{ flex: 1, accentColor: '#4a9eff' }} />
      </div>
      <button style={S.presetBtn} onClick={() => { setPts([]); setFP({ controlPoints: [] }) }}>Clear</button>
    </div>
  )
}

function CornerSection() {
  const cs = useProjectStore((s) => s.cornerSettings)
  const setCS = useProjectStore((s) => s.setCornerSettings)

  const shapes: { id: CornerShape; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'square', label: '■' },
    { id: 'circle', label: '●' },
    { id: 'triangle', label: '▲' },
    { id: 'hexagon', label: '⬡' },
    { id: 'octagon', label: '⯃' },
    { id: 'ellipse', label: '⬮' },
  ]

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Corners</div>
      <div style={S.body}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {shapes.map(s => (
            <button key={s.id} style={S.modeBtn(cs.shape === s.id)}
              onClick={() => setCS({ shape: s.id })} title={s.id}>
              {s.label}
            </button>
          ))}
        </div>
        {cs.shape !== 'none' && (
          <div style={{ ...S.row, marginTop: 4 }}>
            <span style={S.label}>Size</span>
            <input type="range" min={0.5} max={3} step={0.1} value={cs.size}
              onChange={(e) => setCS({ size: parseFloat(e.target.value) })}
              style={{ flex: 1, accentColor: '#4a9eff' }} />
            <span style={{ fontSize: 10, color: '#8892a0', width: 30 }}>{cs.size.toFixed(1)}x</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProfileEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const profiles = useProjectStore((s) => s.profiles)
  const activeProfileId = useProjectStore((s) => s.activeProfileId)

  const [rawPoints, setRawPoints] = useState<ProfilePoint[]>(PRESETS.Flat)
  const [smoothLevel, setSmoothLevel] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [drawMode, setDrawMode] = useState<'edit' | 'draw'>('edit')
  const [isDrawing, setIsDrawing] = useState(false)

  const smoothed = chaikinSmooth(rawPoints, smoothLevel)

  // Redraw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) draw(ctx, rawPoints, smoothed, dragIdx, hoverIdx)
  }, [rawPoints, smoothLevel, dragIdx, hoverIdx])

  const toLocal = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const iw = CW - PAD * 2, ih = CH - PAD * 2
    return [
      Math.max(0, Math.min(1, (e.clientX - rect.left - PAD) / iw)),
      Math.max(0, Math.min(1, (e.clientY - rect.top - PAD) / ih))
    ]
  }

  const findPoint = (e: React.MouseEvent): number | null => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const iw = CW - PAD * 2, ih = CH - PAD * 2
    for (let i = 0; i < rawPoints.length; i++) {
      if (Math.abs(PAD + rawPoints[i].x * iw - mx) < 8 && Math.abs(PAD + rawPoints[i].y * ih - my) < 8) return i
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawMode === 'draw') {
      const [x, y] = toLocal(e)
      setRawPoints([{ x, y }])
      setIsDrawing(true)
      return
    }
    const idx = findPoint(e)
    if (idx !== null) { setDragIdx(idx); return }
    // Add point
    const [x, y] = toLocal(e)
    let insertAt = rawPoints.length
    for (let i = 0; i < rawPoints.length - 1; i++) {
      if (x >= rawPoints[i].x && x <= rawPoints[i + 1].x) { insertAt = i + 1; break }
    }
    const np = [...rawPoints]; np.splice(insertAt, 0, { x, y }); setRawPoints(np); setDragIdx(insertAt)
  }

  /**
   * Snap point to 45/90° angles relative to the last point when Shift is held.
   */
  const snapAngle = (x: number, y: number, prevX: number, prevY: number): [number, number] => {
    const dx = x - prevX
    const dy = y - prevY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.001) return [x, y]

    const angle = Math.atan2(dy, dx)
    // Snap to nearest 45° increment (0, 45, 90, 135, 180, ...)
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
    return [
      prevX + Math.cos(snapped) * dist,
      prevY + Math.sin(snapped) * dist
    ]
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawMode === 'draw' && isDrawing) {
      let [x, y] = toLocal(e)
      // Shift = straight lines at 45/90° angles
      if (e.shiftKey && rawPoints.length > 0) {
        const last = rawPoints[rawPoints.length - 1]
        ;[x, y] = snapAngle(x, y, last.x, last.y)
      }
      setRawPoints(prev => [...prev, { x, y }])
      return
    }
    if (dragIdx !== null) {
      let [x, y] = toLocal(e)
      // Shift = snap to 45/90° from neighbors
      if (e.shiftKey && dragIdx > 0) {
        const prev = rawPoints[dragIdx - 1]
        ;[x, y] = snapAngle(x, y, prev.x, prev.y)
      }
      const np = [...rawPoints]; np[dragIdx] = { x, y }; setRawPoints(np)
    } else {
      setHoverIdx(findPoint(e))
    }
  }

  const handleMouseUp = () => {
    setDragIdx(null)
    if (isDrawing) {
      setIsDrawing(false)
      // Stay in draw mode - user decides when to switch
      // Simplify and auto-close the shape
      setRawPoints(prev => {
        if (prev.length < 3) return PRESETS.Flat
        // Simplify: keep every Nth point
        const step = Math.max(1, Math.floor(prev.length / 20))
        const simplified = prev.filter((_, i) => i === 0 || i === prev.length - 1 || i % step === 0)
        // Auto-close: add base line (back wall) from last point to first
        const last = simplified[simplified.length - 1]
        const first = simplified[0]
        // Add bottom-right corner, bottom-left corner to close
        if (last.y < 0.95) simplified.push({ x: last.x, y: 1 })
        if (first.y < 0.95) simplified.unshift({ x: first.x, y: 1 })
        // Connect left and right sides along the back (y=1)
        simplified.push({ x: 0, y: 1 })
        return simplified
      })
    }
  }

  const handleDblClick = (e: React.MouseEvent) => {
    const idx = findPoint(e)
    if (idx !== null && rawPoints.length > 3) {
      setRawPoints(rawPoints.filter((_, i) => i !== idx))
    }
  }

  // Auto-commit profile changes to store (live update)
  const commitToStore = useCallback(() => {
    const store = useProjectStore.getState()
    const updated = { ...store.profiles }
    updated[activeProfileId] = { ...updated[activeProfileId], points: smoothed, preset: 'custom' }
    useProjectStore.setState({ profiles: updated, isDirty: true })
  }, [smoothed, activeProfileId])

  // Commit whenever smoothed points change
  useEffect(() => {
    if (rawPoints.length >= 3) commitToStore()
  }, [rawPoints, smoothLevel])

  const loadPreset = (name: string) => {
    setRawPoints([...PRESETS[name]])
    setSmoothLevel(0)
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>Profile Editor</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Frame Shape */}
        <FrameShapeSection />

        {/* Presets */}
        <div style={S.section}>
          <div style={S.sTitle}>Presets</div>
          <div style={{ ...S.body, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
            {Object.keys(PRESETS).map(name => (
              <button key={name} style={S.presetBtn} onClick={() => loadPreset(name)}>{name}</button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div style={S.section}>
          <div style={S.sTitle}>Mode</div>
          <div style={{ ...S.body, flexDirection: 'row', gap: 4 }}>
            <button style={S.modeBtn(drawMode === 'edit')} onClick={() => setDrawMode('edit')}>Edit Points</button>
            <button style={S.modeBtn(drawMode === 'draw')} onClick={() => setDrawMode('draw')}>Freehand Draw</button>
            <button style={{ ...S.presetBtn, marginLeft: 'auto' }} onClick={() => { setRawPoints(PRESETS.Flat); setSmoothLevel(0) }}>Clear</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ padding: '8px 12px' }}>
          <canvas
            ref={canvasRef} width={CW} height={CH}
            style={{ borderRadius: 4, cursor: drawMode === 'draw' ? 'crosshair' : dragIdx !== null ? 'grabbing' : hoverIdx !== null ? 'grab' : 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDblClick}
          />
        </div>

        {/* Smooth */}
        <div style={S.section}>
          <div style={S.sTitle}>Smooth</div>
          <div style={S.body}>
            <div style={S.row}>
              <span>Level: {smoothLevel}</span>
            </div>
            <input type="range" min={0} max={5} step={1} value={smoothLevel}
              onChange={(e) => setSmoothLevel(parseInt(e.target.value))} style={S.slider} />
            <div style={S.label}>0 = sharp corners, 5 = very smooth</div>
          </div>
        </div>

        {/* Info */}
        <div style={S.section}>
          <div style={S.body}>
            <div style={S.row}>
              <span>Control points: {rawPoints.length}</span>
              <span>Output points: {smoothed.length}</span>
            </div>
          </div>
        </div>

        {/* Symmetry */}
        <SymmetrySection />
        <CornerSection />

        {/* Profile auto-applies on change */}

      </div>
    </div>
  )
}
