/**
 * Material Library - filament-based material presets for PBR rendering.
 * Each preset mimics the appearance of a real 3D printing filament.
 */

export interface MaterialPreset {
  id: string
  name: string
  color: string
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  ior: number
  sheen: number
  sheenRoughness: number
  sheenColor: string
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'pla-white', name: 'PLA White', color: '#e8e8e8',
    roughness: 0.6, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.3,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'pla-black', name: 'PLA Black', color: '#1a1a1a',
    roughness: 0.5, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.2,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'pla-red', name: 'PLA Red', color: '#cc2222',
    roughness: 0.55, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.3,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'pla-blue', name: 'PLA Blue', color: '#2244aa',
    roughness: 0.55, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.3,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'wood-pla', name: 'Wood PLA', color: '#8B6914',
    roughness: 0.9, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.5,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'silk-gold', name: 'Silk PLA Gold', color: '#DAA520',
    roughness: 0.2, metalness: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.1,
    transmission: 0, ior: 1.5, sheen: 0.8, sheenRoughness: 0.2, sheenColor: '#FFD700'
  },
  {
    id: 'silk-silver', name: 'Silk PLA Silver', color: '#C0C0C0',
    roughness: 0.2, metalness: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.1,
    transmission: 0, ior: 1.5, sheen: 0.8, sheenRoughness: 0.2, sheenColor: '#E0E0E0'
  },
  {
    id: 'silk-copper', name: 'Silk PLA Copper', color: '#B87333',
    roughness: 0.25, metalness: 0.65, clearcoat: 0.2, clearcoatRoughness: 0.15,
    transmission: 0, ior: 1.5, sheen: 0.6, sheenRoughness: 0.25, sheenColor: '#DA8A67'
  },
  {
    id: 'marble', name: 'Marble PLA', color: '#E8E0D0',
    roughness: 0.4, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.3,
    transmission: 0, ior: 1.45, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  },
  {
    id: 'petg-clear', name: 'PETG Clear', color: '#f0f0f0',
    roughness: 0.1, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.05,
    transmission: 0.4, ior: 1.57, sheen: 0, sheenRoughness: 0.5, sheenColor: '#000000'
  }
]

export function getMaterialPreset(id: string): MaterialPreset | undefined {
  return MATERIAL_PRESETS.find((m) => m.id === id)
}

export const DEFAULT_MATERIAL_ID = 'pla-white'
