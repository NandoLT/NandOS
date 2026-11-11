import type { PaintPoint } from './paint-raster'
import type { ShapeStyle } from './paint-tools'

type PathStyle = { color: string; background: string; width: number; style: ShapeStyle }
export type PaintPath = PathStyle & (
  | { kind: 'curve'; start: PaintPoint; end: PaintPoint; controls: readonly PaintPoint[] }
  | { kind: 'polygon'; vertices: readonly PaintPoint[] }
)

export function samePaintPoint(first: PaintPoint, second: PaintPoint) {
  return first.x === second.x && first.y === second.y
}

export function canFinishPaintPath(path: PaintPath) {
  return path.kind === 'curve' ? !samePaintPoint(path.start, path.end) : path.vertices.length >= 3
}

export function paintPathData(path: PaintPath, next?: PaintPoint) {
  const xy = ({ x, y }: PaintPoint) => (x + .5) + ' ' + (y + .5)
  if (path.kind === 'polygon') {
    const vertices = next ? [...path.vertices, next] : path.vertices
    return 'M ' + vertices.map(xy).join(' L ') + (canFinishPaintPath(path) ? ' Z' : '')
  }
  const [first, second] = path.controls
  if (!first) return 'M ' + xy(path.start) + ' L ' + xy(path.end)
  return 'M ' + xy(path.start) + ' C ' + [first, second ?? first, path.end].map(xy).join(' ')
}

export function paintPathColors(path: PaintPath) {
  const filled = path.kind === 'polygon' && canFinishPaintPath(path)
  return {
    fill: filled && path.style !== 'outline' ? (path.style === 'solid' ? path.color : path.background) : 'none',
    stroke: filled && path.style === 'solid' ? 'none' : path.color,
  }
}

export function sprayPaint(target: CanvasRenderingContext2D, point: PaintPoint, radius: number, color: string) {
  target.fillStyle = color
  for (let dot = 0; dot < radius * 2; dot += 1) {
    const angle = Math.random() * 2 * Math.PI
    const distance = radius * Math.sqrt(Math.random())
    const x = Math.round(point.x + Math.cos(angle) * distance)
    const y = Math.round(point.y + Math.sin(angle) * distance)
    target.fillRect(x, y, 1, 1)
  }
}
