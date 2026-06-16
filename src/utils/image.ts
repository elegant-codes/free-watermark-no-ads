export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

export function revokeObjectUrl(url: string) {
  URL.revokeObjectURL(url)
}

export function getCropRect(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
  cropX: number,
  cropY: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.max(0, cropX),
    y: Math.max(0, cropY),
    width: Math.min(cropWidth, imageWidth - cropX),
    height: Math.min(cropHeight, imageHeight - cropY),
  }
}

export function createImageFromCanvas(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg',
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality
    )
  })
}

export async function loadFonts(fonts: string[]) {
  if (!document.fonts) return
  await Promise.allSettled(
    fonts.map((font) => document.fonts.load(font))
  )
}

export const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
] as const

export const DEFAULT_FONT = 'Arial'