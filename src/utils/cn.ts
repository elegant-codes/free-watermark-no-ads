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
  contentWidth: number,
  contentHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  offsetX = 0,
  offsetY = 0
): { x: number; y: number } {
  const pad = 20
  const base = (() => {
    switch (preset) {
      case 'top-left':
        return { x: pad, y: pad }
      case 'top-center':
        return { x: (contentWidth - watermarkWidth) / 2, y: pad }
      case 'top-right':
        return { x: contentWidth - watermarkWidth - pad, y: pad }
      case 'middle-left':
        return { x: pad, y: (contentHeight - watermarkHeight) / 2 }
      case 'center':
        return { x: (contentWidth - watermarkWidth) / 2, y: (contentHeight - watermarkHeight) / 2 }
      case 'middle-right':
        return { x: contentWidth - watermarkWidth - pad, y: (contentHeight - watermarkHeight) / 2 }
      case 'bottom-left':
        return { x: pad, y: contentHeight - watermarkHeight - pad }
      case 'bottom-center':
        return { x: (contentWidth - watermarkWidth) / 2, y: contentHeight - watermarkHeight - pad }
      case 'bottom-right':
        return { x: contentWidth - watermarkWidth - pad, y: contentHeight - watermarkHeight - pad }
      case 'tile':
        return { x: pad, y: pad }
      default:
        return { x: pad, y: pad }
    }
  })()
  return { x: base.x + offsetX, y: base.y + offsetY }
}