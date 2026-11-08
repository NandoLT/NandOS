import { deletePaintBlob, readPngSize, savePaintBlob } from '../../applications/infrastructure/paint-storage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { findNearestDesktopGridPosition } from '../domain/desktop-grid'
import { fitHelpWindowBounds } from '../domain/help-window-bounds'
import { taskbarHeight } from '../../../shared/lib/input-preferences'
import { ABOUT_ME_ICON } from '../../../shared/lib/app-icons'
import { createExplorerTree, DESKTOP_DIRECTORY, DOCUMENTS_DIRECTORY, excludeSubtrees, MAX_MARKDOWN_LENGTH, virtualName } from '../../applications/domain/explorer'
import type { PaintImage, VirtualNode, WriterDocument } from '../../applications/domain/explorer'
import { fileImportName, prepareFileImport } from '../../applications/domain/file-backup'
import type { FileBackup } from '../../applications/domain/file-backup'
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
  fileNodes: VirtualNode[]
  importFileBackup: (backup: FileBackup) => Promise<string>
  createVirtualFolder: (parentId: string, name: string) => string
  savePaintImage: (image: Pick<PaintImage, 'name' | 'parentId' | 'width' | 'height'> & { png: Blob }, id?: string) => Promise<PaintImage>
  saveWriterDocument: (document: Omit<WriterDocument, 'id' | 'kind'>, id?: string) => WriterDocument
  openWindow: (id: WindowId) => void
  closeWindow: (id: WindowId) => void
  focusWindow: (id: WindowId) => void
  minimizeWindow: (id: WindowId) => void
  restoreWindow: (id: WindowId) => void
  toggleMaximize: (id: WindowId, maximizedBounds: WindowBounds) => void
  moveWindow: (id: WindowId, x: number, y: number) => void
  resizeWindow: (id: WindowId, width: number, height: number) => void
  setHelpReading: (reading: boolean, viewport: WindowBounds) => void
  moveDesktopItem: (id: DesktopSystemItemId, position: DesktopPosition) => void
  moveUserDesktopItem: (id: string, position: DesktopPosition) => void
  createDesktopFolder: (position: DesktopPosition) => void
  renameUserDesktopItem: (id: string, name: string) => string | null
  moveUserItemToRecycleBin: (id: string) => void
  restoreUserItemFromRecycleBin: (id: string) => void
  permanentlyDeleteUserItem: (id: string) => void
  emptyRecycleBin: () => void
  setStartMenuOpen: (isOpen: boolean) => void
  endGuestSession: () => void
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
  projects: { x: 122, y: 108 },
  contact: { x: 122, y: 192 },
}

function deleteRemovedPaintBlobs(previous: VirtualNode[], remaining: VirtualNode[]) {
  const kept = new Set(remaining)
  for (const node of previous) {
    if (node.kind === 'image' && !kept.has(node)) void deletePaintBlob(node.blobId).catch(() => undefined)
  }
}

const windowMetadata: Record<WindowId, { title: string; icon: string }> = {
  about: { title: 'About Fernando.exe', icon: ABOUT_ME_ICON },
  'file-explorer': { title: 'Explorador de archivos', icon: '📁' },
  'recycle-bin': { title: 'Papelera de reciclaje', icon: '🗑️' },
  settings: { title: 'Configuración', icon: '⚙️' },
  experience: { title: 'Experiencia', icon: '🧰' },
  projects: { title: 'Proyectos', icon: '🗂️' },
  skills: { title: 'Habilidades', icon: '🧠' },
  contact: { title: 'Contacto', icon: '✉️' },
  help: { title: 'Ayuda de NandOS', icon: '📖' },
  writer: { title: 'Writer', icon: '📝' },
  paint: { title: 'Paint', icon: '🎨' },
  terminal: { title: 'Terminal', icon: '⌨️' },
  'task-manager': { title: 'Administrador de tareas', icon: '📊' },
}

