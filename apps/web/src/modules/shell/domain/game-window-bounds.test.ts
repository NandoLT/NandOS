import { describe, expect, it } from 'vitest'
import { fitGameWindowBounds } from './game-window-bounds'

describe('game window placement', () => {
  it('moves a larger board upward and sideways before introducing unnecessary scroll', () => {
    const fitted = fitGameWindowBounds({ x: 160, y: 92, width: 755, height: 526 }, { x: 0, y: 0, width: 900, height: 555 })
    expect(fitted).toEqual({ x: 137, y: 21, width: 755, height: 526 })
    expect(fitted.y + fitted.height).toBeLessThanOrEqual(555 - 8)
  })
  it('keeps the chosen position when the whole game already fits', () => {
    const bounds = { x: 160, y: 92, width: 228, height: 334 }
    expect(fitGameWindowBounds(bounds, { x: 0, y: 0, width: 900, height: 678 })).toEqual(bounds)
  })
  it('clips only when the board is larger than the entire usable desktop', () => {
    expect(fitGameWindowBounds({ x: 160, y: 92, width: 755, height: 718 }, { x: 0, y: 0, width: 900, height: 500 }))
      .toEqual({ x: 137, y: 8, width: 755, height: 484 })
    expect(fitGameWindowBounds({ x: 160, y: 92, width: 755, height: 526 }, { x: 0, y: 0, width: 390, height: 802 }))
      .toEqual({ x: 8, y: 8, width: 374, height: 526 })
  })
})
