import { create } from 'zustand'
import { scaleToFit, generateId, getPositionByPreset } from '@/utils/cn'
import type {
  Layer,
  WatermarkImage,
  WatermarkText,
  PositionPreset,
  ExportSettings,
  BatchItem,
  ActiveTab,
  Rect,
} from '@/types'

interface CropState {
  isCropping: boolean
  rect: Rect | null
  originalRect: Rect | null
}

interface AppState {
  // Base image
  baseImage: string | null
  baseImageFile: File | null
  baseImageSize: { width: number; height: number } | null

  // Watermark layers
  layers: Layer[]
  selectedLayerId: string | null

  // Crop state
  crop: CropState

  // UI state
  canvasSize: { width: number; height: number }
  activeTab: ActiveTab
  isControlPanelOpen: boolean
  isMobile: boolean

  // History
  history: Layer[][]
  historyIndex: number

  // Batch
  batchItems: BatchItem[]
  isBatchProcessing: boolean

  // Export
  exportSettings: ExportSettings

  // Actions: Base image
  setBaseImage: (dataUrl: string, file: File) => void
  setBaseImageSize: (size: { width: number; height: number }) => void
  clearBaseImage: () => void

  // Actions: Watermark image
  addImageWatermark: (dataUrl: string, file: File, rectOverride?: Rect) => void
  updateWatermarkPosition: (id: string, x: number, y: number) => void
  updateWatermarkTransform: (id: string, updates: Partial<WatermarkImage>) => void
  removeLayer: (id: string) => void
  selectLayer: (id: string | null) => void

  // Actions: Text watermark
  addTextWatermark: () => void
  updateTextWatermark: (id: string, updates: Partial<WatermarkText>) => void

  // Actions: Crop
  startCrop: () => void
  updateCropRect: (rect: Rect) => void
  applyCrop: () => void
  cancelCrop: () => void

  // Actions: Presets
  applyPositionPreset: (preset: PositionPreset) => void

  // Actions: Export
  setExportSettings: (settings: Partial<ExportSettings>) => void

  // Actions: UI
  setActiveTab: (tab: ActiveTab) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  toggleControlPanel: () => void
  setIsMobile: (isMobile: boolean) => void

  // Actions: History
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Actions: Batch
  addBatchItem: (file: File) => void
  removeBatchItem: (id: string) => void
  clearBatchItems: () => void
  setBatchItemStatus: (id: string, status: BatchItem['status'], resultBlob?: Blob) => void

  // Actions: Reset
  resetAll: () => void
}

const initialExportSettings: ExportSettings = {
  format: 'png',
  quality: 0.92,
  filename: 'watermarked',
}

