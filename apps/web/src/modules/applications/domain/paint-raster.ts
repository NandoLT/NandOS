export type PaintPoint = { x: number; y: number }
export const MAX_PAINT_SIDE = 1024

export function traceLine(from: PaintPoint, to: PaintPoint, stamp: (x: number, y: number) => void) {
  let { x, y } = from
  const dx = Math.abs(to.x - x), dy = -Math.abs(to.y - y)
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1
  let error = dx + dy
  for (;;) {
    stamp(x, y)
    if (x === to.x && y === to.y) return
    const doubled = 2 * error
    if (doubled >= dy) { error += dy; x += sx }
    if (doubled <= dx) { error += dx; y += sy }
  }
}

export function floodFill({ width, height, data }: ImageData, { x, y }: PaintPoint, color: number[]) {
  const start = y * width + x
  const target = data.slice(start * 4, start * 4 + 4)
  if (x < 0 || x >= width || y < 0 || y >= height || target.every((value, i) => value === color[i])) return false
  const stack = new Uint32Array(width * height)
  let count = 0
  const visit = (index: number) => {
    const offset = index * 4
    if (data[offset] !== target[0] || data[offset + 1] !== target[1] ||
      data[offset + 2] !== target[2] || data[offset + 3] !== target[3]) return
    data.set(color, offset)
    stack[count++] = index
  }
  visit(start)
  while (count) {
    const index = stack[--count]
    const col = index % width
    if (col > 0) visit(index - 1)
    if (col < width - 1) visit(index + 1)
    if (index >= width) visit(index - width)
    if (index < width * (height - 1)) visit(index + width)
  }
  return true
}
