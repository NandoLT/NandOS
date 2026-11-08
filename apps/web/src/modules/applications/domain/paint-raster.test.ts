import { expect, it } from 'vitest'
import { floodFill, traceLine } from './paint-raster'

it('stamps every point of a pixel line in either direction', () => {
  const pixels: string[] = []
  traceLine({ x: 4, y: 2 }, { x: 0, y: 0 }, (x, y) => pixels.push(x + ',' + y))
  expect(pixels).toEqual(['4,2', '3,1', '2,1', '1,0', '0,0'])
})

it('fills only the connected matching pixels and leaves the separator intact', () => {
  const black = [0, 0, 0, 255], white = [255, 255, 255, 255], red = [255, 0, 0, 255]
  const data = new Uint8ClampedArray([...white, ...black, ...white, ...white, ...black, ...white])
  const image = { width: 3, height: 2, data, colorSpace: 'srgb' } as ImageData
  expect(floodFill(image, { x: 0, y: 0 }, red)).toBe(true)
  expect(Array.from(data)).toEqual([...red, ...black, ...white, ...red, ...black, ...white])
  expect(floodFill(image, { x: 0, y: 0 }, red)).toBe(false)
})
