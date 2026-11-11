import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import type { AppMenu } from '../../../shared/ui/AppMenuBar'
import { useShellStore } from '../../shell/application/shell.store'
import { createExplorerTree, DOCUMENTS_DIRECTORY } from '../domain/explorer'
import type { PaintImage } from '../domain/explorer'
import { floodFill, MAX_PAINT_SIDE, traceLine } from '../domain/paint-raster'
import type { PaintPoint } from '../domain/paint-raster'
import { canvasPng, loadPaintBlob, readPngSize } from '../infrastructure/paint-storage'
import { hasShapeStyle, isSelectionTool, paintTools, paintZoomLevels } from '../domain/paint-tools'
import type { BrushTip, PaintTool, ShapeStyle } from '../domain/paint-tools'
import { eraseRegion, hasEnclosedArea, liftRegion, paintRegion, placeRegion, regionPath } from '../domain/paint-selection'
import type { PaintClipboard, PaintRegion } from '../domain/paint-selection'
import { defaultPaintTextStyle, drawPaintText } from '../domain/paint-text'
import { canFinishPaintPath, paintPathColors, paintPathData, samePaintPoint, sprayPaint } from '../domain/paint-path'
import type { PaintPath } from '../domain/paint-path'
import { PaintToolbox } from './PaintToolbox'
import { PaintTextEditor, PaintTextToolbar } from './PaintTextEditor'

const Panel = styled.section`
  position: relative; height: 100%; min-width: 0; display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  background: var(--os-toolbar); color: var(--os-window-text); font-size: 12px;
`
const Workspace = styled.div`
  min-height: 0; display: grid; grid-template-columns: auto minmax(0, 1fr);
  > :last-child { grid-column: 2; }
`
const Button = styled.button`
  color: var(--os-window-text); background: var(--os-window);
  border: var(--os-raised-border); cursor: pointer;
  &[aria-pressed='true'], &:active:not(:disabled) { border: var(--os-inset-border); background: var(--os-surface-alt); }
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -4px; }
  &:disabled { opacity: .55; cursor: default; }
`
const Viewport = styled.div`
  min-height: 0; min-width: 0; margin: 3px 4px 3px 0;
  overflow: auto; overscroll-behavior: contain; border: var(--os-inset-border);
  background: var(--os-surface-alt);
  canvas {
    display: block; image-rendering: pixelated; touch-action: none; cursor: crosshair;
    background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;
    &:focus-visible { outline: 2px solid var(--os-focus-ring, #000080); outline-offset: -2px; }
  }
`
const CanvasSurface = styled.div`
  position: relative; width: max-content; overflow: hidden;
  > .selection-outline, > .path-preview { position: absolute; inset: 0; pointer-events: none; }
  > .pixel-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(to right, #80808066 1px, transparent 1px),
      linear-gradient(to bottom, #80808066 1px, transparent 1px);
  }
`
const Palette = styled.div`
  grid-row: 3;
  display: flex; align-items: center; gap: 6px; padding: 4px; border-block: var(--os-raised-border);
  .active { display: flex; gap: 2px; }
  .active button { width: 22px; height: 22px; min-height: 0; padding: 3px; }
  .active span { display: block; width: 100%; height: 100%; border: 1px solid #444; }
  .swatches { display: grid; grid-template-columns: repeat(14, 16px); gap: 1px; }
  .swatches button { width: 16px; height: 16px; min-height: 0; padding: 0; }
  @media (max-width: 420px) { .swatches { grid-template-columns: repeat(7, 24px); } .swatches button { width: 24px; height: 24px; } }
`
const Status = styled.footer`
  &[hidden] { display: none; }
  grid-row: 4;
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 8px;
  min-height: 23px; padding: 4px 6px; border: var(--os-inset-border);
`
const Overlay = styled.div`
  position: absolute; inset: 0; z-index: 4; display: grid; place-items: center; background: var(--os-overlay);
  form { display: grid; gap: 8px; width: min(90%, 320px); padding: 12px; border: var(--os-raised-border); background: var(--os-window); }
  label { display: grid; gap: 4px; }
  input, select { min-width: 0; width: 100%; padding: 5px; }
  button { padding: 5px 8px; }
`

const swatches = ['000000','808080','800000','808000','008000','008080','000080','800080','808040','004040','0080ff','004080','8000ff','804000',
  'ffffff','c0c0c0','ff0000','ffff00','00ff00','00ffff','0000ff','ff00ff','ffff80','00ff80','80ffff','8080ff','ff0080','ff8040']
type Snapshot = { pixels: ImageData; revision: number }
type Stroke = {
  pointer: number; start: PaintPoint; last: PaintPoint; before: Snapshot
  tool: PaintTool; color: string; background: string; size: number; tip: BrushTip; style: ShapeStyle
}
type PathGesture = { pointer: number; start: PaintPoint; base: PaintPath }

type RegionGesture =
  | { kind: 'outline'; pointer: number; start: PaintPoint; freehand?: PaintPoint[] }
  | { kind: 'move'; pointer: number; start: PaintPoint; region: PaintRegion; moved: PaintRegion
      before: Snapshot; pixels: PaintClipboard }

