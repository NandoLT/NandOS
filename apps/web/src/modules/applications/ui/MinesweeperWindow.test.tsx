import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MinesweeperWindow } from './MinesweeperWindow'
import { readMineRecords, storeMineRecord } from '../infrastructure/minesweeper-records'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
const launch = () => render(<MinesweeperWindow onClose={vi.fn()} onResize={vi.fn()} />)

describe('Minesweeper window', () => {
  it('supports marking with keyboard and context menu, and moving a single tab stop', () => {
    launch()
    const cells = within(screen.getByRole('group', { name: 'Tablero de Buscaminas' })).getAllByRole('button')
    cells[1].scrollIntoView = vi.fn()
    expect(cells).toHaveLength(64)
    fireEvent.keyDown(cells[0], { key: 'f' })
    expect(cells[0]).toHaveAccessibleName('Fila 1, columna 1: bandera')
    expect(screen.getByRole('img', { name: 'Minas restantes: 9' })).toBeInTheDocument()
    fireEvent.contextMenu(cells[0])
    expect(cells[0]).toHaveAccessibleName('Fila 1, columna 1: interrogación')
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' })
    expect(cells[1]).toHaveFocus()
    expect(cells[0]).toHaveAttribute('tabindex', '-1')
  })

  it('starts the timer on reveal, restarts via face/F2 and changes difficulty', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    launch()
    const cell = screen.getByRole('button', { name: 'Fila 1, columna 1: cubierta' })
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('img', { name: 'Tiempo en segundos: 0' })).toBeInTheDocument()
    fireEvent.click(cell)
    act(() => vi.advanceTimersByTime(2200))
    expect(screen.getByRole('img', { name: 'Tiempo en segundos: 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }))
    expect(screen.getByRole('img', { name: 'Tiempo en segundos: 0' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Juego' }))
    fireEvent.click(screen.getByRole('button', { name: 'Intermedio' }))
    expect(within(screen.getByRole('group', { name: 'Tablero de Buscaminas' })).getAllByRole('button')).toHaveLength(256)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Nueva partida' }), { key: 'F2' })
    expect(screen.getByRole('img', { name: 'Minas restantes: 40' })).toBeInTheDocument()
  })

  it('keeps touch flag mode separate from revealing cells', () => {
    launch()
    fireEvent.click(screen.getByRole('button', { name: /Banderas/, hidden: true }))
    const cell = screen.getByRole('button', { name: 'Fila 1, columna 1: cubierta' })
    fireEvent.click(cell)
    expect(cell).toHaveAccessibleName('Fila 1, columna 1: bandera')
    expect(screen.getByRole('img', { name: 'Tiempo en segundos: 0' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }))
    expect(screen.getByRole('button', { name: /Banderas/, hidden: true })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Fila 1, columna 1: cubierta' }))
    expect(screen.queryByRole('button', { name: 'Fila 1, columna 1: bandera' })).not.toBeInTheDocument()
  })

  it('validates stored records and only replaces them with a faster time', () => {
    localStorage.setItem('nandos:minesweeper:records:v1', '{"beginner":42,"intermediate":-1,"expert":"bad"}')
    expect(readMineRecords()).toEqual({ beginner: 42 })
    expect(storeMineRecord('beginner', 45)).toEqual({ beginner: 42 })
    expect(storeMineRecord('beginner', 30)).toEqual({ beginner: 30 })
    localStorage.setItem('nandos:minesweeper:records:v1', 'bad json')
    expect(readMineRecords()).toEqual({})
  })
})
