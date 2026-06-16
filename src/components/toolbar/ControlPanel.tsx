import { Type, Image, Crop, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import { FONT_FAMILIES } from '@/utils/image'
import PositionPresets from '@/components/toolbar/PositionPresets'
import ExportDialog from '@/components/toolbar/ExportDialog'
import BatchDialog from '@/components/toolbar/BatchDialog'

function ImageTab() {
  const layers = useWatermarkStore((s) => s.layers)
  const selectedLayerId = useWatermarkStore((s) => s.selectedLayerId)
  const addImageWatermark = useWatermarkStore((s) => s.addImageWatermark)
  const updateTransform = useWatermarkStore((s) => s.updateWatermarkTransform)
  const updateTextWatermark = useWatermarkStore((s) => s.updateTextWatermark)
  const removeLayer = useWatermarkStore((s) => s.removeLayer)
  const startCrop = useWatermarkStore((s) => s.startCrop)

  const selected = layers.find((l) => l.id === selectedLayerId)
  const isImageSelected = selected?.type === 'image'
  const isTextSelected = selected?.type === 'text'

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        addImageWatermark(ev.target.result, file)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleOpacity = (v: number[]) => {
    if (isImageSelected) updateTransform(selectedLayerId!, { opacity: v[0] })
    if (isTextSelected) updateTextWatermark(selectedLayerId!, { opacity: v[0] })
  }

  const handleScale = (v: number[]) => {
    if (isImageSelected) updateTransform(selectedLayerId!, { scale: v[0] })
  }

  const handleRotation = (v: number[]) => {
    if (isImageSelected) updateTransform(selectedLayerId!, { rotation: v[0] })
    if (isTextSelected) updateTextWatermark(selectedLayerId!, { rotation: v[0] })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Add Watermark
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
          <Image className="h-4 w-4" />
          Upload Logo
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full gap-2"
          onClick={() => useWatermarkStore.getState().addTextWatermark()}
        >
          <Type className="h-4 w-4" />
          Add Text Watermark
        </Button>
      </div>

      {selected && (
        <>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Opacity</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round((selected.opacity ?? 1) * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[selected.opacity ?? 1]}
                onValueChange={handleOpacity}
              />
            </div>

            {isImageSelected && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Scale</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((selected as typeof selected & { scale: number }).scale * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.1}
                  max={5}
                  step={0.01}
                  value={[selected.scale]}
                  onValueChange={handleScale}
                />
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Rotation</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(selected.rotation ?? 0)}°
                </span>
              </div>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={[selected.rotation ?? 0]}
                onValueChange={handleRotation}
              />
            </div>
          </div>

          <PositionPresets />

          {isImageSelected && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={startCrop}
            >
              <Crop className="h-4 w-4" />
              Crop Logo
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => removeLayer(selected.id)}
          >
            Remove {isImageSelected ? 'Logo' : 'Text'}
          </Button>
        </>
      )}

      {!selected && layers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Upload an image and add a watermark to get started.
        </p>
      )}
    </div>
  )
}

function TextTab() {
  const layers = useWatermarkStore((s) => s.layers)
  const selectedLayerId = useWatermarkStore((s) => s.selectedLayerId)
  const updateTextWatermark = useWatermarkStore((s) => s.updateTextWatermark)
  const selected = layers.find(
    (l) => l.id === selectedLayerId && l.type === 'text'
  ) as import('@/types').WatermarkText | undefined

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a text watermark first in the Image tab.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Text Content</Label>
        <input
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selected.text}
          onChange={(e) =>
            updateTextWatermark(selected.id, { text: e.target.value })
          }
        />
      </div>
      <div>
        <Label>Font Size</Label>
        <div className="mt-1 flex items-center gap-2">
          <Slider
            min={8}
            max={200}
            step={1}
            value={[selected.fontSize]}
            onValueChange={([v]) =>
              updateTextWatermark(selected.id, { fontSize: v })
            }
            className="flex-1"
          />
          <span className="w-10 text-right text-sm text-muted-foreground">
            {selected.fontSize}
          </span>
        </div>
      </div>
      <div>
        <Label>Font Family</Label>
        <select
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selected.fontFamily}
          onChange={(e) =>
            updateTextWatermark(selected.id, { fontFamily: e.target.value })
          }
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Color</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-10 cursor-pointer rounded-md border border-input"
            value={selected.color}
            onChange={(e) =>
              updateTextWatermark(selected.id, { color: e.target.value })
            }
          />
          <span className="text-xs text-muted-foreground">{selected.color}</span>
        </div>
      </div>
    </div>
  )
}

function CropTab() {
  const crop = useWatermarkStore((s) => s.crop)
  const startCrop = useWatermarkStore((s) => s.startCrop)
  const applyCrop = useWatermarkStore((s) => s.applyCrop)
  const cancelCrop = useWatermarkStore((s) => s.cancelCrop)
  const selectedLayerId = useWatermarkStore((s) => s.selectedLayerId)
  const layers = useWatermarkStore((s) => s.layers)
  const selected = layers.find((l) => l.id === selectedLayerId)

  if (!selected || selected.type !== 'image') {
    return (
      <p className="text-sm text-muted-foreground">
        Select a logo watermark to crop it.
      </p>
    )
  }

  if (!crop.isCropping) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Crop your logo to remove unwanted areas.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={startCrop}
        >
          <Crop className="h-4 w-4" />
          Start Cropping
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Crop Mode Active</p>
      <p className="text-xs text-muted-foreground">
        Drag the selection rectangle on the canvas to choose the area to keep.
      </p>
      <div className="flex gap-2">
        <Button variant="default" size="sm" className="flex-1" onClick={applyCrop}>
          Apply Crop
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={cancelCrop}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SettingsTab() {
  const resetAll = useWatermarkStore((s) => s.resetAll)

  return (
    <div className="space-y-4">
      <ExportDialog />
      <BatchDialog />
      <div className="pt-2">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={resetAll}
        >
          Reset All
        </Button>
      </div>
    </div>
  )
}

export default function ControlPanel() {
  return (
    <Tabs
      defaultValue="image"
      className="flex h-full flex-col"
      onValueChange={(v) => useWatermarkStore.getState().setActiveTab(v as any)}
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="image" className="gap-1 text-xs sm:text-sm">
          <Image className="h-4 w-4" />
          <span className="hidden sm:inline">Image</span>
        </TabsTrigger>
        <TabsTrigger value="text" className="gap-1 text-xs sm:text-sm">
          <Type className="h-4 w-4" />
          <span className="hidden sm:inline">Text</span>
        </TabsTrigger>
        <TabsTrigger value="crop" className="gap-1 text-xs sm:text-sm">
          <Crop className="h-4 w-4" />
          <span className="hidden sm:inline">Crop</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-3">
        <TabsContent value="image" className="mt-0">
          <ImageTab />
        </TabsContent>
        <TabsContent value="text" className="mt-0">
          <TextTab />
        </TabsContent>
        <TabsContent value="crop" className="mt-0">
          <CropTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
          <SettingsTab />
        </TabsContent>
      </div>
    </Tabs>
  )
}
