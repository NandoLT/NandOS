import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinballGame } from '../domain/pinball-game'
import type { PinballMode } from '../domain/pinball-game'
import type { PinballInputs, PinballSnapshot } from '../domain/pinball'
import { PinballWindow } from './PinballWindow'
let current: { inputs: { current: PinballInputs }; paused: boolean; mode: PinballMode; onSnapshot: (snapshot: PinballSnapshot) => void; onControl: (name: keyof PinballInputs, source: string, down: boolean) => void; releaseKey: number } | undefined
vi.mock('./PinballScene', () => ({ PinballScene: (props: NonNullable<typeof current> & { onReady: () => void }) => {
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
  it('cancels the captured launcher pointer at the board without releasing a different control', async () => {
    await start()
    const initialRelease = current?.releaseKey ?? 0
    act(() => {
      current?.onControl('launch', 'pointer-7', true)
      current?.onControl('left', 'pointer-8', true)
    })
    const scene = screen.getByTestId('physics-scene')
    pointer(scene, 'lostpointercapture', 7)
    expect(current?.inputs.current).toEqual({ launch: false, left: true, right: false })
    expect(current?.releaseKey).toBe(initialRelease + 1)
    pointer(scene, 'pointercancel', 8)
    expect(current?.inputs.current.left).toBe(false)
    expect(current?.releaseKey).toBe(initialRelease + 1)
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
  it('starts with three balls and switches to unlimited practice through Game', async () => {
    await start()
    expect(current?.mode).toBe('classic')
    fireEvent.click(screen.getByRole('button', { name: 'Juego' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ensayo libre' }))
    await waitFor(() => expect(current?.mode).toBe('practice'))
    expect(screen.getByText('LIBRE', { exact: true })).toBeInTheDocument()
  })
  it('shows real score and game over, blocks controls and starts a fresh game with F2', async () => {
    await start()
    act(() => current?.onSnapshot({ ready: false, charge: 0, shots: 3, drains: 3, hits: 5, game: { ...createPinballGame(), score: 8500, ball: 3, phase: 'over' } }))
    expect(screen.getByText('FIN DE PARTIDA')).toBeInTheDocument()
    expect(screen.getByLabelText('Puntuación')).toHaveTextContent('00008500')
    expect(screen.getByLabelText('Cargar y lanzar bola')).toBeDisabled()
    fireEvent.keyDown(screen.getByLabelText('Juego de Pinball'), { code: 'F2' })
    await waitFor(() => expect(screen.queryByText('FIN DE PARTIDA')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Puntuación')).toHaveTextContent('00000000')
  })

})
