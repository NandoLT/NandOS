import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WindowFrame } from './WindowFrame'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('focuses a window without scrolling the desktop or its taskbar', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  const noop = () => undefined
  const bounds = { x: 160, y: 92, width: 760, height: 560 }
  render(<WindowFrame windowState={{ id: 'help', title: 'Ayuda de NandOS', icon: '📖', bounds,
    previousBounds: bounds, isMinimized: false, isMaximized: false, zIndex: 10 }}
    isActive viewport={{ x: 0, y: 0, width: 900, height: 500 }} onFocus={noop} onClose={noop}
    onMinimize={noop} onMaximize={noop} onMove={noop} onResize={noop}>Ayuda</WindowFrame>)
  expect(focus).toHaveBeenCalledWith({ preventScroll: true })
})
