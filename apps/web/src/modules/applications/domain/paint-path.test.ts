import { describe, expect, it } from 'vitest'
import { canFinishPaintPath, paintPathColors, paintPathData } from './paint-path'
import type { PaintPath } from './paint-path'

const style = { color: '#f00', background: '#ff0', width: 3, style: 'both' } as const

describe('Paint curves and polygons', () => {
  it('keeps the same curve endpoints as each control point is added', () => {
    const curve: PaintPath = { ...style, kind: 'curve', start: { x: 1, y: 2 }, end: { x: 9, y: 2 }, controls: [] }
    expect(paintPathData(curve)).toBe('M 1.5 2.5 L 9.5 2.5')
    const first = { x: 2, y: 5 }
    expect(paintPathData({ ...curve, controls: [first] })).toBe('M 1.5 2.5 C 2.5 5.5 2.5 5.5 9.5 2.5')
    expect(paintPathData({ ...curve, controls: [first, { x: 6, y: 4 }] })).toBe('M 1.5 2.5 C 2.5 5.5 6.5 4.5 9.5 2.5')
  })

  it('closes polygons with at least three vertices and uses the secondary color as the fill', () => {
    const vertices = [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 2, y: 8 }]
    const polygon: PaintPath = { ...style, kind: 'polygon', vertices }
    const openPolygon = { ...polygon, vertices: vertices.slice(0, 2) }
    expect(canFinishPaintPath(openPolygon)).toBe(false)
    expect(paintPathColors(openPolygon).fill).toBe('none')
    expect(paintPathData(polygon)).toBe('M 2.5 2.5 L 8.5 2.5 L 2.5 8.5 Z')
    expect(paintPathColors(polygon)).toEqual({ fill: '#ff0', stroke: '#f00' })
    expect(paintPathColors({ ...polygon, style: 'solid' })).toEqual({ fill: '#f00', stroke: 'none' })
  })
})
