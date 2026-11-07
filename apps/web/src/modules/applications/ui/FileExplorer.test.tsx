import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders as render } from '../../../test/render'
import { FileExplorer } from './FileExplorer'
import { touchPointer } from '../../../test/touch'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('FileExplorer', () => {
  it('opens the selected folder through Archivo and closes a dropdown with Escape', () => {
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)
    const fileMenu = screen.getByRole('button', { name: 'Archivo' })
    fireEvent.click(screen.getByRole('button', { name: 'Carpeta Escritorio' }))
    fireEvent.click(fileMenu)
    fireEvent.click(within(screen.getByRole('group', { name: 'Opciones de Archivo' })).getByRole('button', { name: 'Abrir' }))
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Escritorio')
    fireEvent.click(fileMenu)
    fireEvent.keyDown(fileMenu, { key: 'Escape' })
    expect(fileMenu).toHaveFocus()
    expect(screen.queryByRole('group', { name: 'Opciones de Archivo' })).not.toBeInTheDocument()
  })

  it('changes the view and navigates using Favoritos', () => {
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.getByRole('button', { name: 'Carpeta Escritorio' }).parentElement).toHaveAttribute('data-view', 'list')
    fireEvent.click(screen.getByRole('button', { name: 'Favoritos' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Opciones de Favoritos' })).getByRole('button', { name: 'Mis documentos' }))
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Mis documentos')
  })
  it('opens a folder with one touch', () => {
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)
    const folder = screen.getByRole('button', { name: 'Carpeta Escritorio' })
    touchPointer(folder, 'pointerdown')
    touchPointer(folder, 'pointerup')
    fireEvent.click(folder)
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Escritorio')
  })

  it('shows actions on a long touch without opening the folder on release', () => {
    vi.useFakeTimers()
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)
    const folder = screen.getByRole('button', { name: 'Carpeta Escritorio' })
    touchPointer(folder, 'pointerdown')
    act(() => vi.advanceTimersByTime(500))
    touchPointer(folder, 'pointerup')
    fireEvent.click(folder)
    expect(screen.getByRole('menu', { name: 'Acciones para Escritorio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^Este equipo$/)
  })
  it('selects an item with a single click without opening it', () => {
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)

    const desktopFolder = screen.getByRole('button', { name: 'Carpeta Escritorio' })
    fireEvent.click(desktopFolder)

    expect(desktopFolder).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo')
  })

  it('navigates folders and opens the selected application', () => {
    const onOpenAbout = vi.fn()
    render(<FileExplorer onOpenAbout={onOpenAbout} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Carpeta Escritorio' }))
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Escritorio')

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Abrir About Me' }))
    expect(onOpenAbout).toHaveBeenCalledOnce()
  })

  it('opens an item context menu with the available action', () => {
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={vi.fn()} onNotify={vi.fn()} />)

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Carpeta Escritorio' }), {
      clientX: 240,
      clientY: 140,
    })

    expect(screen.getByRole('menu', { name: 'Acciones para Escritorio' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abrir' }))
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('Este equipo › Escritorio')
  })

  it('offers Spanish and English CV files in Documents', () => {
    const onDownloadCv = vi.fn()
    render(<FileExplorer onOpenAbout={vi.fn()} onDownloadCv={onDownloadCv} onNotify={vi.fn()} />)

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Carpeta Mis documentos' }))
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Abrir Fernando_Lopez_Trejo_CV_ES.pdf' }))

    expect(onDownloadCv).toHaveBeenCalledWith('es')
  })

  it('opens a visitor folder by ID, keeps its route after renaming, and supports all navigation controls', () => {
    const folder = { id: 'user-folder-a', name: 'Apuntes', icon: '📁', kind: 'folder', origin: 'user', x: 0, y: 0 } as const
    const props = { onOpenAbout: vi.fn(), onDownloadCv: vi.fn(), onNotify: vi.fn(), initialDirectory: folder.id }
    const view = render(<FileExplorer {...props} folders={[folder]} />)
    const route = screen.getByLabelText('Ruta actual')
    const address = screen.getByRole('combobox', { name: 'Dirección' })
    const back = screen.getByRole('button', { name: 'Atrás' })
    const forward = screen.getByRole('button', { name: 'Adelante' })

    expect(route).toHaveTextContent('Este equipo › Escritorio › Apuntes')
    expect(address).toHaveValue(folder.id)
    expect(screen.getByRole('status')).toHaveTextContent('0 objetos')
    expect(screen.getByText('Esta carpeta está vacía.')).toBeInTheDocument()
    expect(forward).toBeDisabled()

    fireEvent.click(back)
    expect(route).toHaveTextContent('Este equipo › Escritorio')
    expect(screen.getByRole('button', { name: 'Carpeta Apuntes' })).toBeInTheDocument()
    fireEvent.click(forward)
    view.rerender(<FileExplorer {...props} folders={[{ ...folder, name: 'Ideas' }]} />)
    expect(route).toHaveTextContent('Escritorio › Ideas')

    fireEvent.change(address, { target: { value: 'nandos' } })
    expect(route).toHaveTextContent('Este equipo › Proyectos › NandOS')
    fireEvent.click(screen.getByRole('button', { name: 'Subir un nivel' }))
    expect(route).toHaveTextContent(/^Este equipo › Proyectos$/)
    fireEvent.click(back)
    expect(route).toHaveTextContent('Proyectos › NandOS')
  })

  it('drops stale directories from the address selector and history when a folder is recycled', () => {
    const folder = { id: 'user-folder-a', name: 'Borrador', icon: '📁', kind: 'folder', origin: 'user', x: 0, y: 0 } as const
    const props = { onOpenAbout: vi.fn(), onDownloadCv: vi.fn(), onNotify: vi.fn(), initialDirectory: folder.id }
    const view = render(<FileExplorer {...props} folders={[folder]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    view.rerender(<FileExplorer {...props} folders={[]} />)
    expect(screen.getByRole('button', { name: 'Adelante' })).toBeDisabled()
    expect(screen.queryByRole('option', { name: /Borrador/ })).not.toBeInTheDocument()
  })
})