export const useWatermarkStore = create<AppState>((set, get) => ({
  // Initial state
  baseImage: null,
  baseImageFile: null,
  baseImageSize: null,
  layers: [],
  selectedLayerId: null,
  crop: { isCropping: false, rect: null, originalRect: null },
  activeTab: 'image',
  canvasSize: { width: 800, height: 600 },
  isControlPanelOpen: false,
  isMobile: false,
  history: [],
  historyIndex: -1,
  batchItems: [],
  isBatchProcessing: false,
  exportSettings: initialExportSettings,

  // Base image
  setBaseImage: (dataUrl, file) => set({ baseImage: dataUrl, baseImageFile: file }),
  setBaseImageSize: (size) => set({ baseImageSize: size }),
  clearBaseImage: () => set({ baseImage: null, baseImageFile: null, baseImageSize: null, layers: [], selectedLayerId: null }),

  // Watermark image
  addImageWatermark: (dataUrl, file, rectOverride?: Rect) => {
    const state = get()
    const cw = state.canvasSize.width
    const ch = state.canvasSize.height
    const size = Math.min(300, Math.round(Math.min(cw, ch) * 0.25))
    const rect = rectOverride ?? {
      x: Math.round((cw - size) / 2),
      y: Math.round((ch - size) / 2),
      width: size,
      height: size,
    }
    const newLayer: WatermarkImage = {
      id: generateId(),
      type: 'image',
      dataUrl,
      originalFile: file,
      rect,
      cropRect: null,
      opacity: 0.8,
      scale: 1,
      rotation: 0,
      visible: true,
    }
    set((state) => ({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    }))
    get().pushHistory()
  },

  updateWatermarkPosition: (id, x, y) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id && l.type === 'image'
          ? { ...l, rect: { ...l.rect, x, y } }
          : l.id === id && l.type === 'text'
          ? { ...l, position: { ...l.position, x, y } }
          : l
      ),
    })),

  updateWatermarkTransform: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id && l.type === 'image'
          ? { ...l, ...updates }
          : l
      ),
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),

  selectLayer: (id) => set({ selectedLayerId: id }),

  // Text watermark
  addTextWatermark: () => {
    const cw = get().canvasSize.width
    const newLayer: WatermarkText = {
      id: generateId(),
      type: 'text',
      text: 'Watermark',
      position: { x: Math.round(cw / 2) - 60, y: 100 },
      fontSize: 32,
      fontFamily: 'Arial',
      color: '#ffffff',
      opacity: 0.6,
      rotation: 0,
      visible: true,
    }
    set((state) => ({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
      activeTab: 'text',
    }))
    get().pushHistory()
  },

  updateTextWatermark: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id && l.type === 'text'
          ? { ...l, ...updates }
          : l
      ),
    })),

  // Crop
  startCrop: () => {
    const state = get()
    const selected = state.layers.find((l) => l.id === state.selectedLayerId)
    if (selected?.type === 'image') {
      set({
        crop: {
          isCropping: true,
          rect: null,
          originalRect: selected.cropRect ?? ('rect' in selected ? selected.rect : null),
        },
      })
    }
  },

  updateCropRect: (rect) =>
    set((state) => ({
      crop: { ...state.crop, rect },
    })),

  applyCrop: () => {
    const state = get()
    const { rect } = state.crop
    if (!rect) return
    const selected = state.layers.find((l) => l.id === state.selectedLayerId)
    if (selected?.type === 'image') {
      get().updateWatermarkTransform(selected.id, {
        cropRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      } as Partial<WatermarkImage>)
    }
    set({ crop: { isCropping: false, rect: null, originalRect: null } })
    get().pushHistory()
  },

  cancelCrop: () =>
    set({ crop: { isCropping: false, rect: null, originalRect: null } }),

  // Presets
  applyPositionPreset: (preset) => {
    const state = get()
    const selected = state.layers.find((l) => l.id === state.selectedLayerId)
    if (!selected) return

    const cw = state.canvasSize.width
    const ch = state.canvasSize.height
    const iw = state.baseImageSize?.width ?? cw
    const ih = state.baseImageSize?.height ?? ch
    const { width: dw, height: dh } = scaleToFit(iw, ih, cw * 0.9, ch * 0.9)
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2

    const wmW = selected.type === 'image' ? selected.rect.width * selected.scale : 200
    const wmH = selected.type === 'image' ? selected.rect.height * selected.scale : 50

    const pos = getPositionByPreset(preset, dw, dh, wmW, wmH, ox, oy)

    if (selected.type === 'image') {
      get().updateWatermarkPosition(selected.id, pos.x, pos.y)
    } else {
      get().updateTextWatermark(selected.id, { position: pos })
    }
    get().pushHistory()
  },

  // Export
  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    })),

  // UI
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCanvasSize: (size) => set({ canvasSize: size }),
  toggleControlPanel: () => set((state) => ({ isControlPanelOpen: !state.isControlPanelOpen })),
  setIsMobile: (isMobile) => set({ isMobile }),

  // History
  pushHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(state.layers)))
      if (newHistory.length > 50) newHistory.shift()
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        layers: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        layers: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      }
    }),

  // Batch
  addBatchItem: (file) => {
    const dataUrl = URL.createObjectURL(file)
    set((state) => ({
      batchItems: [
        ...state.batchItems,
        { id: generateId(), file, dataUrl, status: 'pending' },
      ],
    }))
  },

  removeBatchItem: (id) =>
    set((state) => ({
      batchItems: state.batchItems.filter((i) => i.id !== id),
    })),

  clearBatchItems: () => set({ batchItems: [] }),

  setBatchItemStatus: (id, status, resultBlob) =>
    set((state) => ({
      batchItems: state.batchItems.map((i) =>
        i.id === id ? { ...i, status, resultBlob } : i
      ),
    })),

  // Reset
  resetAll: () =>
    set({
      baseImage: null,
      baseImageFile: null,
      baseImageSize: null,
      layers: [],
      selectedLayerId: null,
      crop: { isCropping: false, rect: null, originalRect: null },
      activeTab: 'image',
      isControlPanelOpen: false,
      history: [],
      historyIndex: -1,
    }),
}))