function SelectionOutline({ region, width, height, zoom }: {
  region: PaintRegion; width: number; height: number; zoom: number
}) {
  const points = region.path?.map(({ x, y }) => (region.x + x) + ',' + (region.y + y)).join(' ')
  const outline = points
    ? <polygon points={points} vectorEffect="non-scaling-stroke" />
    : <rect x={region.x + .5} y={region.y + .5} width={Math.max(.5, region.width - 1)} height={Math.max(.5, region.height - 1)} vectorEffect="non-scaling-stroke" />
  return <svg aria-hidden="true" className="selection-outline" width={width * zoom} height={height * zoom}
    viewBox={'0 0 ' + width + ' ' + height} fill="none" shapeRendering="crispEdges">
    <g stroke="white">{outline}</g>
    <g stroke="black" strokeDasharray="3 3">{outline}</g>
  </svg>
}

const isShape = (tool: PaintTool) => tool === 'line' || hasShapeStyle(tool)

function draw(ctx: CanvasRenderingContext2D, from: PaintPoint, to: PaintPoint, stroke: Stroke) {
  const { tool, color, background, size, tip, style } = stroke
  if (!hasShapeStyle(tool)) {
    ctx.fillStyle = color
    const offset = Math.floor(size / 2)
    traceLine(from, to, (x, y) => {
      if (tool !== 'brush' || tip === 'square') {
        ctx.fillRect(x - offset, y - offset, size, size)
      } else if (tip === 'round') {
        const radius = size / 2
        for (let row = 0; row < size; row += 1) {
          const span = Math.sqrt(radius ** 2 - (row + .5 - radius) ** 2)
          const left = Math.ceil(radius - .5 - span)
          ctx.fillRect(x - offset + left, y + row - offset, size - left * 2, 1)
        }
      } else {
        const step = tip === 'forward' ? -1 : 1
        for (let col = -offset; col < size - offset; col += 1) ctx.fillRect(x + col, y + step * col, 1, 1)
      }
    })
    return
  }
  const x = Math.min(from.x, to.x) + .5, y = Math.min(from.y, to.y) + .5
  const w = Math.max(1, Math.abs(from.x - to.x)), h = Math.max(1, Math.abs(from.y - to.y))
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = size
  if (tool === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  else if (tool === 'rounded') ctx.roundRect(x, y, w, h, Math.min(12, w / 2, h / 2))
  else ctx.rect(x, y, w, h)
  if (style !== 'outline') {
    ctx.fillStyle = style === 'solid' ? color : background
    ctx.fill()
  }
  if (style !== 'solid') ctx.stroke()
}

export function PaintWindow({ initial, dirty, clipboard, onCopy, onDirty, onNew, onBrowse }: {
  initial: PaintImage | null; dirty: boolean; clipboard: PaintClipboard | null;
  onCopy: (clipboard: PaintClipboard) => void; onDirty: (dirty: boolean) => void; onNew: () => void; onBrowse: (folder: string) => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const files = useShellStore((state) => state.fileNodes)
  const tree = useMemo(() => createExplorerTree(folders, files), [folders, files])
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const magnification = useRef(2)
  const stroke = useRef<Stroke | null>(null)
  const sprayTimer = useRef<number | null>(null)
  const pathGesture = useRef<PathGesture | null>(null)
  const pathDraft = useRef<PaintPath | null>(null)
  const regionGesture = useRef<RegionGesture | null>(null)
  const history = useRef({ undo: [] as Snapshot[], redo: [] as Snapshot[], revision: 0, next: 0, saved: 0 })
  const operation = useRef(false)
  const [saved, setSaved] = useState(initial)
  const [dimensions, setDimensions] = useState({ width: initial?.width ?? 640, height: initial?.height ?? 480 })
  const [ready, setReady] = useState(!initial)
  const [tool, setTool] = useState<PaintTool>('pencil')
  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#ffffff')
  const [secondary, setSecondary] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [brush, setBrush] = useState<{ tip: BrushTip; size: number }>({ tip: 'round', size: 5 })
  const [eraser, setEraser] = useState(4)
  const [sprayRadius, setSprayRadius] = useState(8)
  const [pathPreview, setPathPreview] = useState<PaintPath | null>(null)
  const [pathHover, setPathHover] = useState<PaintPoint>()
  const [lineWidth, setLineWidth] = useState(1)
  const [selection, setSelection] = useState<PaintRegion | null>(null)
  const [outline, setOutline] = useState<PaintRegion | null>(null)
  const [textBox, setTextBox] = useState<{ box: PaintRegion; text: string } | null>(null)
  const [textStyle, setTextStyle] = useState(defaultPaintTextStyle)
  const [transparentSelection, setTransparentSelection] = useState(false)
  const [transparentText, setTransparentText] = useState(true)
  const [shape, setShape] = useState<ShapeStyle>('outline')
  const [chrome, setChrome] = useState({ toolbox: true, palette: true, status: true, grid: false })
  const [dialog, setDialog] = useState<'help' | 'attributes' | 'color' | 'zoom' | null>(null)
  const [counts, setCounts] = useState({ undo: 0, redo: 0 })
  const [position, setPosition] = useState<PaintPoint | null>(null)
  const [form, setForm] = useState<{ name: string; parent: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const available = ready && !busy
  const ctx = () => canvas.current?.getContext('2d', { willReadFrequently: true })

  useEffect(() => {
    const element = canvas.current
    const target = element?.getContext('2d', { willReadFrequently: true })
    if (!element || !target) return
    element.width = initial?.width ?? 640
    element.height = initial?.height ?? 480
    if (!initial) {
      target.fillStyle = '#fff'
      target.fillRect(0, 0, element.width, element.height)
      return
    }
    let live = true
    void (async () => {
      try {
        const png = await loadPaintBlob(initial.blobId)
        if (!png) throw new Error('No se encuentra el PNG de este dibujo.')
        const bitmap = await createImageBitmap(png)
        try {
          if (!live) return
          target.drawImage(bitmap, 0, 0)
          setReady(true)
        } finally { bitmap.close() }
      } catch (reason) {
        if (live) setError(reason instanceof Error ? reason.message : 'No se pudo abrir el dibujo.')
      }
    })()
    return () => { live = false }
  }, [initial])

  useEffect(() => () => {
    if (sprayTimer.current !== null) window.clearInterval(sprayTimer.current)
  }, [])

  const gestureInProgress = () => stroke.current || regionGesture.current || pathGesture.current

  const report = (pendingText = false) => {
    const state = history.current
    setCounts((current) => current.undo === state.undo.length && current.redo === state.redo.length ? current :
      { undo: state.undo.length, redo: state.redo.length })
    onDirty(pendingText || pathDraft.current !== null || state.saved !== state.revision)
  }
  const snapshot = (target: CanvasRenderingContext2D): Snapshot => ({
    pixels: target.getImageData(0, 0, target.canvas.width, target.canvas.height), revision: history.current.revision,
  })
  const record = (before: Snapshot) => {
    const state = history.current
    state.undo.push(before)
    state.redo = []
    let bytes = state.undo.reduce((total, item) => total + item.pixels.data.byteLength, 0)
    while (state.undo.length > 20 || bytes > 24 * 1024 * 1024) bytes -= state.undo.shift()!.pixels.data.byteLength
    state.revision = ++state.next
    report()
  }
  const closeText = (apply: boolean) => {
    if (!textBox) return
    const target = ctx()
    if (apply && target && textBox.text.trim()) {
      const before = snapshot(target)
      drawPaintText(target, textBox.box, textBox.text, textStyle, fg, transparentText ? undefined : bg)
      record(before)
    } else report()
    setTextBox(null)
  }
  const closePath = (apply: boolean) => {
    const path = pathDraft.current
    if (!path && !pathGesture.current) return
    pathDraft.current = null
    pathGesture.current = null
    setPathPreview(null)
    setPathHover(undefined)
    if (!path) return
    const target = ctx()
    if (apply && target && canFinishPaintPath(path)) {
      const before = snapshot(target)
      const shape = new Path2D(paintPathData(path))
      const { fill, stroke } = paintPathColors(path)
      if (fill !== 'none') {
        target.fillStyle = fill
        target.fill(shape)
      }
      if (stroke !== 'none') {
        target.save()
        target.strokeStyle = stroke
        target.lineWidth = path.width
        target.lineJoin = 'round'
        target.lineCap = 'round'
        target.stroke(shape)
        target.restore()
      }
      record(before)
    } else report()
    setStatus('')
  }
  const changeTool = (value: PaintTool) => {
    if (gestureInProgress()) return
    if (value !== tool) {
      closeText(true)
      closePath(true)
      if (!isSelectionTool(value)) setSelection(null)
      setTool(value)
    }
    setStatus('')
  }
  const selectAll = () => {
    if (!available || gestureInProgress()) return
    changeTool('select')
    setSelection({ x: 0, y: 0, ...dimensions })
  }
  const editSelection = (action: 'copy' | 'cut' | 'delete') => {
    const target = ctx()
    if (!available || !selection || !target || regionGesture.current) return
    if (action !== 'delete') {
      onCopy(liftRegion(target, selection, transparentSelection ? bg : undefined))
      setStatus(action === 'cut' ? 'Selección cortada.' : 'Selección copiada al portapapeles de Paint.')
    }
    if (action !== 'copy') {
      const before = snapshot(target)
      eraseRegion(target, selection, bg)
      setSelection(null)
      record(before)
    }
  }
  const pasteSelection = () => {
    const target = ctx()
    const clip = clipboard
    if (!available || !target || !clip || gestureInProgress()) return
    changeTool('select')
    const before = snapshot(target)
    const region = placeRegion({
      x: 0, y: 0, width: Math.min(clip.bitmap.width, dimensions.width),
      height: Math.min(clip.bitmap.height, dimensions.height), path: clip.path,
    }, selection ? { x: selection.x + 8, y: selection.y + 8 } : { x: 0, y: 0 }, dimensions)
    target.drawImage(clip.bitmap, region.x, region.y)
    setSelection(region)
    record(before)
  }
  const step = (direction: 'undo' | 'redo') => {
    const target = ctx()
    if (!available || !target || gestureInProgress()) return
    if (pathDraft.current) {
      if (direction === 'undo') closePath(false)
      return
    }
    if (textBox?.text.trim()) {
      if (direction === 'undo') closeText(false)
      return
    }
    closeText(false)
    const state = history.current
    const previous = state[direction].pop()
    if (!previous) return
    state[direction === 'undo' ? 'redo' : 'undo'].push(snapshot(target))
    const { width, height } = previous.pixels
    if (target.canvas.width !== width || target.canvas.height !== height) {
      target.canvas.width = width
      target.canvas.height = height
      setDimensions({ width, height })
    }
    setSelection(null)
    target.putImageData(previous.pixels, 0, 0)
    state.revision = previous.revision
    report()
  }
  const chooseColor = (hex: string, alternate = secondary) => alternate ? setBg(hex) : setFg(hex)
  const changeZoom = (value: number) => {
    if (value > 1) magnification.current = value
    setZoom(value)
  }
  const toggleChrome = (key: keyof typeof chrome) => setChrome((current) => ({ ...current, [key]: !current[key] }))
  const coords = (event: PointerEvent<HTMLCanvasElement>) => {
    const { width, height } = event.currentTarget
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(width - 1, Math.floor((event.clientX - rect.left) * width / rect.width))),
      y: Math.max(0, Math.min(height - 1, Math.floor((event.clientY - rect.top) * height / rect.height))),
    }
  }
  const beginRegion = (event: PointerEvent<HTMLCanvasElement>, target: CanvasRenderingContext2D, start: PaintPoint) => {
    const pointer = event.pointerId
    event.currentTarget.setPointerCapture(pointer)
    if (isSelectionTool(tool) && selection && target.isPointInPath(regionPath(selection), start.x + .5, start.y + .5, 'evenodd')) {
      regionGesture.current = { kind: 'move', pointer, start, region: selection, moved: selection,
        before: snapshot(target), pixels: liftRegion(target, selection, transparentSelection ? bg : undefined) }
      return
    }
    setSelection(null)
    regionGesture.current = { kind: 'outline', pointer, start, freehand: tool === 'free-select' ? [start] : undefined }
  }
  const updateRegion = (gesture: RegionGesture, next: PaintPoint, target: CanvasRenderingContext2D) => {
    if (gesture.kind === 'outline') {
      const last = gesture.freehand?.at(-1)
      if (last && (last.x !== next.x || last.y !== next.y)) gesture.freehand?.push(next)
      setOutline(paintRegion(gesture.start, next, gesture.freehand))
      return
    }
    const { region, start, moved } = gesture
    const destination = placeRegion(region, { x: region.x + next.x - start.x, y: region.y + next.y - start.y }, dimensions)
    if (destination.x === moved.x && destination.y === moved.y) return
    gesture.moved = destination
    target.putImageData(gesture.before.pixels, 0, 0)
    if (destination.x !== region.x || destination.y !== region.y) {
      eraseRegion(target, region, bg)
      target.drawImage(gesture.pixels.bitmap, destination.x, destination.y)
    }
    setSelection(destination)
  }
  const finishRegion = (gesture: RegionGesture, target: CanvasRenderingContext2D, next: PaintPoint, cancelled: boolean) => {
    if (!cancelled) updateRegion(gesture, next, target)
    regionGesture.current = null
    setOutline(null)
    if (gesture.kind === 'move') {
      if (cancelled) {
        target.putImageData(gesture.before.pixels, 0, 0)
        setSelection(gesture.region)
      } else if (gesture.moved.x !== gesture.region.x || gesture.moved.y !== gesture.region.y) {
        record(gesture.before)
      }
      return
    }
    if (cancelled) return
    const region = paintRegion(gesture.start, next, gesture.freehand)
    if (tool === 'text') {
      const click = region.width === 1 && region.height === 1
      const box = {
        ...region, width: Math.min(dimensions.width, click ? 240 : Math.max(38, region.width)),
        height: Math.min(dimensions.height, click ? 90 : Math.max(28, region.height)),
      }
      setTextBox({ box: placeRegion(box, region, dimensions), text: '' })
    } else if (gesture.freehand ? hasEnclosedArea(gesture.freehand) : region.width > 1 || region.height > 1) {
      setSelection(region)
    }
  }
  const pathAt = ({ start, base }: PathGesture, point: PaintPoint): PaintPath => {
    if (base.kind === 'curve') {
      return pathDraft.current ? { ...base, controls: [...base.controls, point] } : { ...base, end: point }
    }
    const vertices = base.vertices
    if (vertices.length === 0) return { ...base, vertices: samePaintPoint(start, point) ? [start] : [start, point] }
    if (samePaintPoint(vertices[vertices.length - 1], point)) return base
    return { ...base, vertices: [...vertices, point] }
  }
  const beginPath = (event: PointerEvent<HTMLCanvasElement>, start: PaintPoint, color: string, background: string) => {
    const style = { color, background, width: lineWidth, style: shape }
    const base = pathDraft.current ?? (tool === 'curve'
      ? { ...style, kind: 'curve', start, end: start, controls: [] }
      : { ...style, kind: 'polygon', vertices: [] })
    event.currentTarget.setPointerCapture(event.pointerId)
    pathGesture.current = { pointer: event.pointerId, start, base }
    setPathHover(undefined)
    setPathPreview(pathAt(pathGesture.current, start))
  }
  const finishPath = (gesture: PathGesture, point: PaintPoint, cancelled: boolean) => {
    pathGesture.current = null
    if (cancelled) {
      setPathPreview(pathDraft.current)
      return
    }
    const next = pathAt(gesture, point)
    if (next.kind === 'curve' && !canFinishPaintPath(next)) {
      setPathPreview(null)
      return
    }
    if (gesture.base.kind === 'polygon' && gesture.base.vertices.length >= 3) {
      const first = gesture.base.vertices[0]
      if (Math.hypot(first.x - point.x, first.y - point.y) * zoom <= 5) {
        closePath(true)
        return
      }
    }
    pathDraft.current = next
    if (next.kind === 'curve' && next.controls.length === 2) {
      closePath(true)
      return
    }
    setPathPreview(next)
    report()
    setStatus(next.kind === 'polygon' ? 'Añade vértices. Cierra con doble clic, en el primer vértice o con Intro.'
      : next.controls.length ? 'Arrastra para ajustar la segunda curvatura.' : 'Arrastra para ajustar la primera curvatura.')
  }
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!available || form || dialog || gestureInProgress() || (event.button !== 0 && event.button !== 2)) return
    const target = ctx()
    if (!target) return
    event.currentTarget.focus({ preventScroll: true })
    const start = coords(event)
    setPosition(start)
    if (isSelectionTool(tool) || tool === 'text') {
      if (event.button !== 0) return
      if (textBox) { closeText(true); return }
      beginRegion(event, target, start)
      return
    }
    const alternate = event.button === 2 || (event.pointerType !== 'mouse' && secondary)
    const color = tool === 'eraser' || alternate ? bg : fg
    if (tool === 'curve' || tool === 'polygon') {
      beginPath(event, start, color, alternate ? fg : bg)
      return
    }
    if (tool === 'zoom') { changeZoom(zoom === 1 ? magnification.current : 1); return }
    if (tool === 'picker') {
      const [r,g,b] = target.getImageData(start.x, start.y, 1, 1).data
      chooseColor('#' + [r,g,b].map((channel) => channel.toString(16).padStart(2, '0')).join(''), alternate)
      return
    }
    const before = snapshot(target)
    if (tool === 'fill') {
      const pixels = target.getImageData(0, 0, target.canvas.width, target.canvas.height)
      const channels = [1,3,5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16))
      if (floodFill(pixels, start, [...channels, 255])) { target.putImageData(pixels, 0, 0); record(before) }
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const size = tool === 'spray' ? sprayRadius : tool === 'pencil' ? 1 : tool === 'brush' ? brush.size : tool === 'eraser' ? eraser : lineWidth
    const gesture = { pointer: event.pointerId, start, last: start, before, tool, color, size,
      tip: brush.tip, style: shape, background: alternate ? fg : bg }
    stroke.current = gesture
    if (tool === 'spray') {
      sprayPaint(target, start, size, color)
      sprayTimer.current = window.setInterval(() => sprayPaint(target, gesture.last, size, color), 45)
    } else draw(target, start, start, gesture)
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const next = coords(event)
    setPosition((previous) => previous?.x === next.x && previous.y === next.y ? previous : next)
    const path = pathGesture.current
    if (path?.pointer === event.pointerId) {
      setPathPreview(pathAt(path, next))
      return
    }
    if (!path && pathDraft.current?.kind === 'polygon' && event.pointerType === 'mouse') setPathHover(next)
    const gesture = stroke.current
    const target = ctx()
    const region = regionGesture.current
    if (region?.pointer === event.pointerId && target) {
      updateRegion(region, next, target)
      return
    }
    if (!gesture || gesture.pointer !== event.pointerId || !target) return
    if (gesture.tool === 'spray') {
      if (!samePaintPoint(gesture.last, next)) {
        const spacing = Math.max(1, Math.floor(gesture.size / 3))
        let distance = 0
        traceLine(gesture.last, next, (x, y) => {
          if (++distance % spacing === 0) sprayPaint(target, { x, y }, gesture.size, gesture.color)
        })
        sprayPaint(target, next, gesture.size, gesture.color)
      }
      gesture.last = next
      return
    }
    if (isShape(gesture.tool)) target.putImageData(gesture.before.pixels, 0, 0)
    draw(target, isShape(gesture.tool) ? gesture.start : gesture.last, next, gesture)
    gesture.last = next
  }
  const finish = (event: PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const path = pathGesture.current
    if (path?.pointer === event.pointerId) {
      finishPath(path, coords(event), cancelled)
      return
    }
    const region = regionGesture.current
    const target = ctx()
    if (region?.pointer === event.pointerId && target) {
      finishRegion(region, target, coords(event), cancelled)
      return
    }
    const gesture = stroke.current
    if (!gesture || gesture.pointer !== event.pointerId) return
    if (!cancelled) pointerMove(event)
    stroke.current = null
    if (sprayTimer.current !== null) {
      window.clearInterval(sprayTimer.current)
      sprayTimer.current = null
    }
    if (cancelled) ctx()?.putImageData(gesture.before.pixels, 0, 0)
    else record(gesture.before)
  }
  const perform = async (task: () => Promise<void>) => {
    if (operation.current || gestureInProgress()) return
    operation.current = true
    setBusy(true); setStatus(''); setError('')
    try { await task() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la operación.') }
    finally { operation.current = false; setBusy(false) }
  }
  const saveAs = () => {
    if (gestureInProgress()) return
    closeText(true)
    closePath(true)
    setError('')
    setForm({ name: saved?.name.replace(/\.png$/iu, '') ?? 'Sin título',
      parent: saved && tree.writable(saved.parentId) ? saved.parentId : DOCUMENTS_DIRECTORY })
  }
  const saveTo = (name: string, parentId: string, id?: string) => void perform(async () => {
    closeText(true)
    closePath(true)
    const png = await canvasPng(canvas.current!)
    setSaved(await useShellStore.getState().savePaintImage({ name, parentId, ...dimensions, png }, id))
    history.current.saved = history.current.revision
    report()
    setForm(null)
    setStatus('Dibujo guardado en este navegador.')
  })
  const save = () => saved ? saveTo(saved.name, saved.parentId, saved.id) : saveAs()
  const exportPng = () => void perform(async () => {
    closeText(true)
    closePath(true)
    const url = URL.createObjectURL(await canvasPng(canvas.current!))
    const link = document.createElement('a')
    link.href = url
    link.download = saved?.name ?? 'Dibujo.png'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('PNG preparado para descargar.')
  })
  const importPng = (file: File) => void perform(async () => {
    if (dirty && !window.confirm('Paint tiene cambios sin guardar. ¿Quieres reemplazar el lienzo?')) return
    const dimensions = await readPngSize(file)
    const bitmap = await createImageBitmap(file)
    try {
      const target = ctx()
      if (!target || bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) throw new Error('El archivo PNG no es válido.')
      closePath(false)
      target.canvas.width = bitmap.width
      target.canvas.height = bitmap.height
      target.drawImage(bitmap, 0, 0)
      setDimensions(dimensions)
      setSelection(null)
      setTextBox(null)
      history.current = { undo: [], redo: [], revision: 1, next: 1, saved: 0 }
      report()
      setReady(true); setZoom(1); setSaved(null); setStatus('PNG abierto.')
    } finally { bitmap.close() }
  })
  const clear = (transparent: boolean) => {
    const target = ctx()
    if (!target || gestureInProgress()) return
    closeText(true)
    closePath(true)
    setSelection(null)
    const before = snapshot(target)
    target.clearRect(0, 0, dimensions.width, dimensions.height)
    if (!transparent) {
      target.fillStyle = bg
      target.fillRect(0, 0, dimensions.width, dimensions.height)
    }
    record(before)
  }

  const invert = () => {
    const target = ctx()
    if (!available || !target || gestureInProgress()) return
    closeText(true)
    closePath(true)
    setSelection(null)
    const before = snapshot(target)
    const image = target.getImageData(0, 0, dimensions.width, dimensions.height)
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = 255 - image.data[i]
      image.data[i + 1] = 255 - image.data[i + 1]
      image.data[i + 2] = 255 - image.data[i + 2]
    }
    target.putImageData(image, 0, 0)
    record(before)
  }

  const resize = (width: number, height: number) => {
    const target = ctx()
    if (!available || !target || gestureInProgress() || ![width, height].every((side) =>
      Number.isInteger(side) && side >= 1 && side <= MAX_PAINT_SIDE)) return
    if (width !== dimensions.width || height !== dimensions.height) {
      closeText(true)
      closePath(true)
      setSelection(null)
      const before = snapshot(target)
      target.canvas.width = width
      target.canvas.height = height
      target.fillStyle = bg
      target.fillRect(0, 0, width, height)
      target.putImageData(before.pixels, 0, 0)
      setDimensions({ width, height })
      setPosition(null)
      record(before)
    }
    setDialog(null)
  }

  const menus: AppMenu[] = [
    { name: 'Archivo', commands: [
      { label: 'Nuevo', run: onNew, disabled: busy },
      { label: 'Abrir desde el Explorador…', run: () => onBrowse(saved?.parentId ?? DOCUMENTS_DIRECTORY), disabled: busy },
      { label: 'Abrir PNG del equipo…', run: () => fileInput.current?.click(), disabled: busy },
      { label: 'Guardar', run: save, disabled: !available },
      { label: 'Guardar como…', run: saveAs, disabled: !available },
      { label: 'Exportar PNG…', run: exportPng, disabled: !available },
    ] },
    { name: 'Edición', commands: [
      { label: 'Deshacer', run: () => step('undo'), disabled: !available || (!counts.undo && !pathPreview && !textBox?.text.trim()) },
      { label: 'Rehacer', run: () => step('redo'), disabled: !available || !counts.redo || Boolean(pathPreview || textBox?.text.trim()) },
      { label: 'Cortar', run: () => editSelection('cut'), disabled: !available || !selection },
      { label: 'Copiar', run: () => editSelection('copy'), disabled: !available || !selection },
      { label: 'Pegar', run: pasteSelection, disabled: !available || !clipboard },
      { label: 'Eliminar selección', run: () => editSelection('delete'), disabled: !available || !selection },
      { label: 'Seleccionar todo', run: selectAll, disabled: !available },
    ] },
    { name: 'Ver', commands: [
      { label: 'Caja de herramientas', run: () => toggleChrome('toolbox'), pressed: chrome.toolbox },
      { label: 'Cuadro de colores', run: () => toggleChrome('palette'), pressed: chrome.palette },
      { label: 'Barra de estado', run: () => toggleChrome('status'), pressed: chrome.status },
      { label: 'Zoom…', run: () => setDialog('zoom') },
      { label: 'Mostrar cuadrícula', run: () => toggleChrome('grid'), pressed: chrome.grid, disabled: zoom < 6 },
    ] },
    { name: 'Imagen', commands: [
      { label: 'Invertir colores', run: invert, disabled: !available },
      { label: 'Atributos…', run: () => setDialog('attributes'), disabled: !available },
      { label: 'Borrar imagen', run: () => clear(false), disabled: !available },
      { label: 'Borrar a transparente', run: () => clear(true), disabled: !available },
    ] },
    { name: 'Opciones', commands: [
      { label: 'Editar colores…', run: () => setDialog('color') },
    ] },
    { name: 'Ayuda', commands: [{ label: 'Temas de ayuda', run: () => setDialog('help') }] },
  ]

  const activeOutline = outline ?? selection
  return <Panel aria-label="Editor Paint" onKeyDown={(event) => {
    if (event.key === 'Escape' && (form || dialog)) {
      event.preventDefault(); event.stopPropagation(); setForm(null); setDialog(null); return
    }
    if (form || dialog || !available) return
    if (event.key === 'Escape' && pathPreview) {
      event.preventDefault()
      event.stopPropagation()
      closePath(false)
      return
    }
    if (gestureInProgress()) return
    if (event.key === 'Enter' && event.target === canvas.current && pathDraft.current) {
      event.preventDefault()
      if (canFinishPaintPath(pathDraft.current)) closePath(true)
      return
    }
    if (event.key === 'Escape' && (textBox || selection)) {
      event.preventDefault(); event.stopPropagation(); closeText(false); setSelection(null); canvas.current?.focus(); return
    }
    const key = event.key.toLowerCase()
    const modified = event.ctrlKey || event.metaKey
    if (modified && key === 's') { event.preventDefault(); save(); return }
    if (event.target instanceof HTMLTextAreaElement) {
      if (modified && key === 'enter') { event.preventDefault(); closeText(true); canvas.current?.focus() }
      return
    }
    if (key === 'delete' && selection) { event.preventDefault(); editSelection('delete'); return }
    if (!modified) return
    if (key === 'z' || key === 'y') { event.preventDefault(); step(key === 'y' || event.shiftKey ? 'redo' : 'undo') }
    if (key === 'a') { event.preventDefault(); selectAll() }
    if (key === 'c' && selection) { event.preventDefault(); editSelection('copy') }
    if (key === 'x' && selection) { event.preventDefault(); editSelection('cut') }
    if (key === 'v' && clipboard) { event.preventDefault(); pasteSelection() }
  }}>
    <div>
      <AppMenuBar label="Menús de Paint" menus={menus} />
      {textBox && <PaintTextToolbar style={textStyle} onStyle={setTextStyle}
        onApply={() => { closeText(true); canvas.current?.focus() }}
        onCancel={() => { closeText(false); canvas.current?.focus() }} />}
    </div>
    <Workspace>
      {chrome.toolbox && <PaintToolbox tool={tool} available={available}
        onTool={changeTool} zoom={zoom} onZoom={changeZoom}
        eraser={eraser} onEraser={setEraser} brush={brush} onBrush={setBrush}
        sprayRadius={sprayRadius} onSprayRadius={setSprayRadius}
        width={lineWidth} onWidth={setLineWidth} shape={shape} onShape={setShape}
        transparent={tool === 'text' ? transparentText : transparentSelection}
        onTransparency={tool === 'text' ? setTransparentText : setTransparentSelection} />}
      <Viewport aria-label="Área de dibujo">
        <CanvasSurface>
          <canvas ref={canvas} tabIndex={0} aria-label="Lienzo de dibujo" style={{ width: dimensions.width * zoom, height: dimensions.height * zoom }}
            onContextMenu={(event) => event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerLeave={() => setPathHover(undefined)}
            onDoubleClick={() => {
              const path = pathDraft.current
              if (path?.kind === 'polygon') closePath(canFinishPaintPath(path))
            }}
            onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
            onLostPointerCapture={(event) => finish(event, true)} />
          {chrome.grid && zoom >= 6 && <div className="pixel-grid" aria-hidden="true" style={{ backgroundSize: zoom + 'px ' + zoom + 'px' }} />}
          {pathPreview && <svg aria-hidden="true" className="path-preview" width={dimensions.width * zoom} height={dimensions.height * zoom}
            viewBox={'0 0 ' + dimensions.width + ' ' + dimensions.height}>
            <path d={paintPathData(pathPreview, pathHover)} {...paintPathColors(pathPreview)}
              strokeWidth={pathPreview.width} strokeLinejoin="round" strokeLinecap="round" />
          </svg>}
          {activeOutline && <SelectionOutline region={activeOutline} {...dimensions} zoom={zoom} />}
          {textBox && <PaintTextEditor box={textBox.box} zoom={zoom} text={textBox.text} style={textStyle}
            color={fg} background={transparentText ? 'transparent' : bg}
            onText={(text) => { setTextBox({ ...textBox, text }); report(Boolean(text.trim())) }} />}
        </CanvasSurface>
      </Viewport>
    </Workspace>
    {chrome.palette && <Palette role="group" aria-label="Paleta de colores">
      <div className="active">
        <Button type="button" aria-label="Color principal" aria-pressed={!secondary} onClick={() => setSecondary(false)}><span style={{ background: fg }} /></Button>
        <Button type="button" aria-label="Color secundario" aria-pressed={secondary} onClick={() => setSecondary(true)}><span style={{ background: bg }} /></Button>
      </div>
      <div className="swatches">{swatches.map((value) => <Button type="button" key={value} title={'#' + value} aria-label={'Color #' + value}
        style={{ background: '#' + value }} onClick={() => chooseColor('#' + value)}
        onContextMenu={(event) => { event.preventDefault(); chooseColor('#' + value, true) }} />)}</div>
    </Palette>}
    <Status hidden={!chrome.status && !error}>
      <span>{saved?.name ?? 'Sin título'}{dirty ? ' *' : ''} · {paintTools.find(([id]) => id === tool)?.[1]}</span>
      <span>{position ? position.x + ', ' + position.y + ' · ' : ''}{dimensions.width} × {dimensions.height} · {zoom * 100}%</span>
      {!form && error && <span role="alert">{error}</span>}
      {status && <span role="status">{status}</span>}
      {busy && <span role="status">Procesando dibujo…</span>}
    </Status>
    <input ref={fileInput} type="file" hidden accept="image/png,.png" onChange={(event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) importPng(file)
    }} />
    {form && <Overlay><form aria-label="Guardar dibujo" onSubmit={(event) => { event.preventDefault(); saveTo(form.name, form.parent) }}>
      <label>Nombre del dibujo<input autoFocus required maxLength={76} value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Guardar en<select value={form.parent} onChange={(event) => setForm({ ...form, parent: event.target.value })}>
        {tree.listTree().filter(({ directory }) => tree.writable(directory.id)).map(({ directory }) =>
          <option key={directory.id} value={directory.id}>{tree.pathTo(directory.id).slice(1).map(({ name }) => name).join(' › ')}</option>)}
      </select></label>
      {error && <span role="alert">{error}</span>}
      <Button type="submit" disabled={busy}>Guardar dibujo</Button>
      <Button type="button" disabled={busy} onClick={() => { setForm(null); setError('') }}>Cancelar</Button>
    </form></Overlay>}
    {dialog === 'help' && <Overlay><form aria-label="Temas de ayuda de Paint" onSubmit={(event) => { event.preventDefault(); setDialog(null) }}>
      <p>Elige una herramienta y dibuja. Arrastra para seleccionar un área y vuelve a arrastrarla para moverla. Usa Edición para cortar, copiar y pegar. Con Texto puedes escribir sobre el lienzo y pulsar Aplicar texto para fijarlo. Mantén pulsado el aerógrafo para rociar. En Curva, arrastra una línea y después ajusta dos puntos de control. En Polígono, marca los vértices y cierra con doble clic, pulsando el primero o con Intro. Esc cancela el trazado en curso. El botón derecho usa el color secundario. En móvil puedes elegirlo en la paleta. Guarda el dibujo para abrirlo desde el Explorador o exporta un PNG.</p>
      <Button type="submit" autoFocus>Entendido</Button>
    </form></Overlay>}
    {dialog === 'attributes' && <Overlay><form aria-label="Atributos de la imagen" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      resize(Number(data.get('width')), Number(data.get('height')))
    }}>
      <label>Ancho en píxeles<input autoFocus type="number" name="width" min={1} max={MAX_PAINT_SIDE} defaultValue={dimensions.width} required /></label>
      <label>Alto en píxeles<input type="number" name="height" min={1} max={MAX_PAINT_SIDE} defaultValue={dimensions.height} required /></label>
      <Button type="submit">Aceptar</Button>
      <Button type="button" onClick={() => setDialog(null)}>Cancelar</Button>
    </form></Overlay>}
    {dialog === 'zoom' && <Overlay><form aria-label="Zoom de Paint" onSubmit={(event) => {
      event.preventDefault()
      changeZoom(Number(new FormData(event.currentTarget).get('zoom')))
      setDialog(null)
    }}>
      <label>Ampliación<select autoFocus name="zoom" defaultValue={zoom}>
        {paintZoomLevels.map((value) => <option key={value} value={value}>{value * 100}%</option>)}
      </select></label>
      <Button type="submit">Aceptar</Button>
      <Button type="button" onClick={() => setDialog(null)}>Cancelar</Button>
    </form></Overlay>}
    {dialog === 'color' && <Overlay><form aria-label="Editar colores" onSubmit={(event) => {
      event.preventDefault()
      chooseColor(String(new FormData(event.currentTarget).get('color')))
      setDialog(null)
    }}>
      <label>{secondary ? 'Color secundario' : 'Color principal'}<input autoFocus type="color" name="color" defaultValue={secondary ? bg : fg} /></label>
      <Button type="submit">Aceptar</Button>
      <Button type="button" onClick={() => setDialog(null)}>Cancelar</Button>
    </form></Overlay>}
  </Panel>
}
