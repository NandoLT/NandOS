import { describe, expect, it } from 'vitest'
import { fitHelpWindowBounds } from './help-window-bounds'

const original = { x: 160, y: 92, width: 760, height: 560 }
const desktop = { x: 0, y: 0, width: 1280, height: 678 }

describe('help window bounds', () => {
  it('uses a compact height initially and more room when reading', () => {
    expect(fitHelpWindowBounds(original, desktop, false).height).toBe(420)
    expect(fitHelpWindowBounds(original, desktop, true).height).toBe(600)
  })

  it('keeps the whole reading window above the taskbar without changing its width', () => {
    const bounds = fitHelpWindowBounds(original, desktop, true)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(desktop.height - 8)
    expect(bounds.width).toBe(original.width)
  })

  it('clamps old persisted positions and sizes to a smaller desktop', () => {
    const viewport = { x: 0, y: 0, width: 900, height: 450 }
    const bounds = fitHelpWindowBounds({ x: 840, y: 590, width: 1000, height: 800 }, viewport, true)
    expect(bounds).toEqual({ x: 8, y: 8, width: 884, height: 434 })
  })

  it('shrinks again when returning to the wiki presentation', () => {
    const reading = fitHelpWindowBounds(original, desktop, true)
    const home = fitHelpWindowBounds(reading, desktop, false)
    expect(home.height).toBe(420)
    expect(home.x).toBe(reading.x)
    expect(home.y).toBe(reading.y)
  })
})
