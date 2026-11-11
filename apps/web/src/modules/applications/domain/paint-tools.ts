export const paintTools = [
  ['free-select', 'Selección libre'], ['select', 'Selección rectangular'],
  ['eraser', 'Goma'], ['fill', 'Relleno'],
  ['picker', 'Cuentagotas'], ['zoom', 'Lupa'],
  ['pencil', 'Lápiz'], ['brush', 'Pincel'],
  ['spray', 'Aerógrafo'], ['text', 'Texto'],
  ['line', 'Línea'], ['curve', 'Curva'],
  ['rectangle', 'Rectángulo'], ['polygon', 'Polígono'],
  ['ellipse', 'Elipse'], ['rounded', 'Rectángulo redondeado'],
] as const

export type PaintTool = typeof paintTools[number][0]
export type BrushTip = 'round' | 'square' | 'forward' | 'backward'
export type ShapeStyle = 'outline' | 'both' | 'solid'

export const paintZoomLevels = [.25, .5, 1, 2, 6, 8]
export const hasShapeStyle = (tool: PaintTool) => tool === 'rectangle' || tool === 'ellipse' || tool === 'rounded'

export const isSelectionTool = (tool: PaintTool) => tool === 'select' || tool === 'free-select'

export const sprayRadii = [4, 8, 12] as const
