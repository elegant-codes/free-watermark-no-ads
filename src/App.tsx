import { useCallback, useEffect, useRef, useState } from 'react'
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

function MobileBottomSheet() {
  const [expanded, setExpanded] = useState(false)
  const layers = useWatermarkStore((s) => s.layers)
  const isCropping = useWatermarkStore((s) => s.crop.isCropping)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dy = e.touches[0].clientY - startY.current
      setDragOffset(Math.max(0, dy))
    },
    []
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY.current
      if (dy > 100) {
        setExpanded(false)
      }
      setDragOffset(0)
    },
    []
  )

  useEffect(() => {
    if (layers.length > 0 && !expanded) {
      setExpanded(true)
    }
  }, [layers.length])

  const hasLayers = layers.length > 0
  const layerCount = layers.length

  return (
    <>
      {!expanded && (
        <button
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg active:scale-95 transition-transform"
          onClick={() => setExpanded(true)}
        >
          <ImageIcon className="h-4 w-4" />
          {hasLayers ? `${layerCount} watermark${layerCount > 1 ? 's' : ''}` : 'Open Controls'}
        </button>
      )}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          transform: expanded
            ? `translateY(${dragOffset}px)`
            : 'translateY(100%)',
        }}
      >
        <div className="rounded-t-2xl border bg-background shadow-2xl safe-bottom">
          <div className="flex items-center justify-center py-2">
            <div
              className="h-1.5 w-12 cursor-grab rounded-full bg-muted-foreground/30 active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => {
                startY.current = e.clientY
                const onMove = (me: MouseEvent) => {
                  setDragOffset(Math.max(0, me.clientY - startY.current))
                }
                const onUp = (ue: MouseEvent) => {
                  if (ue.clientY - startY.current > 100) setExpanded(false)
                  setDragOffset(0)
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
              }}
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Controls
              {isCropping && <span className="ml-2 text-blue-500">(Crop mode)</span>}
            </span>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(false)}
            >
              Done
            </button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto px-1 pb-4">
            <ControlPanel />
          </div>
        </div>
      </div>
    </>
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
      <div className="flex flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 p-3">
          <WatermarkCanvas />
        </main>
        {isMobile ? <MobileBottomSheet /> : <DesktopSidebar />}
      </div>
    </div>
  )
}
