import { createImageFromCanvas, loadImageFromDataUrl } from './image'
import { scaleToFit } from '@/utils/cn'
import type { Layer } from '@/types'

interface RenderInput {
  baseDataUrl: string
  baseWidth: number
  baseHeight: number
  canvasWidth: number
  canvasHeight: number
  layers: Layer[]
  format: 'png' | 'jpeg'
  quality: number
}

export async function renderWatermarkOnImage(input: RenderInput): Promise<Blob> {
  const { baseDataUrl, baseWidth, baseHeight, canvasWidth, canvasHeight, layers, format, quality } = input

  const canvas = document.createElement('canvas')
  canvas.width = baseWidth
  canvas.height = baseHeight
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const baseImg = await loadImageFromDataUrl(baseDataUrl)
  ctx.drawImage(baseImg, 0, 0, baseWidth, baseHeight)

  const { width: displayW, height: displayH } = scaleToFit(baseWidth, baseHeight, canvasWidth * 0.9, canvasHeight * 0.9)
  const offX = (canvasWidth - displayW) / 2
  const offY = (canvasHeight - displayH) / 2
  const scaleX = baseWidth / displayW
  const scaleY = baseHeight / displayH

  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.save()

    if (layer.type === 'image') {
      const wmImg = await loadImageFromDataUrl(layer.dataUrl)
      const imgRelX = layer.rect.x - offX
      const imgRelY = layer.rect.y - offY
      ctx.globalAlpha = layer.opacity
      ctx.translate(
        imgRelX * scaleX + (layer.rect.width * layer.scale * scaleX) / 2,
        imgRelY * scaleY + (layer.rect.height * layer.scale * scaleY) / 2
      )
      ctx.rotate((layer.rotation * Math.PI) / 180)
      const drawW = layer.rect.width * layer.scale * scaleX
      const drawH = layer.rect.height * layer.scale * scaleY
      if (layer.cropRect) {
        ctx.drawImage(
          wmImg,
          layer.cropRect.x, layer.cropRect.y,
          layer.cropRect.width, layer.cropRect.height,
          -drawW / 2, -drawH / 2, drawW, drawH
        )
      } else {
        ctx.drawImage(wmImg, -drawW / 2, -drawH / 2, drawW, drawH)
      }
    } else {
      const imgRelX = layer.position.x - offX
      const imgRelY = layer.position.y - offY
      ctx.globalAlpha = layer.opacity
      ctx.translate(imgRelX * scaleX, imgRelY * scaleY)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      ctx.font = `${layer.fontSize * scaleX}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      ctx.textBaseline = 'top'
      ctx.fillText(layer.text, 0, 0)
    }

    ctx.restore()
  }

  return createImageFromCanvas(canvas, format, quality)
}
