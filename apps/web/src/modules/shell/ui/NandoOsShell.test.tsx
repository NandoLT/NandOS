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
    userDesktopItems: [], recycleBinItems: [], fileNodes: [],
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
  it.each([
    ['/proyectos', 'Proyectos', 'Proyectos'],
    ['/proyectos/nandos', 'Proyectos', 'NandOS'],
    ['/contacto', 'Contacto', 'Contacto'],
  ])('opens %s directly in the guest desktop', (path, title, heading) => {
    window.history.replaceState(null, '', path)
    try {
      render(<NandoOsShell />)
      const section = within(screen.getByRole('dialog', { name: title }))
      expect(section.getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Entrar como invitado' })).not.toBeInTheDocument()
      if (path === '/proyectos/nandos') {
        fireEvent.click(section.getByRole('button', { name: 'Probar en Terminal' }))
        expect(screen.getByRole('dialog', { name: 'Terminal' })).toBeInTheDocument()
      }
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
      fireEvent.click(screen.getByRole('button', { name: 'Log off Invitado' }))
      expect(window.location.pathname).toBe('/')
      expect(screen.getByRole('button', { name: 'Entrar como invitado' })).toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('saves the prefilled Writer demo without changing it when focus returns to the page', async () => {
    window.history.replaceState(null, '', '/proyectos/nandos')
    try {
      render(<NandoOsShell />)
      fireEvent.click(screen.getByRole('button', { name: 'Probar en Writer' }))
      const writer = within(screen.getByRole('dialog', { name: 'Writer' }))
      await writer.findByRole('heading', { name: 'Una nota en NandOS' })
      fireEvent.click(writer.getByRole('button', { name: 'Guardar' }))
      fireEvent.change(writer.getByRole('textbox', { name: 'Nombre del documento' }), { target: { value: 'Demo' } })
      fireEvent.click(writer.getByRole('button', { name: 'Guardar documento' }))
      await waitFor(() => expect(writer.getByRole('textbox', { name: 'Contenido del documento' })).toHaveFocus())
      expect(writer.getByRole('status')).toHaveTextContent('Documento guardado')
      expect(writer.getByText('Demo.doc', { exact: true })).toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('launches Terminal from Start and shares folders and Writer documents with Explorer', async () => {
    useShellStore.getState().saveWriterDocument({ name: 'Ideas', parentId: 'documents', markdown: '# Ideas de terminal' })
    enterGuest()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Programas' }), { key: 'ArrowRight' })
    fireEvent.click(within(screen.getByRole('group', { name: 'Programas' })).getByRole('button', { name: 'Terminal' }))
    const terminal = within(screen.getByRole('dialog', { name: 'Terminal' }))
    const input = terminal.getByRole('textbox', { name: 'Comando' })
    const submit = (value: string) => {
      fireEvent.change(input, { target: { value } })
      fireEvent.submit(input.closest('form')!)
    }
    submit('dir --help')
    expect(terminal.getByRole('log')).toHaveTextContent('dir [ruta]')
    submit('cd "C:\\Mis documentos"')
    submit('mkdir "Cuaderno terminal"')
    submit('dir')
    expect(terminal.getByRole('log')).toHaveTextContent('<DIR> Cuaderno terminal')
    submit('type Ideas.doc')
    expect(terminal.getByRole('log')).toHaveTextContent('# Ideas de terminal')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input).toHaveValue('type Ideas.doc')
    submit('open Ideas.doc')
    expect(await screen.findByRole('heading', { name: 'Ideas de terminal' })).toBeInTheDocument()
    submit('open .')
    const explorer = within(screen.getByRole('dialog', { name: 'Explorador de archivos' }))
    expect(explorer.getByRole('button', { name: 'Carpeta Cuaderno terminal' })).toBeInTheDocument()
    submit('exit')
    expect(screen.queryByRole('dialog', { name: 'Terminal' })).not.toBeInTheDocument()
  })

  it('creates a subfolder, saves a Writer document and reopens its formatting from the Explorer', async () => {
    enterGuest()
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Este equipo. Doble clic para abrir' }))
    const explorer = within(screen.getByRole('dialog', { name: 'Explorador de archivos' }))
    fireEvent.doubleClick(explorer.getByRole('button', { name: 'Carpeta Mis documentos' }))
    fireEvent.click(explorer.getByRole('button', { name: 'Archivo' }))
    fireEvent.click(explorer.getByRole('button', { name: 'Nueva carpeta…' }))
    fireEvent.change(explorer.getByLabelText('Nombre de la nueva carpeta'), { target: { value: 'Cuaderno' } })
    fireEvent.click(explorer.getByRole('button', { name: 'Crear' }))
    fireEvent.doubleClick(explorer.getByRole('button', { name: 'Carpeta Cuaderno' }))
    fireEvent.click(explorer.getByRole('button', { name: 'Archivo' }))
    fireEvent.click(explorer.getByRole('button', { name: 'Nuevo documento…' }))
    const writer = within(screen.getByRole('dialog', { name: 'Writer' }))
    const page = await writer.findByRole('textbox', { name: 'Contenido del documento' })
    fireEvent.paste(page, { clipboardData: { types: ['text/plain'], getData: (type: string) => type === 'text/plain' ? 'Una nota' : '' } })
    fireEvent.change(writer.getByRole('combobox', { name: 'Estilo de párrafo' }), { target: { value: '1' } })
    expect(writer.getByRole('heading', { name: 'Una nota' })).toBeInTheDocument()
    expect(writer.queryByRole('button', { name: 'Vista previa' })).not.toBeInTheDocument()
    fireEvent.click(writer.getByRole('button', { name: 'Guardar' }))
    expect(writer.getByLabelText('Guardar en')).toHaveDisplayValue('Mis documentos › Cuaderno')
    fireEvent.change(writer.getByLabelText('Nombre del documento'), { target: { value: 'Notas' } })
    fireEvent.click(writer.getByRole('button', { name: 'Guardar documento' }))
    expect(writer.getByRole('status')).toHaveTextContent('Documento guardado')
    expect(useShellStore.getState().fileNodes).toContainEqual(expect.objectContaining({ markdown: expect.stringMatching(/^# Una nota\s*$/u) }))
    fireEvent.click(writer.getByRole('button', { name: 'Cerrar' }))
    fireEvent.doubleClick(explorer.getByRole('button', { name: 'Abrir Notas.doc' }))
    expect(await screen.findByRole('heading', { name: 'Una nota' })).toBeInTheDocument()
  })
  function createVisitorFolder() {
    useShellStore.getState().createDesktopFolder({ x: 330, y: 200 })
    enterGuest()
    return screen.getByRole('button', { name: 'Nueva carpeta. Doble clic para abrir' })
  }

  it('renames a visitor folder from its context menu and saves with Enter', () => {
    const folder = createVisitorFolder()
    fireEvent.contextMenu(folder)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cambiar nombre' }))
    const input = screen.getByRole('textbox', { name: 'Nombre de la carpeta' })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('Nueva carpeta')
    fireEvent.change(input, { target: { value: 'Mis notas' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Mis notas. Doble clic para abrir' })).toHaveFocus()
    expect(useShellStore.getState().userDesktopItems[0].name).toBe('Mis notas')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('cancels renaming with Escape and saves on blur', () => {
    const folder = createVisitorFolder()
    fireEvent.keyDown(folder, { key: 'F2' })
    const input = screen.getByRole('textbox', { name: 'Nombre de la carpeta' })
    fireEvent.change(input, { target: { value: 'Descartar' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(useShellStore.getState().userDesktopItems[0].name).toBe('Nueva carpeta')
    fireEvent.keyDown(folder, { key: 'F2' })
    const next = screen.getByRole('textbox', { name: 'Nombre de la carpeta' })
    fireEvent.change(next, { target: { value: 'Guardada' } })
    fireEvent.blur(next)
    expect(useShellStore.getState().userDesktopItems[0].name).toBe('Guardada')
  })

  it('keeps editing an invalid name without saving it', () => {
    const folder = createVisitorFolder()
    fireEvent.keyDown(folder, { key: 'F2' })
    const input = screen.getByRole('textbox', { name: 'Nombre de la carpeta' })
    fireEvent.change(input, { target: { value: '  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent(/nombre/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(useShellStore.getState().userDesktopItems[0].name).toBe('Nueva carpeta')
  })

  it('edits the label after two paused clicks but preserves a normal double click', () => {
    vi.useFakeTimers()
    const folder = createVisitorFolder()
    fireEvent.click(within(folder).getByText('Nueva carpeta'), { detail: 1 })
    act(() => vi.advanceTimersByTime(700))
    fireEvent.click(within(folder).getByText('Nueva carpeta'), { detail: 1 })
    expect(screen.getByRole('textbox', { name: 'Nombre de la carpeta' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    fireEvent.click(folder, { detail: 1 })
    fireEvent.click(folder, { detail: 2 })
    fireEvent.doubleClick(folder)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Explorador de archivos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Escritorio › Nueva carpeta')
  })

  it('does not offer renaming for protected system shortcuts', () => {
    enterGuest()
    const system = screen.getByRole('button', { name: 'Proyectos. Doble clic para abrir' })
    fireEvent.contextMenu(system)
    expect(screen.queryByRole('menuitem', { name: 'Cambiar nombre' })).not.toBeInTheDocument()
    fireEvent.keyDown(system, { key: 'F2' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('does not confuse a fast double click on the name with renaming', () => {
    vi.useFakeTimers()
    const folder = createVisitorFolder()
    const label = within(folder).getByText('Nueva carpeta')
    fireEvent.click(label, { detail: 1 })
    act(() => vi.advanceTimersByTime(100))
    fireEvent.click(label, { detail: 2 })
    fireEvent.doubleClick(label)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Escritorio › Nueva carpeta')
  })

  it('opens the renamed desktop folder from its context menu in the Explorer', () => {
    const folder = createVisitorFolder()
    const [item] = useShellStore.getState().userDesktopItems
    act(() => { useShellStore.getState().renameUserDesktopItem(item.id, 'Apuntes') })
    fireEvent.contextMenu(folder)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abrir' }))
    const explorer = within(screen.getByRole('dialog', { name: 'Explorador de archivos' }))
    expect(explorer.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Escritorio › Apuntes')
    expect(explorer.getByRole('status')).toHaveTextContent('0 objetos')
    fireEvent.click(explorer.getByRole('button', { name: 'Subir un nivel' }))
    expect(explorer.getByRole('button', { name: 'Carpeta Apuntes' })).toBeInTheDocument()
  })

  it('shows the pixel-art About Me shortcut', () => {
    enterGuest()
    const shortcut = screen.getByRole('button', { name: 'About Me. Doble clic para abrir' })
    expect(shortcut.querySelector('img')).toHaveAttribute('src', '/about-me.svg')
  })

  it('allows selecting the icon first and editing its name after a longer pause', () => {
    vi.useFakeTimers()
    const folder = createVisitorFolder()
    fireEvent.click(folder, { detail: 1 })
    act(() => vi.advanceTimersByTime(5000))
    fireEvent.click(within(folder).getByText('Nueva carpeta'), { detail: 1 })
    expect(screen.getByRole('textbox', { name: 'Nombre de la carpeta' })).toHaveFocus()
  })

  it('recognizes label clicks retargeted to the button by pointer capture', () => {
    vi.useFakeTimers()
    const folder = createVisitorFolder()
    const label = within(folder).getByText('Nueva carpeta')
    vi.spyOn(label, 'getBoundingClientRect').mockReturnValue({
      x: 330, y: 240, left: 330, top: 240, right: 410, bottom: 260,
      width: 80, height: 20, toJSON: () => ({}),
    })
    fireEvent.click(folder, { detail: 1, clientX: 370, clientY: 215 })
    act(() => vi.advanceTimersByTime(700))
    fireEvent.click(folder, { detail: 1, clientX: 370, clientY: 250 })
    expect(screen.getByRole('textbox', { name: 'Nombre de la carpeta' })).toHaveFocus()
  })

  it('rejects a duplicate name in the editor and cancels an invalid name on blur', () => {
    useShellStore.getState().createDesktopFolder({ x: 430, y: 200 })
    const folder = createVisitorFolder()
    fireEvent.keyDown(folder, { key: 'F2' })
    const input = screen.getByRole('textbox', { name: 'Nombre de la carpeta' })
    fireEvent.change(input, { target: { value: 'Nueva carpeta (2)' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una carpeta con ese nombre.')
    fireEvent.blur(input)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(useShellStore.getState().userDesktopItems.map((item) => item.name)).toEqual(['Nueva carpeta', 'Nueva carpeta (2)'])
  })

  it('drags a visitor folder without opening its name editor', () => {
    const folder = createVisitorFolder()
    for (const [type, x, y] of [['pointerdown', 340, 210], ['pointermove', 450, 300], ['pointerup', 450, 300]] as const) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y })
      Object.defineProperties(event, { pointerType: { value: 'mouse' }, pointerId: { value: 1 } })
      fireEvent(folder, event)
    }
    fireEvent.click(folder)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(useShellStore.getState().userDesktopItems[0]).not.toMatchObject({ x: 330, y: 200 })
  })

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
