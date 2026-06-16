import { useEffect } from 'react'
import { Undo2, Redo2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import WatermarkCanvas from '@/components/canvas/WatermarkCanvas'
import UploadButton from '@/components/toolbar/UploadButton'
import ThemeToggle from '@/components/toolbar/ThemeToggle'
import ControlPanel from '@/components/toolbar/ControlPanel'
import BatchDialog from '@/components/toolbar/BatchDialog'
import ExportDialog from '@/components/toolbar/ExportDialog'
import Toaster from '@/components/Toaster'

function Header() {
  const undo = useWatermarkStore((s) => s.undo)
  const redo = useWatermarkStore((s) => s.redo)
  const historyIndex = useWatermarkStore((s) => s.historyIndex)
  const history = useWatermarkStore((s) => s.history)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 safe-top">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <span className="hidden text-sm font-semibold sm:inline">
            Watermark Studio
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="h-9 w-9"
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="h-9 w-9"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <ExportDialog />
        <BatchDialog />
        <UploadButton />
        <ThemeToggle />
      </div>
    </header>
  )
}

function MobileFixedBar() {
  const isCropping = useWatermarkStore((s) => s.crop.isCropping)

  return (
    <div className="flex h-[38vh] shrink-0 flex-col border-t bg-background safe-bottom">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs font-medium">
          Controls
          {isCropping && <span className="ml-2 text-xs text-blue-500">(Crop mode)</span>}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <ControlPanel />
      </div>
    </div>
  )
}

function DesktopSidebar() {
  return (
    <div className="flex w-72 shrink-0 flex-col border-l bg-background">
      <div className="border-b px-3 py-2">
        <span className="text-sm font-medium">Controls</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ControlPanel />
      </div>
    </div>
  )
}

export default function App() {
  useTheme()
  const isMobile = useIsMobile()
  const setIsMobile = useWatermarkStore((s) => s.setIsMobile)

  useEffect(() => {
    setIsMobile(isMobile)
  }, [isMobile, setIsMobile])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          useWatermarkStore.getState().redo()
        } else {
          useWatermarkStore.getState().undo()
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useWatermarkStore.getState().selectedLayerId
        if (selectedId && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
          useWatermarkStore.getState().removeLayer(selectedId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      {isMobile ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex min-w-0 flex-1 p-3">
            <WatermarkCanvas />
          </main>
          <MobileFixedBar />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex min-w-0 flex-1 p-3">
            <WatermarkCanvas />
          </main>
          <DesktopSidebar />
        </div>
      )}
      <Toaster />
    </div>
  )
}
