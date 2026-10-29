import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders as render } from '../../../test/render'
import { FileExplorer } from './FileExplorer'
import { touchPointer } from '../../../test/touch'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('FileExplorer', () => {
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
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^📍 Este equipo$/)
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
})
