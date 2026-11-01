import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { renderWithProviders as render } from '../../../test/render'
import { touchPointer } from '../../../test/touch'
import { useShellStore } from '../application/shell.store'
import { NandoOsShell } from './NandoOsShell'

beforeEach(() => {
  localStorage.setItem('nandos:boot-completed', '1')
  useShellStore.setState({
    windows: [], activeWindowId: null, isStartMenuOpen: false, nextZIndex: 10,
    desktopPositions: useShellStore.getInitialState().desktopPositions,
    userDesktopItems: [], recycleBinItems: [],
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ content: DEFAULT_PORTFOLIO_CONTENT, authenticated: false }),
  }))
})

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

function enterGuest() {
  render(<NandoOsShell />)
  fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }))
}

describe('desktop interactions', () => {
  it('starts a new guest login with no previous windows while preserving visitor folders and icons', () => {
    const store = useShellStore.getState()
    store.createDesktopFolder({ x: 330, y: 200 })
    store.moveDesktopItem('cv', { x: 330, y: 24 })
    store.openWindow('projects')
    store.openWindow('help')
    store.minimizeWindow('help')
    enterGuest()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Aplicaciones abiertas' })).queryAllByRole('button')).toEqual([])
    expect(useShellStore.getState().windows).toEqual([])
    expect(useShellStore.getState().userDesktopItems).toHaveLength(1)
    expect(useShellStore.getState().desktopPositions.cv).toEqual({ x: 330, y: 24 })
  })

  it('opens Help as a wiki window from Start and restores the same window from the taskbar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => ({
      ok: true, json: async () => url.endsWith('/wiki/articles')
        ? { articles: [] } : { content: DEFAULT_PORTFOLIO_CONTENT, authenticated: false },
    })))
    enterGuest()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
    const help = screen.getByRole('button', { name: 'Ayuda' })
    expect(help).not.toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(help)
    expect(screen.queryByRole('navigation', { name: 'Menú Start' })).not.toBeInTheDocument()
    const frame = screen.getByRole('dialog', { name: 'Ayuda de NandOS' })
    expect(await within(frame).findByRole('heading', { name: 'Wiki de NandOS' })).toBeInTheDocument()
    fireEvent.click(within(frame).getByRole('button', { name: 'Minimizar' }))
    expect(useShellStore.getState().windows.find((window) => window.id === 'help')?.isMinimized).toBe(true)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Aplicaciones abiertas' })).getByRole('button', { name: /Ayuda de NandOS/ }))
    expect(screen.getByRole('dialog', { name: 'Ayuda de NandOS' })).toBeVisible()
    expect(useShellStore.getState().windows.filter((window) => window.id === 'help')).toHaveLength(1)
  })

  it('resets the assistant to the help launcher after logging off and entering again', async () => {
    // Flush the lazy dock's initial mount effect before interacting with it.
    enterGuest()
    await act(async () => {})
    fireEvent.click(await screen.findByRole('button', { name: '¿Tienes dudas? Abrir asistente nandBot' }))
    expect(await screen.findByRole('img', { name: 'Mascota retro de NandOS' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Log off Invitado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }))
    expect(await screen.findByRole('button', { name: '¿Tienes dudas? Abrir asistente nandBot' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Mascota retro de NandOS' })).not.toBeInTheDocument()
  })

  it('opens mobile categories only after activation so hover cannot intercept a tap', () => {
    vi.stubGlobal('innerWidth', 390)
    enterGuest()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
    const programs = screen.getByRole('button', { name: 'Programas' })
    fireEvent.mouseEnter(programs)
    expect(screen.queryByRole('group', { name: 'Programas' })).not.toBeInTheDocument()
    fireEvent.click(programs, { detail: 1 })
    expect(screen.getByRole('group', { name: 'Programas' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Habilidades' })).not.toBeInTheDocument()
  })

  it('logs off Invitado, returns to login and keeps visitor folders', () => {
    useShellStore.getState().createDesktopFolder({ x: 330, y: 200 })
    enterGuest()
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Proyectos. Doble clic para abrir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Log off Invitado' }))

    expect(screen.getByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
    expect(useShellStore.getState().windows).toEqual([])
    expect(useShellStore.getState().userDesktopItems).toHaveLength(1)
  })

  it('navigates categories and submenus by keyboard and restores the Start button focus', async () => {
    enterGuest()
    const start = screen.getByRole('button', { name: 'Abrir menú de aplicaciones' })
    fireEvent.click(start)
    const menu = screen.getByRole('navigation', { name: 'Menú Start' })
    expect(screen.queryByRole('group', { name: 'Programas' })).not.toBeInTheDocument()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    const programs = screen.getByRole('button', { name: 'Programas' })
    expect(programs).toHaveFocus()
    fireEvent.keyDown(programs, { key: 'ArrowRight' })
    const submenu = screen.getByRole('group', { name: 'Programas' })
    const first = within(submenu).getByRole('button', { name: 'About Me' })
    await waitFor(() => expect(first).toHaveFocus())
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(within(submenu).getByRole('button', { name: 'File Explorer' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(programs).toHaveFocus()
    expect(screen.queryByRole('group', { name: 'Programas' })).not.toBeInTheDocument()
    fireEvent.keyDown(programs, { key: 'Escape' })
    expect(start).toHaveFocus()
    expect(screen.queryByRole('navigation', { name: 'Menú Start' })).not.toBeInTheDocument()
  })

  it('closes a window with Escape and returns focus to its desktop shortcut', async () => {
    enterGuest()
    const projects = screen.getByRole('button', { name: 'Proyectos. Doble clic para abrir' })
    projects.focus()
    fireEvent.doubleClick(projects)
    const frame = screen.getByRole('dialog', { name: 'Proyectos' })
    expect(frame).toHaveFocus()
    fireEvent.keyDown(frame, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Proyectos' })).not.toBeInTheDocument()
    await waitFor(() => expect(projects).toHaveFocus())
  })

  it('opens a desktop application with one touch', () => {
    enterGuest()
    const projects = screen.getByRole('button', { name: 'Proyectos. Doble clic para abrir' })
    touchPointer(projects, 'pointerdown')
    touchPointer(projects, 'pointerup')
    fireEvent.click(projects)
    expect(screen.getByRole('dialog', { name: 'Proyectos' })).toBeInTheDocument()
  })

  it('opens desktop actions with a long touch without launching the application', () => {
    vi.useFakeTimers()
    enterGuest()
    const projects = screen.getByRole('button', { name: 'Proyectos. Doble clic para abrir' })
    touchPointer(projects, 'pointerdown')
    act(() => vi.advanceTimersByTime(500))
    touchPointer(projects, 'pointerup')
    fireEvent.click(projects)
    expect(screen.getByRole('menu', { name: 'Menú contextual' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Proyectos' })).not.toBeInTheDocument()
  })
})
