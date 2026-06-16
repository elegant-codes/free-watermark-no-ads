import { Button } from '@/components/ui/button'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import type { PositionPreset as PositionPresetType } from '@/types'

const presets: { value: PositionPresetType; label: string }[] = [
  { value: 'top-left', label: 'TL' },
  { value: 'top-center', label: 'TC' },
  { value: 'top-right', label: 'TR' },
  { value: 'middle-left', label: 'ML' },
  { value: 'center', label: 'C' },
  { value: 'middle-right', label: 'MR' },
  { value: 'bottom-left', label: 'BL' },
  { value: 'bottom-center', label: 'BC' },
  { value: 'bottom-right', label: 'BR' },
]

export default function PositionPresets() {
  const applyPositionPreset = useWatermarkStore((s) => s.applyPositionPreset)
  const selectedLayerId = useWatermarkStore((s) => s.selectedLayerId)

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">Position</label>
      <div className="grid grid-cols-3 gap-1">
        {presets.map((p) => (
          <Button
            key={p.value}
            variant="outline"
            size="sm"
            disabled={!selectedLayerId}
            onClick={() => applyPositionPreset(p.value)}
            className="h-8 text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
