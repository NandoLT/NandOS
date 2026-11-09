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
import { hasShapeStyle, paintTools, paintZoomLevels } from '../domain/paint-tools'
import { PaintToolbox } from './PaintToolbox'
import type { BrushTip, PaintTool, ShapeStyle } from '../domain/paint-tools'

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
  position: relative; width: max-content;
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

export function PaintWindow({ initial, dirty, onDirty, onNew, onBrowse }: {
  initial: PaintImage | null; dirty: boolean; onDirty: (dirty: boolean) => void; onNew: () => void; onBrowse: (folder: string) => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const files = useShellStore((state) => state.fileNodes)
  const tree = useMemo(() => createExplorerTree(folders, files), [folders, files])
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const magnification = useRef(2)
  const stroke = useRef<Stroke | null>(null)
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
  const [lineWidth, setLineWidth] = useState(1)
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

  const report = () => {
    const state = history.current
    setCounts({ undo: state.undo.length, redo: state.redo.length })
    onDirty(state.saved !== state.revision)
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
  const step = (direction: 'undo' | 'redo') => {
    const target = ctx()
    if (!available || !target || stroke.current) return
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
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!available || form || dialog || stroke.current || (event.button !== 0 && event.button !== 2)) return
    const target = ctx()
    if (!target) return
    event.currentTarget.focus({ preventScroll: true })
    const start = coords(event)
    setPosition(start)
    const alternate = event.button === 2 || (event.pointerType !== 'mouse' && secondary)
    const color = tool === 'eraser' || alternate ? bg : fg
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
    const size = tool === 'pencil' ? 1 : tool === 'brush' ? brush.size : tool === 'eraser' ? eraser : lineWidth
    const gesture = { pointer: event.pointerId, start, last: start, before, tool, color, size,
      tip: brush.tip, style: shape, background: alternate ? fg : bg }
    stroke.current = gesture
    draw(target, start, start, gesture)
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const next = coords(event)
    setPosition((previous) => previous?.x === next.x && previous.y === next.y ? previous : next)
    const gesture = stroke.current
    const target = ctx()
    if (!gesture || gesture.pointer !== event.pointerId || !target) return
    if (isShape(gesture.tool)) target.putImageData(gesture.before.pixels, 0, 0)
    draw(target, isShape(gesture.tool) ? gesture.start : gesture.last, next, gesture)
    gesture.last = next
  }
  const finish = (event: PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const gesture = stroke.current
    if (!gesture || gesture.pointer !== event.pointerId) return
    if (!cancelled) pointerMove(event)
    stroke.current = null
    if (cancelled) ctx()?.putImageData(gesture.before.pixels, 0, 0)
    else record(gesture.before)
  }
  const perform = async (task: () => Promise<void>) => {
    if (operation.current || stroke.current) return
    operation.current = true
    setBusy(true); setStatus(''); setError('')
    try { await task() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la operación.') }
    finally { operation.current = false; setBusy(false) }
  }
  const saveAs = () => {
    if (stroke.current) return
    setError('')
    setForm({ name: saved?.name.replace(/\.png$/iu, '') ?? 'Sin título',
      parent: saved && tree.writable(saved.parentId) ? saved.parentId : DOCUMENTS_DIRECTORY })
  }
  const saveTo = (name: string, parentId: string, id?: string) => void perform(async () => {
    const png = await canvasPng(canvas.current!)
    setSaved(await useShellStore.getState().savePaintImage({ name, parentId, ...dimensions, png }, id))
    history.current.saved = history.current.revision
    report()
    setForm(null)
    setStatus('Dibujo guardado en este navegador.')
  })
  const save = () => saved ? saveTo(saved.name, saved.parentId, saved.id) : saveAs()
  const exportPng = () => void perform(async () => {
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
      target.canvas.width = bitmap.width
      target.canvas.height = bitmap.height
      target.drawImage(bitmap, 0, 0)
      setDimensions(dimensions)
      history.current = { undo: [], redo: [], revision: 1, next: 1, saved: 0 }
      report()
      setReady(true); setZoom(1); setSaved(null); setStatus('PNG abierto.')
    } finally { bitmap.close() }
  })
  const clear = (transparent: boolean) => {
    const target = ctx()
    if (!target || stroke.current) return
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
    if (!available || !target || stroke.current) return
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
    if (!available || !target || stroke.current || ![width, height].every((side) =>
      Number.isInteger(side) && side >= 1 && side <= MAX_PAINT_SIDE)) return
    if (width !== dimensions.width || height !== dimensions.height) {
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
      { label: 'Deshacer', run: () => step('undo'), disabled: !available || !counts.undo },
      { label: 'Rehacer', run: () => step('redo'), disabled: !available || !counts.redo },
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

  return <Panel aria-label="Editor Paint" onKeyDown={(event) => {
    if (event.key === 'Escape' && (form || dialog)) {
      event.preventDefault(); event.stopPropagation(); setForm(null); setDialog(null); return
    }
    if (form || dialog || !available || (!event.ctrlKey && !event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 's') { event.preventDefault(); save() }
    if (key === 'z' || key === 'y') { event.preventDefault(); step(key === 'y' || event.shiftKey ? 'redo' : 'undo') }
  }}>
    <AppMenuBar label="Menús de Paint" menus={menus} />
    <Workspace>
      {chrome.toolbox && <PaintToolbox tool={tool} available={available}
        onTool={(value) => { setTool(value); setStatus('') }} zoom={zoom} onZoom={changeZoom}
        eraser={eraser} onEraser={setEraser} brush={brush} onBrush={setBrush}
        width={lineWidth} onWidth={setLineWidth} shape={shape} onShape={setShape} />}
      <Viewport aria-label="Área de dibujo">
        <CanvasSurface>
          <canvas ref={canvas} tabIndex={0} aria-label="Lienzo de dibujo" style={{ width: dimensions.width * zoom, height: dimensions.height * zoom }}
            onContextMenu={(event) => event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
            onLostPointerCapture={(event) => finish(event, true)} />
          {chrome.grid && zoom >= 6 && <div className="pixel-grid" aria-hidden="true" style={{ backgroundSize: zoom + 'px ' + zoom + 'px' }} />}
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
      <p>Elige una herramienta y dibuja. Sus opciones aparecen debajo de los iconos. El botón derecho usa el color secundario. En móvil puedes elegirlo en la paleta. Guarda el dibujo para abrirlo desde el Explorador o exporta un PNG.</p>
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
