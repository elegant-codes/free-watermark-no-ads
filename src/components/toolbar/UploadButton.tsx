import { useRef, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWatermarkStore } from '@/store/useWatermarkStore'

export default function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const setBaseImage = useWatermarkStore((s) => s.setBaseImage)

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setBaseImage(ev.target.result, file)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload Image</span>
      </Button>
    </>
  )
}
