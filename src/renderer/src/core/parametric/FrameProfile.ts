/**
 * Frame profile definitions with HIGH segment counts for smooth normals.
 */

import type { FrameProfile, ProfileId, ProfilePoint } from '../types'

function flatProfile(): ProfilePoint[] {
  return [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
  ]
}

function ogeeProfile(segments = 32): ProfilePoint[] {
  const points: ProfilePoint[] = []
  points.push({ x: 0, y: 1 })
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = t
    const y = t < 0.5
      ? 0.5 * (1 - Math.cos(Math.PI * t * 2)) * 0.4
      : 0.4 + (0.6 * (1 - Math.cos(Math.PI * (t - 0.5) * 2)) * 0.5)
    points.push({ x, y: 1 - y })
  }
  points.push({ x: 1, y: 1 })
  return points
}

function roundProfile(segments = 32): ProfilePoint[] {
  const points: ProfilePoint[] = []
  points.push({ x: 0, y: 1 })
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = Math.PI * t
    points.push({ x: t, y: 1 - Math.sin(angle) * 0.5 })
  }
  points.push({ x: 1, y: 1 })
  return points
}

function bevelProfile(): ProfilePoint[] {
  return [
    { x: 0, y: 1 }, { x: 0, y: 0.3 }, { x: 1, y: 0 }, { x: 1, y: 1 }
  ]
}

function scoopProfile(segments = 32): ProfilePoint[] {
  const points: ProfilePoint[] = []
  points.push({ x: 0, y: 1 })
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = (Math.PI / 2) * t
    points.push({ x: t, y: 1 - (1 - Math.cos(angle)) * 0.6 })
  }
  points.push({ x: 1, y: 1 })
  return points
}

export const BUILTIN_PROFILES: Record<ProfileId, FrameProfile> = {
  flat:  { id: 'flat',  name: 'Flat',  preset: 'flat',  points: flatProfile() },
  ogee:  { id: 'ogee',  name: 'Ogee',  preset: 'ogee',  points: ogeeProfile() },
  round: { id: 'round', name: 'Round', preset: 'round', points: roundProfile() },
  bevel: { id: 'bevel', name: 'Bevel', preset: 'bevel', points: bevelProfile() },
  scoop: { id: 'scoop', name: 'Scoop', preset: 'scoop', points: scoopProfile() }
}
