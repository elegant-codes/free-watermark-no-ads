import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image, Transformer, Text, Rect } from 'react-konva'
import type Konva from 'konva'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { loadImageFromDataUrl } from '@/utils/image'

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

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map())
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const watermarkImages = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.floor(rect.width),
        height: Math.floor(Math.max(rect.height, 400)),
      })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (!baseImage) return
    loadImageFromDataUrl(baseImage).then((img) => {
      setBgImage(img)
      useWatermarkStore.getState().setBaseImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    })
  }, [baseImage])

  useEffect(() => {
    layers
      .filter((l): l is import('@/types').WatermarkImage => l.type === 'image')
      .forEach((layer) => {
        if (!watermarkImages.current.has(layer.id)) {
          loadImageFromDataUrl(layer.dataUrl).then((img) => {
            watermarkImages.current.set(layer.id, img)
            forceUpdate({})
          })
        }
      })
  }, [layers])

  const [, forceUpdate] = useState({})

  useEffect(() => {
    if (!transformerRef.current) return
    if (selectedLayerId && shapeRefs.current.has(selectedLayerId)) {
      transformerRef.current.nodes([shapeRefs.current.get(selectedLayerId)!])
    } else {
      transformerRef.current.nodes([])
    }
    transformerRef.current.getLayer()?.batchDraw()
  }, [selectedLayerId])

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      selectLayer(null)
    }
  }

  const registerShape = (id: string, node: Konva.Shape | null) => {
    if (node) shapeRefs.current.set(id, node)
    else shapeRefs.current.delete(id)
  }

  const handleDragEnd = (id: string, layerType: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (layerType === 'image') {
      updatePosition(id, e.target.x(), e.target.y())
    } else {
      updateTextWatermark(id, { position: { x: e.target.x(), y: e.target.y() } })
    }
    pushHistory()
  }

  const handleTransformEnd = (layer: import('@/types').WatermarkImage) => {
    const node = shapeRefs.current.get(layer.id) as Konva.Image | undefined
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    updatePosition(layer.id, node.x(), node.y())
    updateTransform(layer.id, {
      rect: {
        x: node.x(),
        y: node.y(),
        width: Math.max(10, node.width() * scaleX),
        height: Math.max(10, node.height() * scaleY),
      },
      scale: 1,
      rotation: node.rotation(),
    })
    pushHistory()
  }

  const handleTextTransformEnd = (layer: import('@/types').WatermarkText) => {
    const node = shapeRefs.current.get(layer.id) as Konva.Text | undefined
    if (!node) return
    updateTextWatermark(layer.id, {
      position: { x: node.x(), y: node.y() },
      rotation: node.rotation(),
      fontSize: Math.max(8, node.fontSize() * node.scaleX()),
    })
    node.scaleX(1)
    node.scaleY(1)
    pushHistory()
  }

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
        className="max-h-full max-w-full"
      >
        <Layer>
          {bgImage && <Image image={bgImage} />}

          {layers.map((layer) => {
            if (layer.type === 'image') {
              const img = watermarkImages.current.get(layer.id)
              if (!img) return null
              const cropRect = layer.cropRect
              return (
                <Image
                  key={layer.id}
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
                  {...(cropRect
                    ? {
                        crop: {
                          x: cropRect.x,
                          y: cropRect.y,
                          width: cropRect.width,
                          height: cropRect.height,
                        },
                      }
                    : {})}
                  onClick={() => selectLayer(layer.id)}
                  onTap={() => selectLayer(layer.id)}
                  onDragEnd={(e) => handleDragEnd(layer.id, 'image', e)}
                  onTransformEnd={() => handleTransformEnd(layer)}
                />
              )
            }

            if (layer.type === 'text') {
              return (
                <Text
                  key={layer.id}
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
                  onClick={() => selectLayer(layer.id)}
                  onTap={() => selectLayer(layer.id)}
                  onDragEnd={(e) => handleDragEnd(layer.id, 'text', e)}
                  onTransformEnd={() => handleTextTransformEnd(layer)}
                />
              )
            }
            return null
          })}

          {crop.isCropping && (
            <Rect
              x={crop.rect?.x ?? 0}
              y={crop.rect?.y ?? 0}
              width={crop.rect?.width ?? 100}
              height={crop.rect?.height ?? 100}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="rgba(59, 130, 246, 0.1)"
              draggable
              onDragEnd={(e) => {
                updateCropRect({
                  x: e.target.x(),
                  y: e.target.y(),
                  width: crop.rect?.width ?? 100,
                  height: crop.rect?.height ?? 100,
                })
              }}
              onTransformEnd={(e) => {
                const node = e.target
                updateCropRect({
                  x: node.x(),
                  y: node.y(),
                  width: node.width() * node.scaleX(),
                  height: node.height() * node.scaleY(),
                })
              }}
            />
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
