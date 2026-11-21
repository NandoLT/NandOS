import { useEffect } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PinballInputs } from '../domain/pinball'
import { PinballWindow } from './PinballWindow'
let current: { inputs: { current: PinballInputs }; paused: boolean } | undefined
vi.mock('./PinballScene', () => ({ PinballScene: (props: { inputs: { current: PinballInputs }; paused: boolean; onReady: () => void }) => {
  current = props
  const { onReady } = props
  useEffect(() => { onReady() }, [onReady])
  return <div data-testid="physics-scene" />
} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); current = undefined })
async function start() {
  vi.stubGlobal('WebGL2RenderingContext', class {})
  const rendered = render(<PinballWindow isPaused={false} isActive onClose={vi.fn()} />)
  await screen.findByTestId('physics-scene')
  await waitFor(() => expect(screen.getByLabelText('Flipper izquierdo')).toBeEnabled())
  return rendered
}
function pointer(target: Element, type: string, id: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { value: id }); fireEvent(target, event)
}
describe('Pinball controls and lifecycle', () => {
  it('combines independent keyboard and touch controls and clears them on pause', async () => {
    const { rerender } = await start()
    const panel = screen.getByLabelText('Juego de Pinball')
    fireEvent.keyDown(panel, { code: 'ArrowLeft' })
    pointer(screen.getByLabelText('Flipper derecho'), 'pointerdown', 2)
    expect(current?.inputs.current).toEqual({ left: true, right: true, launch: false })
    pointer(screen.getByLabelText('Flipper izquierdo'), 'pointerdown', 1)
    fireEvent.keyUp(panel, { code: 'ArrowLeft' })
    expect(current?.inputs.current.left).toBe(true)
    pointer(screen.getByLabelText('Flipper izquierdo'), 'pointerup', 1)
    expect(current?.inputs.current.left).toBe(false)
    rerender(<PinballWindow isPaused isActive onClose={vi.fn()} />)
    expect(current?.paused).toBe(true)
    expect(current?.inputs.current).toEqual({ left: false, right: false, launch: false })
  })
  it('releases cancelled pointers and held launch keys on browser blur', async () => {
    await start()
    pointer(screen.getByLabelText('Cargar y lanzar bola'), 'pointerdown', 1)
    expect(current?.inputs.current.launch).toBe(true)
    pointer(screen.getByLabelText('Cargar y lanzar bola'), 'pointercancel', 1)
    expect(current?.inputs.current.launch).toBe(false)
    fireEvent.keyDown(screen.getByLabelText('Juego de Pinball'), { code: 'Space' })
    fireEvent.blur(window)
    expect(current?.inputs.current.launch).toBe(false)
    expect(current?.paused).toBe(true)
    fireEvent.focus(window)
    expect(current?.paused).toBe(false)
  })
  it('pauses on loss of desktop focus and displays the controls in Help', async () => {
    const { rerender } = await start()
    rerender(<PinballWindow isPaused={false} isActive={false} onClose={vi.fn()} />)
    expect(current?.paused).toBe(true)
    rerender(<PinballWindow isPaused={false} isActive onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cómo jugar' }))
    expect(screen.getByRole('dialog', { name: 'Pinball · Cómo jugar' })).toBeInTheDocument()
    expect(current?.paused).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(current?.paused).toBe(false)
  })
  it('shows a useful fallback without attempting to load WebGL', () => {
    vi.stubGlobal('WebGL2RenderingContext', undefined)
    render(<PinballWindow isPaused={false} isActive onClose={vi.fn()} />)
    expect(screen.getByText('Este navegador no dispone de WebGL 2.')).toBeInTheDocument()
    expect(screen.queryByTestId('physics-scene')).not.toBeInTheDocument()
  })
})
