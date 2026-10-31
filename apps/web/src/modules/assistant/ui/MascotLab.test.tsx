import { useEffect } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MascotLab from './MascotLab'

const fixture = vi.hoisted(() => ({
  controller: { select: vi.fn(), answer: vi.fn() },
  reducedMotion: false,
}))

vi.mock('./SvgMascot', () => ({
  SvgMascot: ({ paused, onReady }: {
    paused: boolean
    onReady(value: typeof fixture.controller | null): void
  }) => {
    useEffect(() => {
      onReady(fixture.controller)
      return () => onReady(null)
    }, [onReady])
    return <div role="img" aria-label="Mascota retro de NandOS" data-paused={paused} />
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  fixture.reducedMotion = false
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: fixture.reducedMotion,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('mascot lab', () => {
  it('always uses the small transparent stage without size or background controls', () => {
    render(<MascotLab />)
    expect(screen.getByRole('img').parentElement).toHaveStyle({ width: 'min(200px, 100%)' })
    expect(screen.getByRole('img').parentElement).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' })
    expect(screen.queryByRole('combobox', { name: 'Tamaño' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Fondo de contraste' })).not.toBeInTheDocument()
  })
  it('drives real controller actions and disables expressions while paused', () => {
    render(<MascotLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Escucha' }))
    expect(fixture.controller.select).toHaveBeenLastCalledWith('listening')
    fireEvent.click(screen.getByRole('button', { name: 'Pensando' }))
    expect(fixture.controller.select).toHaveBeenLastCalledWith('thinking')
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta' }))
    expect(fixture.controller.answer).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('button', { name: 'Respuesta' })).toBeDisabled()
    expect(screen.getByRole('img')).toHaveAttribute('data-paused', 'true')
  })
  it('honors reduced motion until the visitor explicitly resumes', () => {
    fixture.reducedMotion = true
    render(<MascotLab />)
    expect(screen.getByRole('button', { name: 'Escucha' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar' }))
    expect(screen.getByRole('button', { name: 'Escucha' })).not.toBeDisabled()
  })
  it('unmounts the player when hidden and mounts it again on request', () => {
    render(<MascotLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar laboratorio' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar asistente de prueba' }))
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
