import { describe, expect, it } from 'vitest'
import { findNearestDesktopGridPosition } from './desktop-grid'

describe('desktop grid', () => {
  it('snaps a dropped icon to the nearest grid cell', () => {
    expect(findNearestDesktopGridPosition({ x: 120, y: 100 }, { width: 800, height: 600 })).toEqual({
      x: 122,
      y: 108,
    })
  })

  it('chooses the nearest free cell when the closest one is occupied', () => {
    expect(
      findNearestDesktopGridPosition(
        { x: 120, y: 100 },
        { width: 800, height: 600 },
        [{ x: 122, y: 108 }]
      )
    ).toEqual({ x: 122, y: 24 })
  })

  it('keeps the snapped position within the desktop and above the taskbar', () => {
    expect(findNearestDesktopGridPosition({ x: 10000, y: 10000 }, { width: 480, height: 420 })).toEqual({
      x: 330,
      y: 276,
    })
  })
})
