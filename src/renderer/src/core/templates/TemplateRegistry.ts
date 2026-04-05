/**
 * Template Registry - predefined frame configurations.
 */

import type { FrameDimensions } from '../types'

export interface FrameTemplate {
  id: string
  name: string
  description: string
  dimensions: FrameDimensions
  profileId: string
}

export const BUILTIN_TEMPLATES: FrameTemplate[] = [
  {
    id: 'classic-small',
    name: 'Classic Small',
    description: 'Classic ogee frame for 10x15cm photos',
    dimensions: {
      pictureWidth: 100,
      pictureHeight: 150,
      frameWidth: 30,
      frameDepth: 15,
      backThickness: 2
    },
    profileId: 'ogee'
  },
  {
    id: 'classic-medium',
    name: 'Classic Medium',
    description: 'Classic ogee frame for 20x30cm photos',
    dimensions: {
      pictureWidth: 200,
      pictureHeight: 300,
      frameWidth: 40,
      frameDepth: 20,
      backThickness: 2
    },
    profileId: 'ogee'
  },
  {
    id: 'modern-flat',
    name: 'Modern Flat',
    description: 'Minimalist flat frame for 20x30cm photos',
    dimensions: {
      pictureWidth: 200,
      pictureHeight: 300,
      frameWidth: 25,
      frameDepth: 12,
      backThickness: 2
    },
    profileId: 'flat'
  },
  {
    id: 'shadow-box',
    name: 'Shadow Box',
    description: 'Deep frame for 3D objects, 20x20cm',
    dimensions: {
      pictureWidth: 200,
      pictureHeight: 200,
      frameWidth: 35,
      frameDepth: 50,
      backThickness: 3
    },
    profileId: 'flat'
  },
  {
    id: 'wide-bevel',
    name: 'Wide Bevel',
    description: 'Wide beveled frame for A4 prints',
    dimensions: {
      pictureWidth: 210,
      pictureHeight: 297,
      frameWidth: 55,
      frameDepth: 18,
      backThickness: 2
    },
    profileId: 'bevel'
  }
]

export function getTemplate(id: string): FrameTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id)
}
