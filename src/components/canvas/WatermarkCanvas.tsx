import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Stage, Layer, Image, Transformer, Text, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import { Loader2, Upload } from 'lucide-react'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { useToastStore } from '@/store/useToastStore'
import { loadImageFromDataUrl } from '@/utils/image'
import { scaleToFit } from '@/utils/cn'
import { Button } from '@/components/ui/button'

function useImageLoader(dataUrl: string | null): { img: HTMLImageElement | null; loading: boolean } {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!dataUrl) { setImg(null); setLoading(false); return }
    setLoading(true)
    let cancelled = false
    loadImageFromDataUrl(dataUrl)
      .then((i) => { if (!cancelled) { setImg(i); setLoading(false) } })
      .catch(() => { if (!cancelled) { setLoading(false); useToastStore.getState().addToast('Failed to load image', 'error') } })
    return () => { cancelled = true }
  }, [dataUrl])
  return { img, loading }
}

function LayerImage({ layer, isCropping, onSelect, onDragEnd, onTransformEnd, registerShape }: {
  layer: import('@/types').WatermarkImage
  isCropping: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string) => void
  registerShape: (id: string, node: Konva.Shape | null) => void
}) {
  const { img } = useImageLoader(layer.dataUrl)
  return img ? (
    <Image
      ref={(node) => registerShape(layer.id, node)}
      name={layer.id}
      image={img}
      x={layer.rect.x}
      y={layer.rect.y}
      width={layer.rect.width}
      height={layer.rect.height}
      scaleX={layer.scale}
      scaleY={layer.scale}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable
      listening={!isCropping}
      {...(layer.cropRect ? { crop: layer.cropRect } : {})}
      onClick={() => !isCropping && onSelect(layer.id)}
      onTap={() => !isCropping && onSelect(layer.id)}
      onDragEnd={(e) => onDragEnd(layer.id, e.target.x(), e.target.y())}
      onTransformEnd={() => onTransformEnd(layer.id)}
    />
  ) : null
}

function LayerText({ layer, isCropping, onSelect, onDragEnd, onTransformEnd, registerShape }: {
  layer: import('@/types').WatermarkText
  isCropping: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string) => void
  registerShape: (id: string, node: Konva.Shape | null) => void
}) {
  return (
    <Text
      ref={(node) => registerShape(layer.id, node)}
      name={layer.id}
      text={layer.text}
      x={layer.position.x}
      y={layer.position.y}
      fontSize={layer.fontSize}
      fontFamily={layer.fontFamily}
      fill={layer.color}
      opacity={layer.opacity}
      rotation={layer.rotation}
      draggable
      listening={!isCropping}
      visible={layer.visible}
      onClick={() => !isCropping && onSelect(layer.id)}
      onTap={() => !isCropping && onSelect(layer.id)}
      onDragEnd={(e) => onDragEnd(layer.id, e.target.x(), e.target.y())}
      onTransformEnd={() => onTransformEnd(layer.id)}
    />
  )
}

