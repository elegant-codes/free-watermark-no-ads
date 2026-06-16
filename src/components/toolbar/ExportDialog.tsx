import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { useToastStore } from '@/store/useToastStore'
import { createImageFromCanvas, loadImageFromDataUrl } from '@/utils/image'
import { scaleToFit } from '@/utils/cn'

export default function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { exportSettings, setExportSettings } = useWatermarkStore()

  const handleExport = async () => {
    setExporting(true)

    try {
      const store = useWatermarkStore.getState()
      const b64 = store.baseImage
      if (!b64) { setExporting(false); return }

      const canvas = document.createElement('canvas')
      const img = await loadImageFromDataUrl(b64)

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const currentLayers = store.layers
      const natW = store.baseImageSize?.width ?? canvas.width
      const natH = store.baseImageSize?.height ?? canvas.height
      const cw = store.canvasSize.width || canvas.width
      const ch = store.canvasSize.height || canvas.height
      const { width: displayW, height: displayH } = scaleToFit(natW, natH, cw * 0.9, ch * 0.9)
      const scaleX = canvas.width / displayW
      const scaleY = canvas.height / displayH

      for (const layer of currentLayers) {
        if (!layer.visible) continue
        ctx.save()
        if (layer.type === 'image') {
          const wmImg = await loadImageFromDataUrl(layer.dataUrl)
          ctx.globalAlpha = layer.opacity
          ctx.translate(
            layer.rect.x * scaleX + (layer.rect.width * layer.scale * scaleX) / 2,
            layer.rect.y * scaleY + (layer.rect.height * layer.scale * scaleY) / 2
          )
          ctx.rotate((layer.rotation * Math.PI) / 180)
          const drawW = layer.rect.width * layer.scale * scaleX
          const drawH = layer.rect.height * layer.scale * scaleY
          if (layer.cropRect) {
            ctx.drawImage(wmImg, layer.cropRect.x, layer.cropRect.y, layer.cropRect.width, layer.cropRect.height, -drawW / 2, -drawH / 2, drawW, drawH)
          } else {
            ctx.drawImage(wmImg, -drawW / 2, -drawH / 2, drawW, drawH)
          }
        } else {
          ctx.globalAlpha = layer.opacity
          ctx.translate(layer.position.x * scaleX, layer.position.y * scaleY)
          ctx.rotate((layer.rotation * Math.PI) / 180)
          ctx.font = `${layer.fontSize * scaleX}px ${layer.fontFamily}`
          ctx.fillStyle = layer.color
          ctx.textBaseline = 'top'
          ctx.fillText(layer.text, 0, 0)
        }
        ctx.restore()
      }

      const blob = await createImageFromCanvas(
        canvas,
        exportSettings.format,
        exportSettings.quality
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportSettings.filename}.${exportSettings.format}`
      a.click()
      URL.revokeObjectURL(url)
      useToastStore.getState().addToast('Watermark download started!')
      setOpen(false)
    } catch {
      useToastStore.getState().addToast('Failed to export image', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 px-2 sm:px-3">
          <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Download Watermarked Image</DialogTitle>
          <DialogDescription>
            Choose format and quality settings for your export.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={exportSettings.format}
              onValueChange={(v: 'png' | 'jpeg') =>
                setExportSettings({ format: v })
              }
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (lossless)</SelectItem>
                <SelectItem value="jpeg">JPEG (smaller file)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quality">
              Quality: {Math.round(exportSettings.quality * 100)}%
            </Label>
            <Slider
              id="quality"
              min={0.1}
              max={1}
              step={0.01}
              value={[exportSettings.quality]}
              onValueChange={([v]) => setExportSettings({ quality: v })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filename">Filename</Label>
            <input
              id="filename"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={exportSettings.filename}
              onChange={(e) => setExportSettings({ filename: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Downloading...' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
