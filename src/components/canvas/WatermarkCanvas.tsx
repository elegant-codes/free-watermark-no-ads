import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image, Transformer, Text, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { loadImageFromDataUrl } from '@/utils/image'

function useImageLoader(dataUrl: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!dataUrl) { setImg(null); return }
    let cancelled = false
    loadImageFromDataUrl(dataUrl).then((i) => { if (!cancelled) setImg(i) })
    return () => { cancelled = true }
  }, [dataUrl])
  return img
}

function LayerImage({ layer, onSelect, onDragEnd, onTransformEnd, registerShape }: {
  layer: import('@/types').WatermarkImage
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string) => void
  registerShape: (id: string, node: Konva.Shape | null) => void
}) {
  const img = useImageLoader(layer.dataUrl)

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
      {...(layer.cropRect ? { crop: layer.cropRect } : {})}
      onClick={() => onSelect(layer.id)}
      onTap={() => onSelect(layer.id)}
      onDragEnd={(e) => onDragEnd(layer.id, e.target.x(), e.target.y())}
      onTransformEnd={() => onTransformEnd(layer.id)}
    />
  ) : null
}

function LayerText({ layer, onSelect, onDragEnd, onTransformEnd, registerShape }: {
  layer: import('@/types').WatermarkText
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
      visible={layer.visible}
      onClick={() => onSelect(layer.id)}
      onTap={() => onSelect(layer.id)}
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

  const bgImage = useImageLoader(baseImage)

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
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

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.floor(rect.width),
        height: Math.floor(Math.max(rect.height, 300)),
      })
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (bgImage) {
      setBaseImageSize({ width: bgImage.naturalWidth, height: bgImage.naturalHeight })
    }
  }, [bgImage, setBaseImageSize])

  useEffect(() => {
    if (!transformerRef.current) return
    if (selectedLayerId && shapeRefs.current.has(selectedLayerId)) {
      transformerRef.current.nodes([shapeRefs.current.get(selectedLayerId)!])
    } else {
      transformerRef.current.nodes([])
    }
    transformerRef.current.getLayer()?.batchDraw()
  }, [selectedLayerId, layers])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        selectLayer(null)
      }
    },
    [selectLayer]
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
          rect: { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()) },
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

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isCropping) return
      const stage = e.target.getStage()
      if (!stage) return
      const pos = stage.getPointerPosition()
      if (!pos) return
      setCropDraw({
        active: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      })
    },
    [isCropping]
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!cropDraw?.active) return
      const stage = e.target.getStage()
      if (!stage) return
      const pos = stage.getPointerPosition()
      if (!pos) return
      setCropDraw((prev) =>
        prev ? { ...prev, currentX: pos.x, currentY: pos.y } : prev
      )
    },
    [cropDraw?.active]
  )

  const handleMouseUp = useCallback(() => {
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

  const cropRect = useMemo(() => {
    if (!cropDraw?.active) return crop.rect
    const x = Math.min(cropDraw.startX, cropDraw.currentX)
    const y = Math.min(cropDraw.startY, cropDraw.currentY)
    const w = Math.abs(cropDraw.currentX - cropDraw.startX)
    const h = Math.abs(cropDraw.currentY - cropDraw.startY)
    return { x, y, width: w, height: h } as import('@/types').Rect
  }, [cropDraw, crop.rect])

  if (!baseImage) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-8"
      >
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Upload an image to get started
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Supported formats: PNG, JPEG, WebP
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg"
      style={{
        backgroundImage: 'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%)',
        backgroundSize: '20px 20px',
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="max-h-full max-w-full"
      >
        <Layer>
          {bgImage && (
            <Image
              image={bgImage}
              width={dimensions.width}
              height={dimensions.height}
              fill="contain"
            />
          )}

          {layers.map((layer) =>
            layer.type === 'image' ? (
              <LayerImage
                key={layer.id}
                layer={layer}
                onSelect={selectLayer}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                registerShape={registerShape}
              />
            ) : (
              <LayerText
                key={layer.id}
                layer={layer}
                onSelect={selectLayer}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                registerShape={registerShape}
              />
            )
          )}

          {cropRect && isCropping && (
            <Rect
              x={cropRect.x}
              y={cropRect.y}
              width={cropRect.width}
              height={cropRect.height}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="rgba(59, 130, 246, 0.1)"
              dash={[6, 3]}
              draggable={false}
            />
          )}

          {(cropRect && isCropping) && (
            <>
              <Line points={[0, cropRect.y, dimensions.width, cropRect.y]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.5} />
              <Line points={[0, cropRect.y + cropRect.height, dimensions.width, cropRect.y + cropRect.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.5} />
              <Line points={[cropRect.x, 0, cropRect.x, dimensions.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.5} />
              <Line points={[cropRect.x + cropRect.width, 0, cropRect.x + cropRect.width, dimensions.height]} stroke="#3b82f6" strokeWidth={1} dash={[4, 4]} opacity={0.5} />
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
          />
        </Layer>
      </Stage>
    </div>
  )
}
