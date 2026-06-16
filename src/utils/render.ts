import { createImageFromCanvas, loadImageFromDataUrl } from './image'
import type { Layer } from '@/types'

interface RenderInput {
  baseDataUrl: string
  baseWidth: number
  baseHeight: number
  layers: Layer[]
  format: 'png' | 'jpeg'
  quality: number
}

export async function renderWatermarkOnImage(input: RenderInput): Promise<Blob> {
  const { baseDataUrl, baseWidth, baseHeight, layers, format, quality } = input

  const canvas = document.createElement('canvas')
  canvas.width = baseWidth
  canvas.height = baseHeight
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const baseImg = await loadImageFromDataUrl(baseDataUrl)
  ctx.drawImage(baseImg, 0, 0, baseWidth, baseHeight)

  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.save()

    if (layer.type === 'image') {
      const wmImg = await loadImageFromDataUrl(layer.dataUrl)
      ctx.globalAlpha = layer.opacity
      ctx.translate(
        layer.rect.x + (layer.rect.width * layer.scale) / 2,
        layer.rect.y + (layer.rect.height * layer.scale) / 2
      )
      ctx.rotate((layer.rotation * Math.PI) / 180)
      if (layer.cropRect) {
        ctx.drawImage(
          wmImg,
          layer.cropRect.x, layer.cropRect.y,
          layer.cropRect.width, layer.cropRect.height,
          -(layer.rect.width * layer.scale) / 2,
          -(layer.rect.height * layer.scale) / 2,
          layer.rect.width * layer.scale,
          layer.rect.height * layer.scale
        )
      } else {
        ctx.drawImage(
          wmImg,
          -(layer.rect.width * layer.scale) / 2,
          -(layer.rect.height * layer.scale) / 2,
          layer.rect.width * layer.scale,
          layer.rect.height * layer.scale
        )
      }
    } else {
      ctx.globalAlpha = layer.opacity
      ctx.translate(layer.position.x, layer.position.y)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      ctx.font = `${layer.fontSize}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      ctx.textBaseline = 'top'
      ctx.fillText(layer.text, 0, 0)
    }

    ctx.restore()
  }

  return createImageFromCanvas(canvas, format, quality)
}
