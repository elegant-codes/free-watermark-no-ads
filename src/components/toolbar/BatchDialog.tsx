import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { Upload, X, Loader2, FileImage, Package } from 'lucide-react'
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
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { renderWatermarkOnImage } from '@/utils/render'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BatchDialog() {
  const [open, setOpen] = useState(false)
  const batchItems = useWatermarkStore((s) => s.batchItems)
  const addBatchItem = useWatermarkStore((s) => s.addBatchItem)
  const removeBatchItem = useWatermarkStore((s) => s.removeBatchItem)
  const clearBatchItems = useWatermarkStore((s) => s.clearBatchItems)
  const setBatchItemStatus = useWatermarkStore((s) => s.setBatchItemStatus)
  const layers = useWatermarkStore((s) => s.layers)
  const exportSettings = useWatermarkStore((s) => s.exportSettings)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      for (const file of files) {
        addBatchItem(file)
      }
      if (inputRef.current) inputRef.current.value = ''
    },
    [addBatchItem]
  )

  const processBatch = useCallback(async () => {
    if (batchItems.length === 0 || layers.length === 0) return
    setProcessing(true)
    setProgress(0)

    const items = [...batchItems]
    const results: { blob: Blob; name: string }[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setBatchItemStatus(item.id, 'processing')

      try {
        const baseDataUrl = item.dataUrl
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = baseDataUrl
        })

        const blob = await renderWatermarkOnImage({
          baseDataUrl,
          baseWidth: img.naturalWidth,
          baseHeight: img.naturalHeight,
          layers,
          format: exportSettings.format,
          quality: exportSettings.quality,
        })

        setBatchItemStatus(item.id, 'done', blob)
        results.push({ blob, name: item.file.name.replace(/\.[^.]+$/, `.${exportSettings.format}`) })
      } catch {
        setBatchItemStatus(item.id, 'error')
      }

      setProgress(((i + 1) / items.length) * 100)
    }

    // Download as ZIP
    if (results.length > 0) {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const result of results) {
        zip.file(result.name, result.blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'watermarked-images.zip'
      a.click()
      URL.revokeObjectURL(url)
    }

    setProcessing(false)
    setProgress(100)
  }, [batchItems, layers, exportSettings, setBatchItemStatus])

  const canProcess = batchItems.length > 0 && layers.length > 0 && !processing

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 px-2 sm:px-3">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Batch</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Batch Watermark</DialogTitle>
          <DialogDescription>
            Process multiple images with the same watermark settings.
            {layers.length === 0 && (
              <span className="mt-1 block text-destructive">
                Add at least one watermark layer first.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
            <Upload className="h-5 w-5" />
            Choose images to batch process
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </label>

          {batchItems.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(item.file.size)}
                  </span>
                  {item.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {item.status === 'done' && (
                    <span className="text-xs text-green-600 dark:text-green-400">Done</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs text-destructive">Error</span>
                  )}
                  {!processing && (
                    <button
                      onClick={() => removeBatchItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {processing && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Processing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {batchItems.length > 0 && !processing && (
            <Button variant="ghost" size="sm" onClick={clearBatchItems}>
              Clear All
            </Button>
          )}
          <Button
            variant="default"
            onClick={processBatch}
            disabled={!canProcess}
            className="gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Process {batchItems.length > 0 ? `${batchItems.length} images` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
