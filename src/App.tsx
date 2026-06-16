import { useCallback, useEffect, useRef, useState } from 'react'
import { Undo2, Redo2, PanelRightOpen, PanelRightClose, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useWatermarkStore } from '@/store/useWatermarkStore'
import WatermarkCanvas from '@/components/canvas/WatermarkCanvas'
import UploadButton from '@/components/toolbar/UploadButton'
import ThemeToggle from '@/components/toolbar/ThemeToggle'
import ControlPanel from '@/components/toolbar/ControlPanel'

function Header() {
  const undo = useWatermarkStore((s) => s.undo)
  const redo = useWatermarkStore((s) => s.redo)
  const historyIndex = useWatermarkStore((s) => s.historyIndex)
  const history = useWatermarkStore((s) => s.history)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 safe-top">
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
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="h-9 w-9"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <UploadButton />
        <ThemeToggle />
      </div>
    </header>
  )
}

function MobileBottomSheet() {
  const [expanded, setExpanded] = useState(false)
  const isOpen = useWatermarkStore((s) => s.isControlPanelOpen)
  const togglePanel = useWatermarkStore((s) => s.toggleControlPanel)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY.current
      if (Math.abs(dy) > 50) {
        setExpanded(dy < 0)
      }
    },
    []
  )

  useEffect(() => {
    if (isOpen) setExpanded(true)
  }, [isOpen])

  return (
    <>
      {!expanded && (
        <button
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-primary p-3 text-primary-foreground shadow-lg"
          onClick={() => {
            setExpanded(true)
            togglePanel()
          }}
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
      )}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
          expanded ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="mx-auto h-1.5 w-10 cursor-grab rounded-full bg-muted-foreground/30"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            setExpanded(false)
            togglePanel()
          }}
        />
        <div className="max-h-[50vh] overflow-y-auto rounded-t-xl border bg-background shadow-xl safe-bottom">
          <ControlPanel />
        </div>
      </div>
    </>
  )
}

function DesktopSidebar() {
  const isOpen = useWatermarkStore((s) => s.isControlPanelOpen)
  const togglePanel = useWatermarkStore((s) => s.toggleControlPanel)

  return (
    <>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanel}
          className="absolute right-2 top-16 z-10 h-8 w-8"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      <div
        className={`border-l bg-background transition-all duration-300 ${
          isOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Controls</span>
            <Button variant="ghost" size="icon" onClick={togglePanel} className="h-7 w-7">
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ControlPanel />
          </div>
        </div>
      </div>
    </>
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
      <div className="relative flex flex-1 overflow-hidden">
        <main className="flex-1 p-3">
          <WatermarkCanvas />
        </main>
        {isMobile ? <MobileBottomSheet /> : <DesktopSidebar />}
      </div>
    </div>
  )
}
