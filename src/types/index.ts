export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Position, Size {}

export interface WatermarkImage {
  id: string
  type: 'image'
  dataUrl: string
  originalFile: File
  rect: Rect
  cropRect: Rect | null
  opacity: number
  scale: number
  rotation: number
  visible: boolean
}

export interface WatermarkText {
  id: string
  type: 'text'
  text: string
  position: Position
  fontSize: number
  fontFamily: string
  color: string
  opacity: number
  rotation: number
  visible: boolean
}

export type Layer = WatermarkImage | WatermarkText

export type PositionPreset =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'tile'

export type ExportFormat = 'png' | 'jpeg'

export interface ExportSettings {
  format: ExportFormat
  quality: number
  filename: string
}

export interface BatchItem {
  id: string
  file: File
  dataUrl: string
  status: 'pending' | 'processing' | 'done' | 'error'
  resultBlob?: Blob
}

export type ActiveTab = 'image' | 'text' | 'crop' | 'settings'

export interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  resolvedTheme: 'light' | 'dark'
}