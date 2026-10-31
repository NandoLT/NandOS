import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MascotController } from '../application/mascot-controller'
import { SvgMascot } from './SvgMascot'

type FakeAnimation = {
  playState: string
  onfinish: (() => void) | null
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
}
const records: { element: Element; animation: FakeAnimation }[] = []
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

beforeEach(() => {
  records.length = 0
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn(function(this: Element) {
      const animation: FakeAnimation = {
        playState: 'running', onfinish: null,
        play: vi.fn(() => { animation.playState = 'running' }),
        pause: vi.fn(() => { animation.playState = 'paused' }),
        cancel: vi.fn(() => { animation.playState = 'idle' }),
      }
      records.push({ element: this, animation })
      return animation
    }),
  })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate)
  else Reflect.deleteProperty(Element.prototype, 'animate')
  vi.unstubAllGlobals()
})

function mount(paused = false) {
  let controller: MascotController | null = null
  const onReady = vi.fn((value: MascotController | null) => { controller = value })
  const onStateChange = vi.fn()
  const view = render(<SvgMascot paused={paused} onReady={onReady} onStateChange={onStateChange} />)
  return { ...view, onReady, onStateChange, controller: controller! }
}

describe('native SVG mascot', () => {
  it('renders immediately with no canvas, external file, or splash', () => {
    const { container } = mount()
    expect(screen.getByRole('img', { name: 'Mascota retro de NandOS' }).tagName.toLowerCase()).toBe('svg')
    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'idle')
  })
  it('switches expressions without restarting the independent breathing animation', () => {
    const { controller, onStateChange } = mount()
    const breathing = records.find((record) => record.element.getAttribute('data-motion') === 'breathing')!.animation
    act(() => controller.select('listening'))
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'listening')
    act(() => controller.select('thinking'))
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'thinking')
    expect(onStateChange).toHaveBeenLastCalledWith('Pensando')
    expect(breathing.cancel).not.toHaveBeenCalled()
  })
  it('plays each answer once and returns to idle when the animation finishes', () => {
    const { controller, onStateChange } = mount()
    act(() => controller.select('thinking'))
    act(() => controller.answer())
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'answer')
    const first = records.at(-1)!.animation
    act(() => controller.answer())
    expect(first.cancel).toHaveBeenCalledOnce()
    const second = records.at(-1)!.animation
    expect(second).not.toBe(first)
    act(() => second.onfinish?.())
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'idle')
    expect(onStateChange).toHaveBeenLastCalledWith('Reposo')
  })
  it('pauses and resumes all native animations without creating them again', () => {
    const { rerender, onReady, onStateChange } = mount(true)
    expect(records.every(({ animation }) => animation.pause.mock.calls.length === 1)).toBe(true)
    const count = records.length
    rerender(<SvgMascot paused={false} onReady={onReady} onStateChange={onStateChange} />)
    expect(records.length).toBe(count)
    expect(records.every(({ animation }) => animation.play.mock.calls.length === 1)).toBe(true)
  })
  it('pauses while the tab is hidden and resumes when visible', () => {
    mount()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(records.every(({ animation }) => animation.playState === 'paused')).toBe(true)
    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(records.every(({ animation }) => animation.playState === 'running')).toBe(true)
    hidden.mockRestore()
  })
  it('cancels animations and releases the controller on unmount', () => {
    const { unmount, onReady } = mount()
    unmount()
    expect(records.every(({ animation }) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(onReady).toHaveBeenLastCalledWith(null)
  })
})
