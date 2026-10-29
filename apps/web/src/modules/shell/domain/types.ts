export type WindowId = 'about' | 'file-explorer' | 'recycle-bin' | 'settings' | 'experience' | 'projects' | 'skills' | 'contact'

export type DesktopSystemItemId = 'about' | 'file-explorer' | 'recycle-bin' | 'cv' | 'projects' | 'contact'

export type DesktopPosition = {
  x: number
  y: number
}

export type UserDesktopItem = DesktopPosition & {
  id: string
  name: string
  kind: 'folder'
  icon: string
  origin: 'user'
}

export type RecycleBinItem = UserDesktopItem & {
  deletedAt: string
}

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type WindowState = {
  id: WindowId
  title: string
  icon: string
  bounds: WindowBounds
  previousBounds: WindowBounds
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
}
