import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SolitaireWindow } from './SolitaireWindow'
import { touchPointer } from '../../../test/touch'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
const launch = () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  return render(<SolitaireWindow isPaused={false} onClose={vi.fn()} />)
}
describe('Solitario classic interface', () => {
  it('moves a selected ace to a foundation and restores it with Ctrl+Z', () => {
    launch()
    fireEvent.click(screen.getByRole('button', { name: 'As de tréboles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Base 1 vacía' }))
    expect(screen.getByLabelText('Puntuación')).toHaveTextContent('Puntos: 10')
    fireEvent.keyDown(screen.getByRole('group', { name: 'Mesa de Solitario' }), { key: 'z', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Base 1 vacía' })).toBeInTheDocument()
    expect(screen.getByLabelText('Puntuación')).toHaveTextContent('Puntos: 0')
  })
  it('draws three cards, double-clicks an ace into a foundation and pauses when minimized', () => {
    vi.useFakeTimers()
    const view = launch()
    fireEvent.click(screen.getByRole('button', { name: 'Robar tres cartas' }))
    expect(screen.getByRole('button', { name: '10 de diamantes' })).toBeInTheDocument()
    fireEvent.doubleClick(screen.getByRole('button', { name: 'As de tréboles' }))
    act(() => vi.advanceTimersByTime(2100))
    expect(screen.getByLabelText('Tiempo de partida')).toHaveTextContent('0:02')
    view.rerender(<SolitaireWindow isPaused onClose={vi.fn()} />)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('Tiempo de partida')).toHaveTextContent('0:02')
    view.rerender(<SolitaireWindow isPaused={false} onClose={vi.fn()} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByLabelText('Tiempo de partida')).toHaveTextContent('0:03')
  })
  it('moves cards with touch pointer events and rejects an invalid drop', () => {
    launch()
    const ace = screen.getByRole('button', { name: 'As de tréboles' })
    const originalHitTest = document.elementFromPoint
    try {
      document.elementFromPoint = vi.fn(() => screen.getByLabelText('Columna 1 vacía'))
      touchPointer(ace, 'pointerdown', 20, 20)
      touchPointer(ace, 'pointermove', 80, 80)
      touchPointer(ace, 'pointerup', 80, 80)
      expect(screen.getByLabelText('Puntuación')).toHaveTextContent('Puntos: 0')
      document.elementFromPoint = vi.fn(() => screen.getByRole('button', { name: 'Base 1 vacía' }))
      touchPointer(ace, 'pointerdown', 20, 20)
      touchPointer(ace, 'pointermove', 80, 80)
      touchPointer(ace, 'pointerup', 80, 80)
      expect(screen.getByLabelText('Puntuación')).toHaveTextContent('Puntos: 10')
    } finally { document.elementFromPoint = originalHitTest }
  })

  it('changes the draw option through the classic menu', () => {
    launch()
    fireEvent.click(screen.getByRole('button', { name: 'Juego' }))
    fireEvent.click(screen.getByRole('button', { name: 'Opciones…' }))
    const options = screen.getByRole('dialog', { name: 'Opciones de Solitario' })
    fireEvent.click(within(options).getByLabelText('Una carta'))
    fireEvent.click(within(options).getByRole('button', { name: 'Aplicar y repartir' }))
    expect(screen.getByRole('button', { name: 'Robar una carta' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('asks before replacing a started game and keeps it when cancelled', () => {
    launch()
    fireEvent.doubleClick(screen.getByRole('button', { name: 'As de tréboles' }))
    fireEvent.keyDown(screen.getByRole('group', { name: 'Mesa de Solitario' }), { key: 'F2' })
    fireEvent.click(screen.getByRole('button', { name: 'Seguir jugando' }))
    expect(screen.getByLabelText('Puntuación')).toHaveTextContent('Puntos: 10')
    expect(screen.queryByRole('button', { name: 'Base 1 vacía' })).not.toBeInTheDocument()
  })
})
