import { beforeEach, describe, expect, it } from 'vitest'
import { useShellStore } from './shell.store'

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
      },
      userDesktopItems: [],
      recycleBinItems: [],
    })
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
})