function createWindow(id: WindowId, zIndex: number): WindowState {
  const isExplorer = id === 'file-explorer' || id === 'terminal'
  const isRecycleBin = id === 'recycle-bin'
  const isSettings = id === 'settings'
  const isHelp = id === 'help'
  const isPortfolioSection = id === 'experience' || id === 'projects' || id === 'skills' || id === 'contact'
  const bounds = id === 'paint'
    ? { ...defaultBounds, width: 740, height: 540 }
    : id === 'writer'
    ? { ...defaultBounds, width: 740, height: 510 }
    : isExplorer
    ? { ...defaultBounds, width: 680, height: 440 }
    : isRecycleBin
      ? { ...defaultBounds, width: 620, height: 400 }
      : isSettings
        ? { ...defaultBounds, width: 700, height: 480 }
        : isHelp
          ? fitHelpWindowBounds({ ...defaultBounds, width: 760 }, {
            x: 0, y: 0, width: window.innerWidth, height: window.innerHeight - taskbarHeight(),
          }, false)
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
      fileNodes: [],

      importFileBackup: async (backup) => {
        if (!backup.entries.length) throw new Error('La copia está vacía.')
        const { root, nodes, images } = prepareFileImport(backup)
        const stored: string[] = []
        try {
          for (const image of images) {
            const bytes = Uint8Array.from(atob(image.png), (character) => character.charCodeAt(0))
            const png = new Blob([bytes], { type: 'image/png' })
            const dimensions = await readPngSize(png)
            if (dimensions.width !== image.width || dimensions.height !== image.height) throw new Error('La copia contiene un PNG inválido.')
            const bitmap = await createImageBitmap(png)
            bitmap.close()
            await savePaintBlob(image.id, png)
            stored.push(image.id)
          }
          const { userDesktopItems, fileNodes } = get()
          const destination = createExplorerTree(userDesktopItems, fileNodes).contentsOf(DOCUMENTS_DIRECTORY)
          const name = fileImportName(destination.map((item) => item.name))
          try {
            set({ fileNodes: [...fileNodes, { ...root, name }, ...nodes.slice(1)] })
          } catch {
            try { set({ fileNodes }) } catch { /* In-memory state is already restored. */ }
            throw new Error('No se pudo guardar la copia en este navegador. Comprueba el espacio disponible.')
          }
          return name
        } catch (error) {
          await Promise.allSettled(stored.map(deletePaintBlob))
          throw error
        }
      },

      createVirtualFolder: (parentId, value) => {
        const state = get()
        const tree = createExplorerTree(state.userDesktopItems, state.fileNodes)
        const name = virtualName(value)
        if (!tree.writable(parentId)) throw new Error('No se puede escribir en esta ubicación.')
        if (tree.contentsOf(parentId).some((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          throw new Error('Ya existe un elemento con ese nombre.')
        }
        const id = `user-folder-${crypto.randomUUID()}`
        if (parentId === DESKTOP_DIRECTORY) {
          const position = findNearestDesktopGridPosition({ x: 18, y: 24 },
            { width: window.innerWidth, height: window.innerHeight, taskbarHeight: taskbarHeight() },
            [...Object.values(state.desktopPositions), ...state.userDesktopItems])
          set({ userDesktopItems: [...state.userDesktopItems, { ...position, id, name, kind: 'folder', icon: '📁', origin: 'user' }] })
        } else {
          set({ fileNodes: [...state.fileNodes, { id, parentId, name, kind: 'folder' }] })
        }
        return id
      },

      savePaintImage: async ({ name: value, parentId, width, height, png }, id) => {
        const name = virtualName(value.trim().replace(/\.png$/iu, '') + '.png')
        const dimensions = await readPngSize(png)
        if (dimensions.width !== width || dimensions.height !== height) throw new Error('Las dimensiones del PNG no coinciden.')
        const findTarget = () => {
          const { userDesktopItems, fileNodes } = get()
          const tree = createExplorerTree(userDesktopItems, fileNodes)
          if (!tree.writable(parentId)) throw new Error('No se puede escribir en esta ubicación.')
          const previous = id ? tree.getImage(id) : undefined
          if (id && !previous) throw new Error('El dibujo ya no está disponible. Usa Guardar como para crear una copia.')
          if (tree.contentsOf(parentId).some((item) =>
            !(item.kind === 'image' && item.imageId === id) && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            throw new Error('Ya existe un elemento con ese nombre.')
          }
          return { previous, fileNodes }
        }
        const { previous } = findTarget()
        const blobId = crypto.randomUUID()
        const saved: PaintImage = { id: id ?? crypto.randomUUID(), kind: 'image', name, parentId, width, height, blobId }
        await savePaintBlob(blobId, png)
        try {
          const target = findTarget()
          if (target.previous?.blobId !== previous?.blobId) throw new Error('El dibujo cambió mientras se guardaba.')
          try {
            set({ fileNodes: id ? target.fileNodes.map((node) => node.id === id ? saved : node) : [...target.fileNodes, saved] })
          } catch {
            try { set({ fileNodes: target.fileNodes }) } catch { /* In-memory state is already restored. */ }
            throw new Error('No queda espacio para guardar el dibujo en el navegador.')
          }
        } catch (error) {
          void deletePaintBlob(blobId).catch(() => undefined)
          throw error
        }
        if (previous) void deletePaintBlob(previous.blobId).catch(() => undefined)
        return saved
      },

      saveWriterDocument: ({ name: value, parentId, markdown }, id) => {
        const state = get()
        const tree = createExplorerTree(state.userDesktopItems, state.fileNodes)
        const original = id ? tree.getDocument(id) : undefined
        if (id && !original) throw new Error('El documento ya no está disponible. Usa Guardar como para crear una copia.')
        if (!tree.writable(parentId)) throw new Error('No se puede escribir en esta ubicación.')
        const base = virtualName(value.trim().replace(/\.doc$/iu, ''))
        const name = virtualName(`${base}.doc`)
        if (tree.contentsOf(parentId).some((entry) =>
          !(entry.kind === 'document' && entry.documentId === id) && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          throw new Error('Ya existe un elemento con ese nombre.')
        }
        if (markdown.length > MAX_MARKDOWN_LENGTH) throw new Error('El documento supera el tamaño permitido.')
        const saved: WriterDocument = { id: id ?? `writer-${crypto.randomUUID()}`, kind: 'document', parentId, name, markdown }
        const fileNodes = id ? state.fileNodes.map((node) => node.id === id ? saved : node) : [...state.fileNodes, saved]
        try {
          set({ fileNodes })
        } catch {
          try { set({ fileNodes: state.fileNodes }) } catch { /* In-memory state is already restored. */ }
          throw new Error('No queda espacio para guardar este documento en el navegador.')
        }
        return saved
      },

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

      setHelpReading: (reading, viewport) => set((state) => {
        const current = state.windows.find((window) => window.id === 'help')
        if (!current) return state
        const previousBounds = fitHelpWindowBounds(current.isMaximized ? current.previousBounds : current.bounds, viewport, reading)
        const bounds = current.isMaximized
          ? { x: 4, y: 4, width: viewport.width - 8, height: viewport.height - 8 }
          : previousBounds
        const unchanged = (['x', 'y', 'width', 'height'] as const).every((key) =>
          current.bounds[key] === bounds[key] && current.previousBounds[key] === previousBounds[key])
        if (unchanged) return state
        return { windows: state.windows.map((window) => window.id === 'help' ? { ...window, bounds, previousBounds } : window) }
      }),

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

      renameUserDesktopItem: (id, value) => {
        const items = get().userDesktopItems
        if (!items.some((item) => item.id === id && item.origin === 'user')) {
          return 'Solo se pueden renombrar carpetas creadas por el usuario.'
        }
        const name = value.trim()
        if (!name || name === '.' || name === '..') return 'Escribe un nombre para la carpeta.'
        if (name.length > 80) return 'El nombre no puede superar los 80 caracteres.'
        if (/[<>:"/\\|?*]/u.test(name) || [...name].some((character) => character.charCodeAt(0) < 32)) {
          return 'El nombre contiene caracteres no permitidos.'
        }
        if (items.some((item) => item.id !== id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          return 'Ya existe una carpeta con ese nombre.'
        }
        set({ userDesktopItems: items.map((item) => item.id === id ? { ...item, name } : item) })
        return null
      },

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

      permanentlyDeleteUserItem: (id) => {
        const { recycleBinItems, fileNodes } = get()
        if (!recycleBinItems.some((item) => item.id === id)) return
        const remaining = excludeSubtrees(fileNodes, [id])
        set({ recycleBinItems: recycleBinItems.filter((item) => item.id !== id), fileNodes: remaining })
        deleteRemovedPaintBlobs(fileNodes, remaining)
      },

      emptyRecycleBin: () => {
        const { recycleBinItems, fileNodes } = get()
        const remaining = excludeSubtrees(fileNodes, recycleBinItems.map(({ id }) => id))
        set({ recycleBinItems: [], fileNodes: remaining })
        deleteRemovedPaintBlobs(fileNodes, remaining)
      },

      setStartMenuOpen: (isOpen) => set({ isStartMenuOpen: isOpen }),
      endGuestSession: () => set({
        windows: [], activeWindowId: null, nextZIndex: 10, isStartMenuOpen: false,
      }),
    }),
    {
      name: 'nandoos:shell-session',
      version: 5,
      migrate: (persistedState, _version) => {
        const persisted = persistedState as Partial<ShellState>
        const desktopPositions = { ...defaultDesktopPositions, ...persisted.desktopPositions }
        const occupied = [
          ...Object.entries(desktopPositions)
            .filter(([id]) => (id !== 'projects' && id !== 'contact') || persisted.desktopPositions?.[id])
            .map(([, position]) => position),
          ...(persisted.userDesktopItems ?? []),
        ]
        for (const id of ['projects', 'contact'] as const) {
          if (persisted.desktopPositions?.[id]) continue
          const position = findNearestDesktopGridPosition(defaultDesktopPositions[id], {
            width: window.innerWidth, height: window.innerHeight, taskbarHeight: taskbarHeight(),
          }, occupied)
          desktopPositions[id] = position
          occupied.push(position)
        }
        return {
          desktopPositions,
          userDesktopItems: persisted.userDesktopItems ?? [],
          recycleBinItems: persisted.recycleBinItems ?? [],
          fileNodes: persisted.fileNodes ?? [],
        }
      },
      // Whitelist durable desktop data even if an old/current-version payload
      // still contains windows. A page reload never restores a guest session.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ShellState> | undefined
        return {
          ...currentState,
          desktopPositions: { ...currentState.desktopPositions, ...persisted?.desktopPositions },
          userDesktopItems: persisted?.userDesktopItems ?? currentState.userDesktopItems,
          recycleBinItems: persisted?.recycleBinItems ?? currentState.recycleBinItems,
          fileNodes: persisted?.fileNodes ?? currentState.fileNodes,
        }
      },
      partialize: (state) => ({
        desktopPositions: state.desktopPositions,
        userDesktopItems: state.userDesktopItems,
        recycleBinItems: state.recycleBinItems,
        fileNodes: state.fileNodes,
      }),
    }
  )
)
