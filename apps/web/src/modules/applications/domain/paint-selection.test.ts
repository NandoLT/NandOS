import { describe, expect, it } from 'vitest'
import { hasEnclosedArea, paintRegion, placeRegion } from './paint-selection'

describe('Paint selection geometry', () => {
  it('includes both corners when dragging backwards, including one-pixel strips', () => {
    expect(paintRegion({ x: 8, y: 10 }, { x: 8, y: 6 })).toMatchObject({ x: 8, y: 6, width: 1, height: 5 })
  })

  it('rejects straight freehand gestures and keeps a polygon relative to its bounds when moved', () => {
    const start = { x: 8, y: 8 }
    const end = { x: 10, y: 10 }
    expect(hasEnclosedArea([start, { x: 9, y: 9 }, end])).toBe(false)
    const points = [start, { x: 4, y: 11 }, end]
    expect(hasEnclosedArea(points)).toBe(true)
    const region = paintRegion(start, end, points)
    const moved = placeRegion(region, { x: 13, y: -3 }, { width: 16, height: 16 })
    expect(moved).toMatchObject({ x: 9, y: 0, width: 7, height: 4, path: [
      { x: 4.5, y: .5 }, { x: .5, y: 3.5 }, { x: 6.5, y: 2.5 },
    ] })
  })
})
