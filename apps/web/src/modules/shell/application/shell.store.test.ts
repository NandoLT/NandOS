import { beforeEach, describe, expect, it } from 'vitest'
import { useShellStore } from './shell.store'
import { createExplorerTree } from '../../applications/domain/explorer'

describe('shell store', () => {
  beforeEach(() => {
    useShellStore.setState({
      windows: [],
      activeWindowId: null,
      nextZIndex: 10,
      isStartMenuOpen: false,
      desktopPositions: {
        about: { x: 18, y: 24 },
        cv: { x: 116, y: 24 },
        'file-explorer': { x: 18, y: 108 },
        'recycle-bin': { x: 18, y: 192 },
        projects: { x: 122, y: 108 },
        contact: { x: 122, y: 192 },
      },
      userDesktopItems: [],
      recycleBinItems: [],
      fileNodes: [],
    })
  })

  it('persists nested folders and document contents and updates a document by its stable ID', async () => {
    const store = useShellStore.getState()
    const folder = store.createVirtualFolder('documents', 'Trabajo')
    const child = store.createVirtualFolder(folder, 'Borradores')
    const saved = store.saveWriterDocument({ parentId: child, name: 'Proyecto.DOC ', markdown: '# Primera versión' })
    const updated = store.saveWriterDocument({ parentId: child, name: saved.name, markdown: '# Segunda versión' }, saved.id)
    expect(updated).toMatchObject({ id: saved.id, name: 'Proyecto.doc', parentId: child })
    expect(() => store.saveWriterDocument({ parentId: child, name: 'proyecto.doc', markdown: '' })).toThrow('Ya existe')
    expect(() => store.createVirtualFolder('computer', 'No permitido')).toThrow('No se puede escribir')
    const snapshot = localStorage.getItem('nandoos:shell-session')!
    useShellStore.setState({ fileNodes: [] })
    localStorage.setItem('nandoos:shell-session', snapshot)
    await useShellStore.persist.rehydrate()
    const state = useShellStore.getState()
    const tree = createExplorerTree(state.userDesktopItems, state.fileNodes)
    expect(tree.pathTo(child).map(({ name }) => name)).toEqual(['Este equipo', 'Mis documentos', 'Trabajo', 'Borradores'])
    expect(tree.getDocument(saved.id)?.markdown).toBe('# Segunda versión')
  })

  it('hides the contents of a recycled desktop folder, restores them, and removes them on permanent deletion', () => {
    const store = useShellStore.getState()
    const root = store.createVirtualFolder('desktop', 'Personal')
    const child = store.createVirtualFolder(root, 'Notas')
    const saved = store.saveWriterDocument({ parentId: child, name: 'Idea', markdown: 'Texto' })
    const currentTree = () => {
      const state = useShellStore.getState()
      return createExplorerTree(state.userDesktopItems, state.fileNodes)
    }
    store.moveUserItemToRecycleBin(root)
    expect(currentTree().getDocument(saved.id)).toBeUndefined()
    store.restoreUserItemFromRecycleBin(root)
    expect(currentTree().getDocument(saved.id)).toEqual(saved)
    store.moveUserItemToRecycleBin(root)
    store.permanentlyDeleteUserItem(root)
    expect(useShellStore.getState().fileNodes).toEqual([])
  })

  it('opens, minimizes and restores a window', () => {
    useShellStore.getState().openWindow('about')
    expect(useShellStore.getState().windows).toHaveLength(1)

    useShellStore.getState().minimizeWindow('about')
    expect(useShellStore.getState().windows[0].isMinimized).toBe(true)

    useShellStore.getState().restoreWindow('about')
    expect(useShellStore.getState().windows[0].isMinimized).toBe(false)
    expect(useShellStore.getState().activeWindowId).toBe('about')
  })

  it('opens File Explorer as its own application window', () => {
    useShellStore.getState().openWindow('file-explorer')

    const [explorer] = useShellStore.getState().windows
    expect(explorer.id).toBe('file-explorer')
    expect(explorer.title).toBe('Explorador de archivos')
    expect(explorer.icon).toBe('📁')
  })

  it('opens the professional portfolio sections in reusable windows', () => {
    useShellStore.getState().openWindow('projects')
    useShellStore.getState().openWindow('contact')

    expect(useShellStore.getState().windows).toMatchObject([
      { id: 'projects', title: 'Proyectos', icon: '🗂️' },
      { id: 'contact', title: 'Contacto', icon: '✉️' },
    ])
  })

  it('opens one reusable help window with room for the public wiki', () => {
    const store = useShellStore.getState()
    store.openWindow('help')
    store.minimizeWindow('help')
    store.openWindow('help')
    expect(useShellStore.getState().windows).toMatchObject([
      { id: 'help', title: 'Ayuda de NandOS', icon: '📖', isMinimized: false, bounds: { width: 760, height: 420 } },
    ])
    expect(useShellStore.getState().activeWindowId).toBe('help')
  })

  it('grows help for reading without extending below the desktop, then shrinks for home', () => {
    const store = useShellStore.getState()
    const viewport = { x: 0, y: 0, width: 1280, height: 678 }
    store.openWindow('help')
    store.setHelpReading(true, viewport)
    const [reading] = useShellStore.getState().windows
    expect(reading.bounds.height).toBe(600)
    expect(reading.bounds.y + reading.bounds.height).toBeLessThanOrEqual(670)
    store.setHelpReading(false, viewport)
    expect(useShellStore.getState().windows[0].bounds.height).toBe(420)
  })

  it('does not unmaximize help when the selected article changes', () => {
    const store = useShellStore.getState()
    const viewport = { x: 0, y: 0, width: 1280, height: 678 }
    store.openWindow('help')
    const maximized = { x: 4, y: 4, width: 1272, height: 670 }
    store.toggleMaximize('help', maximized)
    store.setHelpReading(true, viewport)
    expect(useShellStore.getState().windows[0]).toMatchObject({ isMaximized: true, bounds: maximized })
    store.toggleMaximize('help', maximized)
    expect(useShellStore.getState().windows[0]).toMatchObject({ isMaximized: false, bounds: { height: 600 } })
  })

  it('adds the CV shortcut position when migrating a previous desktop session', async () => {
    localStorage.setItem('nandoos:shell-session', JSON.stringify({
      state: {
        desktopPositions: {
          about: { x: 18, y: 24 },
          'file-explorer': { x: 18, y: 108 },
          'recycle-bin': { x: 18, y: 192 },
        },
      },
      version: 2,
    }))

    await useShellStore.persist.rehydrate()

    expect(useShellStore.getState().desktopPositions.cv).toEqual({ x: 116, y: 24 })
  })

  it('resizes an open window without changing its position', () => {
    useShellStore.getState().openWindow('about')
    const originalPosition = useShellStore.getState().windows[0].bounds

    useShellStore.getState().resizeWindow('about', 640, 420)

    expect(useShellStore.getState().windows[0].bounds).toEqual({
      ...originalPosition,
      width: 640,
      height: 420,
    })
  })

  it('moves a user-created folder to the recycle bin and restores it', () => {
    useShellStore.getState().createDesktopFolder({ x: 120, y: 160 })
    const [folder] = useShellStore.getState().userDesktopItems

    expect(folder.name).toBe('Nueva carpeta')
    useShellStore.getState().moveUserItemToRecycleBin(folder.id)
    expect(useShellStore.getState().userDesktopItems).toHaveLength(0)
    expect(useShellStore.getState().recycleBinItems[0].id).toBe(folder.id)

    useShellStore.getState().restoreUserItemFromRecycleBin(folder.id)
    expect(useShellStore.getState().recycleBinItems).toHaveLength(0)
    expect(useShellStore.getState().userDesktopItems[0]).toMatchObject({
      id: folder.id,
      name: 'Nueva carpeta',
      origin: 'user',
    })
  })

  it('never moves a system shortcut into the recycle bin', () => {
    useShellStore.getState().moveUserItemToRecycleBin('about')

    expect(useShellStore.getState().userDesktopItems).toHaveLength(0)
    expect(useShellStore.getState().recycleBinItems).toHaveLength(0)
  })

  it('renames only a visitor folder and persists the trimmed name across reloads', async () => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 330, y: 200 })
    const [folder] = useShellStore.getState().userDesktopItems
    expect(store.renameUserDesktopItem(folder.id, '  Mis apuntes  ')).toBeNull()
    expect(useShellStore.getState().userDesktopItems[0]).toEqual({ ...folder, name: 'Mis apuntes' })
    await useShellStore.persist.rehydrate()
    expect(useShellStore.getState().userDesktopItems[0].name).toBe('Mis apuntes')
    expect(store.renameUserDesktopItem('about', 'Otro nombre')).toBeTruthy()
    expect(useShellStore.getState().userDesktopItems).toHaveLength(1)
  })

  it('rejects empty, invalid and duplicate folder names without changing the desktop', () => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 330, y: 200 })
    store.createDesktopFolder({ x: 430, y: 200 })
    const before = useShellStore.getState().userDesktopItems
    for (const name of ['  ', '.', '..', 'carpeta/otra', 'carpeta\\otra', 'x'.repeat(81), 'nueva CARPETA (2)']) {
      expect(store.renameUserDesktopItem(before[0].id, name)).toBeTruthy()
      expect(useShellStore.getState().userDesktopItems).toEqual(before)
    }
    expect(store.renameUserDesktopItem(before[0].id, before[0].name)).toBeNull()
  })

  it('logs off without deleting the visitor folders, trash or icon positions', () => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 240, y: 100 })
    store.createDesktopFolder({ x: 240, y: 200 })
    store.moveUserItemToRecycleBin(useShellStore.getState().userDesktopItems[0].id)
    store.moveDesktopItem('cv', { x: 330, y: 24 })
    store.openWindow('projects')
    store.setStartMenuOpen(true)
    const before = useShellStore.getState()

    store.endGuestSession()

    const after = useShellStore.getState()
    expect(after.windows).toEqual([])
    expect(after.activeWindowId).toBeNull()
    expect(after.isStartMenuOpen).toBe(false)
    expect(after.userDesktopItems).toEqual(before.userDesktopItems)
    expect(after.recycleBinItems).toEqual(before.recycleBinItems)
    expect(after.desktopPositions).toEqual(before.desktopPositions)
  })

  it('persists desktop preferences but never open or minimized windows', () => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 240, y: 100 })
    store.moveDesktopItem('cv', { x: 330, y: 24 })
    store.openWindow('projects')
    store.openWindow('help')
    store.minimizeWindow('projects')
    store.setStartMenuOpen(true)
    const saved = JSON.parse(localStorage.getItem('nandoos:shell-session')!).state
    expect(saved).not.toHaveProperty('windows')
    expect(saved).not.toHaveProperty('activeWindowId')
    expect(saved).not.toHaveProperty('nextZIndex')
    expect(saved).not.toHaveProperty('isStartMenuOpen')
    expect(saved.userDesktopItems).toHaveLength(1)
    expect(saved.desktopPositions.cv).toEqual({ x: 330, y: 24 })
  })

  it.each([4, 5])('ignores old session windows in stored version %i while preserving desktop data', async (version) => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 240, y: 100 })
    store.createDesktopFolder({ x: 240, y: 200 })
    store.moveUserItemToRecycleBin(useShellStore.getState().userDesktopItems[0].id)
    store.moveDesktopItem('cv', { x: 330, y: 24 })
    store.openWindow('projects')
    store.openWindow('help')
    store.minimizeWindow('help')
    const previous = useShellStore.getState()
    useShellStore.setState({ windows: [], activeWindowId: null, nextZIndex: 10, isStartMenuOpen: false })
    localStorage.setItem('nandoos:shell-session', JSON.stringify({ version, state: {
      windows: previous.windows, activeWindowId: 'projects', nextZIndex: 99, isStartMenuOpen: true,
      desktopPositions: previous.desktopPositions, userDesktopItems: previous.userDesktopItems,
      recycleBinItems: previous.recycleBinItems,
    } }))
    await useShellStore.persist.rehydrate()
    const restored = useShellStore.getState()
    expect(restored.windows).toEqual([])
    expect(restored.activeWindowId).toBeNull()
    expect(restored.nextZIndex).toBe(10)
    expect(restored.isStartMenuOpen).toBe(false)
    expect(restored.desktopPositions).toEqual(previous.desktopPositions)
    expect(restored.userDesktopItems).toEqual(previous.userDesktopItems)
    expect(restored.recycleBinItems).toEqual(previous.recycleBinItems)
  })

  it('places new system shortcuts in free cells when migrating an existing desktop', async () => {
    localStorage.setItem('nandoos:shell-session', JSON.stringify({
      version: 3,
      state: {
        desktopPositions: {
          about: { x: 18, y: 24 }, cv: { x: 116, y: 24 },
          'file-explorer': { x: 18, y: 108 }, 'recycle-bin': { x: 18, y: 192 },
        },
        userDesktopItems: [{ id: 'existing-folder', name: 'Mi carpeta', x: 122, y: 108, kind: 'folder', origin: 'user', icon: '📁' }],
      },
    }))

    await useShellStore.persist.rehydrate()

    const state = useShellStore.getState()
    expect(state.desktopPositions.projects).not.toEqual({ x: 122, y: 108 })
    expect(state.desktopPositions.contact).not.toEqual(state.desktopPositions.projects)
    expect(state.userDesktopItems[0].name).toBe('Mi carpeta')
  })
})
