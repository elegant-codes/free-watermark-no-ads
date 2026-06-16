import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function scaleToFit(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1)
  return {
    width: Math.floor(imageWidth * ratio),
    height: Math.floor(imageHeight * ratio),
  }
}

export function getPositionByPreset(
  preset: string,
  canvasWidth: number,
  canvasHeight: number,
  watermarkWidth: number,
  watermarkHeight: number
): { x: number; y: number } {
  const pad = 20
  switch (preset) {
    case 'top-left':
      return { x: pad, y: pad }
    case 'top-center':
      return { x: (canvasWidth - watermarkWidth) / 2, y: pad }
    case 'top-right':
      return { x: canvasWidth - watermarkWidth - pad, y: pad }
    case 'middle-left':
      return { x: pad, y: (canvasHeight - watermarkHeight) / 2 }
    case 'center':
      return { x: (canvasWidth - watermarkWidth) / 2, y: (canvasHeight - watermarkHeight) / 2 }
    case 'middle-right':
      return { x: canvasWidth - watermarkWidth - pad, y: (canvasHeight - watermarkHeight) / 2 }
    case 'bottom-left':
      return { x: pad, y: canvasHeight - watermarkHeight - pad }
    case 'bottom-center':
      return { x: (canvasWidth - watermarkWidth) / 2, y: canvasHeight - watermarkHeight - pad }
    case 'bottom-right':
      return { x: canvasWidth - watermarkWidth - pad, y: canvasHeight - watermarkHeight - pad }
    case 'tile':
      return { x: pad, y: pad }
    default:
      return { x: pad, y: pad }
  }
}