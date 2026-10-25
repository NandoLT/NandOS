import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DesktopPosition,
  DesktopSystemItemId,
  RecycleBinItem,
  UserDesktopItem,
  WindowBounds,
  WindowId,
  WindowState,
} from '../domain/types'

type ShellState = {
  windows: WindowState[]
  activeWindowId: WindowId | null
  nextZIndex: number
  isStartMenuOpen: boolean
  desktopPositions: Record<DesktopSystemItemId, DesktopPosition>
  userDesktopItems: UserDesktopItem[]
  recycleBinItems: RecycleBinItem[]
  openWindow: (id: WindowId) => void
  closeWindow: (id: WindowId) => void
  focusWindow: (id: WindowId) => void
  minimizeWindow: (id: WindowId) => void
  restoreWindow: (id: WindowId) => void
  toggleMaximize: (id: WindowId, maximizedBounds: WindowBounds) => void
  moveWindow: (id: WindowId, x: number, y: number) => void
  resizeWindow: (id: WindowId, width: number, height: number) => void
  moveDesktopItem: (id: DesktopSystemItemId, position: DesktopPosition) => void
  moveUserDesktopItem: (id: string, position: DesktopPosition) => void
  createDesktopFolder: (position: DesktopPosition) => void
  moveUserItemToRecycleBin: (id: string) => void
  restoreUserItemFromRecycleBin: (id: string) => void
  permanentlyDeleteUserItem: (id: string) => void
  emptyRecycleBin: () => void
  setStartMenuOpen: (isOpen: boolean) => void
}

const defaultBounds: WindowBounds = {
  x: 160,
  y: 92,
  width: 520,
  height: 360,
}

const defaultDesktopPositions: Record<DesktopSystemItemId, DesktopPosition> = {
  about: { x: 18, y: 24 },
  cv: { x: 116, y: 24 },
  'file-explorer': { x: 18, y: 108 },
  'recycle-bin': { x: 18, y: 192 },
}

const windowMetadata: Record<WindowId, { title: string; icon: string }> = {
  about: { title: 'About Fernando.exe', icon: '👤' },
  'file-explorer': { title: 'Explorador de archivos', icon: '📁' },
  'recycle-bin': { title: 'Papelera de reciclaje', icon: '🗑️' },
  settings: { title: 'Configuración', icon: '⚙️' },
  experience: { title: 'Experiencia', icon: '🧰' },
  projects: { title: 'Proyectos', icon: '🗂️' },
  skills: { title: 'Habilidades', icon: '🧠' },
  contact: { title: 'Contacto', icon: '✉️' },
}

function createWindow(id: WindowId, zIndex: number): WindowState {
  const isExplorer = id === 'file-explorer'
  const isRecycleBin = id === 'recycle-bin'
  const isSettings = id === 'settings'
  const isPortfolioSection = id === 'experience' || id === 'projects' || id === 'skills' || id === 'contact'
  const bounds = isExplorer
    ? { ...defaultBounds, width: 680, height: 440 }
    : isRecycleBin
      ? { ...defaultBounds, width: 620, height: 400 }
      : isSettings
        ? { ...defaultBounds, width: 700, height: 480 }
        : isPortfolioSection
          ? { ...defaultBounds, width: 720, height: 500 }
          : defaultBounds

  return {
    id,
    ...windowMetadata[id],
    bounds,
    previousBounds: bounds,
    isMinimized: false,
    isMaximized: false,
    zIndex,
  }
}