export default function WatermarkCanvas() {
  const baseImage = useWatermarkStore((s) => s.baseImage)
  const layers = useWatermarkStore((s) => s.layers)
  const selectedLayerId = useWatermarkStore((s) => s.selectedLayerId)
  const selectLayer = useWatermarkStore((s) => s.selectLayer)
  const updatePosition = useWatermarkStore((s) => s.updateWatermarkPosition)
  const updateTransform = useWatermarkStore((s) => s.updateWatermarkTransform)
  const updateTextWatermark = useWatermarkStore((s) => s.updateTextWatermark)
  const crop = useWatermarkStore((s) => s.crop)
  const updateCropRect = useWatermarkStore((s) => s.updateCropRect)
  const pushHistory = useWatermarkStore((s) => s.pushHistory)
  const setBaseImageSize = useWatermarkStore((s) => s.setBaseImageSize)
  const isCropping = useWatermarkStore((s) => s.crop.isCropping)

  const { img: bgImage, loading: bgLoading } = useImageLoader(baseImage)

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const cropTransformerRef = useRef<Konva.Transformer>(null)
  const cropRectRef = useRef<Konva.Rect>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map())
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const [cropDraw, setCropDraw] = useState<{
    active: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const [imageFit, setImageFit] = useState({ scale: 1, offsetX: 0, offsetY: 0, displayW: 0, displayH: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        useWatermarkStore.getState().setBaseImage(ev.target.result, file)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(Math.max(rect.height, 300))
      setDimensions({ width: w, height: h })
      useWatermarkStore.getState().setCanvasSize({ width: w, height: h })
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (bgImage) {
      const nw = bgImage.naturalWidth
      const nh = bgImage.naturalHeight
      setBaseImageSize({ width: nw, height: nh })
      const { width: dw, height: dh } = scaleToFit(nw, nh, dimensions.width * 0.9, dimensions.height * 0.9)
      const s = dw / nw
      setImageFit({
        scale: s,
        offsetX: (dimensions.width - dw) / 2,
        offsetY: (dimensions.height - dh) / 2,
        displayW: dw,
        displayH: dh,
      })
    }
  }, [bgImage, setBaseImageSize, dimensions])

  useEffect(() => {
    if (!transformerRef.current) return
    if (!isCropping && selectedLayerId && shapeRefs.current.has(selectedLayerId)) {
      transformerRef.current.nodes([shapeRefs.current.get(selectedLayerId)!])
    } else {
      transformerRef.current.nodes([])
    }
    transformerRef.current.getLayer()?.batchDraw()
  }, [selectedLayerId, layers, isCropping])

  useEffect(() => {
    if (!cropTransformerRef.current || !cropRectRef.current) return
    if (isCropping && crop.rect) {
      cropTransformerRef.current.nodes([cropRectRef.current])
    } else {
      cropTransformerRef.current.nodes([])
    }
  }, [isCropping, crop.rect, layers])

  const getStagePointer = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return null
    const rect = stage.container().getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleCropPointerDown = useCallback(
    (clientX: number, clientY: number) => {
      if (!isCropping) return
      if (crop.rect) return
      const pos = getStagePointer(clientX, clientY)
      if (!pos) return
      setCropDraw({
        active: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      })
    },
    [isCropping, crop.rect, getStagePointer]
  )

  const handleCropPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!cropDraw?.active) return
      const pos = getStagePointer(clientX, clientY)
      if (!pos) return
      setCropDraw((prev) =>
        prev ? { ...prev, currentX: pos.x, currentY: pos.y } : prev
      )
    },
    [cropDraw?.active, getStagePointer]
  )

  const handleCropPointerUp = useCallback(() => {
    if (!cropDraw?.active) return
    const x = Math.min(cropDraw.startX, cropDraw.currentX)
    const y = Math.min(cropDraw.startY, cropDraw.currentY)
    const w = Math.abs(cropDraw.currentX - cropDraw.startX)
    const h = Math.abs(cropDraw.currentY - cropDraw.startY)
    if (w > 5 && h > 5) {
      updateCropRect({ x, y, width: w, height: h })
    }
    setCropDraw(null)
  }, [cropDraw, updateCropRect])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isCropping) return
      if (e.target === e.target.getStage()) {
        selectLayer(null)
      }
    },
    [selectLayer, isCropping]
  )

  const registerShape = useCallback((id: string, node: Konva.Shape | null) => {
    if (node) shapeRefs.current.set(id, node)
    else shapeRefs.current.delete(id)
  }, [])

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updatePosition(id, x, y)
      pushHistory()
    },
    [updatePosition, pushHistory]
  )

  const handleTransformEnd = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id)
      if (!layer) return
      if (layer.type === 'image') {
        const node = shapeRefs.current.get(id) as Konva.Image | undefined
        if (!node) return
        updatePosition(id, node.x(), node.y())
        updateTransform(id, {
          rect: {
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * node.scaleX()),
            height: Math.max(10, node.height() * node.scaleY()),
          },
          scale: 1,
          rotation: node.rotation(),
        })
      } else {
        const node = shapeRefs.current.get(id) as Konva.Text | undefined
        if (!node) return
        updateTextWatermark(id, {
          position: { x: node.x(), y: node.y() },
          rotation: node.rotation(),
          fontSize: Math.max(8, node.fontSize() * node.scaleX()),
        })
        node.scaleX(1)
        node.scaleY(1)
      }
      pushHistory()
    },
    [layers, updatePosition, updateTransform, updateTextWatermark, pushHistory]
  )

  const handleCropDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      updateCropRect({
        x: e.target.x(),
        y: e.target.y(),
        width: crop.rect?.width ?? 100,
        height: crop.rect?.height ?? 100,
      })
    },
    [crop.rect, updateCropRect]
  )

  const handleCropTransformEnd = useCallback(() => {
    const node = cropRectRef.current
    if (!node) return
    updateCropRect({
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
    })
    node.scaleX(1)
    node.scaleY(1)
    node.getLayer()?.batchDraw()
  }, [updateCropRect])

  const displayCropRect = useMemo(() => {
    if (cropDraw?.active) {
      const x = Math.min(cropDraw.startX, cropDraw.currentX)
      const y = Math.min(cropDraw.startY, cropDraw.currentY)
      const w = Math.abs(cropDraw.currentX - cropDraw.startX)
      const h = Math.abs(cropDraw.currentY - cropDraw.startY)
      return { x, y, width: w, height: h } as import('@/types').Rect
    }
    return crop.rect
  }, [cropDraw, crop.rect])

  if (!baseImage) {
    return (
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        className="flex h-full w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-8 transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            Upload an image to get started
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Click to browse &middot; PNG, JPEG, WebP
          </p>
          <Button variant="default" size="sm" className="mt-4 gap-2">
            <Upload className="h-4 w-4" />
            Choose Image
          </Button>
          <div className="mt-6 space-y-2 text-left text-sm text-muted-foreground/70">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
              How it works
            </p>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
              <span>Upload your base image</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
              <span>Add a logo watermark or text watermark from the controls panel</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
              <span>Drag, resize, rotate, and adjust opacity to your liking</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
              <span>Download your watermarked image as PNG or JPEG</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg"
      style={{
        backgroundImage: 'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%)',
        backgroundSize: '20px 20px',
      }}
    >
      {bgLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading image…</span>
          </div>
        </div>
      )}
      {isCropping && (
        <div
          className="absolute inset-0 z-10 cursor-crosshair"
          onMouseDown={(e) => handleCropPointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handleCropPointerMove(e.clientX, e.clientY)}
          onMouseUp={handleCropPointerUp}
          onTouchStart={(e) => {
            const t = e.touches[0]
            handleCropPointerDown(t.clientX, t.clientY)
          }}
          onTouchMove={(e) => {
            const t = e.touches[0]
            handleCropPointerMove(t.clientX, t.clientY)
          }}
          onTouchEnd={handleCropPointerUp}
        />
      )}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {bgImage && (
            <Image
              image={bgImage}
              x={imageFit.offsetX}
              y={imageFit.offsetY}
              width={imageFit.displayW}
              height={imageFit.displayH}
            />
          )}

          {layers.map((layer) =>
            layer.type === 'image' ? (
              <LayerImage
                key={layer.id}
                layer={layer}
                isCropping={isCropping}
                onSelect={selectLayer}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                registerShape={registerShape}
              />
            ) : (
              <LayerText
                key={layer.id}
                layer={layer}
                isCropping={isCropping}
                onSelect={selectLayer}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                registerShape={registerShape}
              />
            )
          )}

          {displayCropRect && isCropping && (
            <Rect
              ref={cropRectRef}
              x={displayCropRect.x}
              y={displayCropRect.y}
              width={displayCropRect.width}
              height={displayCropRect.height}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="rgba(59, 130, 246, 0.08)"
              dash={[6, 3]}
              draggable={!cropDraw?.active}
              onDragEnd={handleCropDragEnd}
              onTransformEnd={handleCropTransformEnd}
            />
          )}

          {displayCropRect && isCropping && !cropDraw?.active && (
            <>
              <Line points={[0, displayCropRect.y, dimensions.width, displayCropRect.y]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.4} />
              <Line points={[0, displayCropRect.y + displayCropRect.height, dimensions.width, displayCropRect.y + displayCropRect.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.4} />
              <Line points={[displayCropRect.x, 0, displayCropRect.x, dimensions.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.4} />
              <Line points={[displayCropRect.x + displayCropRect.width, 0, displayCropRect.x + displayCropRect.width, dimensions.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.4} />
            </>
          )}

          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="hsl(var(--primary))"
            borderStrokeWidth={1.5}
            anchorFill="hsl(var(--background))"
            anchorStroke="hsl(var(--primary))"
            anchorSize={10}
            anchorCornerRadius={2}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox
              return newBox
            }}
            visible={!isCropping}
          />

          <Transformer
            ref={cropTransformerRef}
            rotateEnabled={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="#3b82f6"
            borderStrokeWidth={2}
            anchorFill="#3b82f6"
            anchorStroke="#ffffff"
            anchorSize={10}
            anchorCornerRadius={2}
            visible={isCropping && !!crop.rect}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox
              return newBox
            }}
          />
        </Layer>
      </Stage>
    </div>
  )
}
