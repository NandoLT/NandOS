import type { PaintPoint } from './paint-raster'

export type PaintRegion = PaintPoint & { width: number; height: number; path?: readonly PaintPoint[] }
export type PaintClipboard = { bitmap: HTMLCanvasElement; path?: readonly PaintPoint[] }

export function paintRegion(start: PaintPoint, end: PaintPoint, outline?: readonly PaintPoint[]): PaintRegion {
  let x = Math.min(start.x, end.x)
  let y = Math.min(start.y, end.y)
  let right = Math.max(start.x, end.x)
  let bottom = Math.max(start.y, end.y)
  for (const point of outline ?? []) {
    x = Math.min(x, point.x)
    y = Math.min(y, point.y)
    right = Math.max(right, point.x)
    bottom = Math.max(bottom, point.y)
  }
  return { x, y, width: right - x + 1, height: bottom - y + 1,
    path: outline?.map((point) => ({ x: point.x - x + .5, y: point.y - y + .5 })) }
}

export function hasEnclosedArea(points: readonly PaintPoint[]) {
  const start = points[0]
  if (!start) return false
  const next = points.find(({ x, y }) => x !== start.x || y !== start.y)
  if (!next) return false
  return points.some(({ x, y }) => (next.x - start.x) * (y - start.y) !== (next.y - start.y) * (x - start.x))
}

export function regionPath({ x, y, width, height, path }: PaintRegion) {
  const shape = new Path2D()
  if (path?.length) {
    shape.moveTo(x + path[0].x, y + path[0].y)
    for (const point of path.slice(1)) shape.lineTo(x + point.x, y + point.y)
    shape.closePath()
  } else {
    shape.rect(x, y, width, height)
  }
  return shape
}

export function liftRegion(target: CanvasRenderingContext2D, region: PaintRegion, transparentColor?: string): PaintClipboard {
  const bitmap = document.createElement('canvas')
  bitmap.width = region.width
  bitmap.height = region.height
  const copy = bitmap.getContext('2d')!
  copy.save()
  copy.clip(regionPath({ ...region, x: 0, y: 0 }), 'evenodd')
  copy.drawImage(target.canvas, -region.x, -region.y)
  copy.restore()
  if (transparentColor) {
    const image = copy.getImageData(0, 0, bitmap.width, bitmap.height)
    const r = Number.parseInt(transparentColor.slice(1, 3), 16)
    const g = Number.parseInt(transparentColor.slice(3, 5), 16)
    const b = Number.parseInt(transparentColor.slice(5, 7), 16)
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i] === r && image.data[i + 1] === g && image.data[i + 2] === b) image.data[i + 3] = 0
    }
    copy.putImageData(image, 0, 0)
  }
  return { bitmap, path: region.path }
}

export function eraseRegion(target: CanvasRenderingContext2D, region: PaintRegion, color: string) {
  target.fillStyle = color
  target.fill(regionPath(region), 'evenodd')
}

export function placeRegion(region: PaintRegion, point: PaintPoint, canvas: { width: number; height: number }): PaintRegion {
  return { ...region,
    x: Math.max(0, Math.min(point.x, canvas.width - region.width)),
    y: Math.max(0, Math.min(point.y, canvas.height - region.height)),
  }
}