export const useShellStore = create<ShellState>()(
  persist(
    (set, get) => ({
      windows: [],
      activeWindowId: null,
      nextZIndex: 10,
      isStartMenuOpen: false,
      desktopPositions: defaultDesktopPositions,
      userDesktopItems: [],
      recycleBinItems: [],

      openWindow: (id) => {
        const current = get().windows.find((window) => window.id === id)
        if (current) {
          get().restoreWindow(id)
          return
        }

        const zIndex = get().nextZIndex + 1
        const newWindow = createWindow(id, zIndex)

        set((state) => ({
          windows: [...state.windows, newWindow],
          activeWindowId: id,
          nextZIndex: zIndex,
          isStartMenuOpen: false,
        }))
      },

      closeWindow: (id) =>
        set((state) => ({
          windows: state.windows.filter((window) => window.id !== id),
          activeWindowId:
            state.activeWindowId === id ? null : state.activeWindowId,
        })),

      focusWindow: (id) => {
        const zIndex = get().nextZIndex + 1
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id
              ? { ...window, isMinimized: false, zIndex }
              : window
          ),
          activeWindowId: id,
          nextZIndex: zIndex,
        }))
      },

      minimizeWindow: (id) =>
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id ? { ...window, isMinimized: true } : window
          ),
          activeWindowId:
            state.activeWindowId === id ? null : state.activeWindowId,
        })),

      restoreWindow: (id) => {
        const zIndex = get().nextZIndex + 1
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id
              ? { ...window, isMinimized: false, zIndex }
              : window
          ),
          activeWindowId: id,
          nextZIndex: zIndex,
        }))
      },

      toggleMaximize: (id, maximizedBounds) =>
        set((state) => ({
          windows: state.windows.map((window) => {
            if (window.id !== id) return window
            if (window.isMaximized) {
              return {
                ...window,
                bounds: window.previousBounds,
                isMaximized: false,
              }
            }
            return {
              ...window,
              bounds: maximizedBounds,
              previousBounds: window.bounds,
              isMaximized: true,
            }
          }),
        })),

      moveWindow: (id, x, y) =>
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id && !window.isMaximized
              ? { ...window, bounds: { ...window.bounds, x, y } }
              : window
          ),
        })),

      resizeWindow: (id, width, height) =>
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id && !window.isMaximized
              ? { ...window, bounds: { ...window.bounds, width, height } }
              : window
          ),
        })),

      moveDesktopItem: (id, position) =>
        set((state) => ({
          desktopPositions: { ...state.desktopPositions, [id]: position },
        })),

      moveUserDesktopItem: (id, position) =>
        set((state) => ({
          userDesktopItems: state.userDesktopItems.map((item) =>
            item.id === id ? { ...item, ...position } : item
          ),
        })),

      createDesktopFolder: (position) =>
        set((state) => {
          const existingNames = new Set(state.userDesktopItems.map((item) => item.name))
          let suffix = 1
          let name = 'Nueva carpeta'
          while (existingNames.has(name)) {
            suffix += 1
            name = `Nueva carpeta (${suffix})`
          }

          const id = `user-folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
          const folder: UserDesktopItem = {
            ...position,
            id,
            name,
            kind: 'folder',
            icon: '📁',
            origin: 'user',
          }

          return { userDesktopItems: [...state.userDesktopItems, folder] }
        }),

      moveUserItemToRecycleBin: (id) =>
        set((state) => {
          const item = state.userDesktopItems.find((candidate) => candidate.id === id)
          if (!item) return state

          return {
            userDesktopItems: state.userDesktopItems.filter((candidate) => candidate.id !== id),
            recycleBinItems: [...state.recycleBinItems, { ...item, deletedAt: new Date().toISOString() }],
          }
        }),

      restoreUserItemFromRecycleBin: (id) =>
        set((state) => {
          const item = state.recycleBinItems.find((candidate) => candidate.id === id)
          if (!item) return state

          const { deletedAt: _deletedAt, ...restoredItem } = item
          return {
            recycleBinItems: state.recycleBinItems.filter((candidate) => candidate.id !== id),
            userDesktopItems: [...state.userDesktopItems, restoredItem],
          }
        }),

      permanentlyDeleteUserItem: (id) =>
        set((state) => ({
          recycleBinItems: state.recycleBinItems.filter((item) => item.id !== id),
        })),

      emptyRecycleBin: () => set({ recycleBinItems: [] }),

      setStartMenuOpen: (isOpen) => set({ isStartMenuOpen: isOpen }),
    }),
    {
      name: 'nandoos:shell-session',
      version: 3,
      migrate: (persistedState, _version) => {
        const persisted = persistedState as Partial<ShellState>
        return {
          ...persisted,
          desktopPositions: { ...defaultDesktopPositions, ...persisted.desktopPositions },
          userDesktopItems: persisted.userDesktopItems ?? [],
          recycleBinItems: persisted.recycleBinItems ?? [],
        } as ShellState
      },
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        nextZIndex: state.nextZIndex,
        desktopPositions: state.desktopPositions,
        userDesktopItems: state.userDesktopItems,
        recycleBinItems: state.recycleBinItems,
      }),
    }
  )
)
