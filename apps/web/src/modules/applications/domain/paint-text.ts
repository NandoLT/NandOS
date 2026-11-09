import type { PaintRegion } from './paint-selection'

export const paintTextFonts = [['sans-serif', 'Sans Serif'], ['serif', 'Serif'], ['monospace', 'Monoespaciada']] as const
export type PaintTextStyle = { family: string; size: number; bold: boolean; italic: boolean }
export const defaultPaintTextStyle: PaintTextStyle = { family: 'sans-serif', size: 16, bold: false, italic: false }

export function paintTextStyle(style: PaintTextStyle, zoom = 1, withLineHeight = true) {
  const { family, size, bold, italic } = style
  return `${italic ? 'italic' : 'normal'} ${bold ? 'bold' : 'normal'} ${size * zoom}px${withLineHeight ? '/' + Math.ceil(size * 1.25) * zoom + 'px' : ''} ${family}`
}

export function drawPaintText(target: CanvasRenderingContext2D, box: PaintRegion, text: string,
  style: PaintTextStyle, color: string, background?: string) {
  const { x, y, width, height } = box
  target.save()
  const path = new Path2D()
  path.rect(x, y, width, height)
  target.clip(path)
  if (background) {
    target.fillStyle = background
    target.fillRect(x, y, width, height)
  }
  target.font = paintTextStyle(style, 1, false)
  target.textBaseline = 'top'
  target.fillStyle = color
  const lineHeight = Math.ceil(style.size * 1.25)
  text.split('\n').slice(0, Math.ceil(height / lineHeight)).forEach((line, index) =>
    target.fillText(line.replaceAll('\t', '        '), x + 2, y + 2 + index * lineHeight))
  target.restore()
}
