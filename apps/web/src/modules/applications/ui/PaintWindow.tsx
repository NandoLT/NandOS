import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import type { AppMenu } from '../../../shared/ui/AppMenuBar'
import { useShellStore } from '../../shell/application/shell.store'
import { createExplorerTree, DOCUMENTS_DIRECTORY } from '../domain/explorer'
import type { PaintImage } from '../domain/explorer'
import { floodFill, traceLine } from '../domain/paint-raster'
import type { PaintPoint } from '../domain/paint-raster'
import { canvasPng, loadPaintBlob, readPngSize } from '../infrastructure/paint-storage'

const Panel = styled.section`
  position: relative; height: 100%; min-width: 0; display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  background: var(--os-toolbar); color: var(--os-window-text); font-size: 12px;
`
const Workspace = styled.div`
  min-height: 0; display: grid; grid-template-columns: auto minmax(0, 1fr);
`
const Button = styled.button`
  color: var(--os-window-text); background: var(--os-window);
  border: var(--os-raised-border); cursor: pointer;
  &[aria-pressed='true'], &:active:not(:disabled) { border: var(--os-inset-border); background: var(--os-surface-alt); }
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -4px; }
  &:disabled { opacity: .55; cursor: default; }
`
const Toolbox = styled.div`
  display: grid; grid-template-columns: repeat(2, 28px); align-content: start;
  gap: 1px; padding: 4px; overflow: auto;
  button { width: 28px; height: 27px; min-height: 0; padding: 0; }
  svg { display: block; margin: auto; }
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
const Palette = styled.div`
  display: flex; align-items: center; gap: 6px; padding: 4px; border-block: var(--os-raised-border);
  .active { display: flex; gap: 2px; }
  .active button { width: 22px; height: 22px; min-height: 0; padding: 3px; }
  .active span { display: block; width: 100%; height: 100%; border: 1px solid #444; }
  .swatches { display: grid; grid-template-columns: repeat(14, 16px); gap: 1px; }
  .swatches button { width: 16px; height: 16px; min-height: 0; padding: 0; }
  @media (max-width: 420px) { .swatches { grid-template-columns: repeat(7, 24px); } .swatches button { width: 24px; height: 24px; } }
`
const Status = styled.footer`
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

const tools = [
  ['eraser', 'Goma', 'm3 10 6-7 5 4-6 7H6z M6 7l5 4'],
  ['fill', 'Relleno', 'm3 7 5-5 5 5-5 5z M5 3l5 5 M14 9v4'],
  ['picker', 'Cuentagotas', 'm3 13 1-3 5-5 2 2-5 5z M8 4l4-2 2 2-2 4'],
  ['zoom', 'Lupa', 'M11 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 3 4 4'],
  ['pencil', 'Lápiz', 'm2 14 2-5 7-7 3 3-7 7z M9 4l3 3'],
  ['brush', 'Pincel', 'm7 8 5-6 2 2-5 6z M7 8c-3 0-4 2-4 4l-1 2c4 0 7-1 7-4'],
  ['line', 'Línea', 'M2 2l12 12'],
  ['rectangle', 'Rectángulo', 'M2 4h12v9H2z'],
  ['ellipse', 'Elipse', 'M14 8a6 5 0 1 1-12 0 6 5 0 0 1 12 0Z'],
  ['rounded', 'Rectángulo redondeado', 'M5 4h6q3 0 3 3v3q0 3-3 3H5q-3 0-3-3V7q0-3 3-3Z'],
] as const
const swatches = ['000000','808080','800000','808000','008000','008080','000080','800080','808040','004040','0080ff','004080','8000ff','804000',
  'ffffff','c0c0c0','ff0000','ffff00','00ff00','00ffff','0000ff','ff00ff','ffff80','00ff80','80ffff','8080ff','ff0080','ff8040']
const levels = [.25, .5, 1, 2, 4, 8]
type Tool = typeof tools[number][0]
type Snapshot = { pixels: ImageData; revision: number }
type Stroke = { pointer: number; start: PaintPoint; last: PaintPoint; before: Snapshot; tool: Tool; color: string; size: number }
const isShape = (tool: Tool) => tool === 'line' || tool === 'rectangle' || tool === 'ellipse' || tool === 'rounded'

function draw(ctx: CanvasRenderingContext2D, from: PaintPoint, to: PaintPoint, tool: Tool, color: string, size: number) {
  if (!isShape(tool) || tool === 'line') {
    ctx.fillStyle = color
    traceLine(from, to, (x, y) => ctx.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size))
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
  ctx.stroke()
}

export function PaintWindow({ initial, dirty, onDirty, onNew, onBrowse }: {
  initial: PaintImage | null; dirty: boolean; onDirty: (dirty: boolean) => void; onNew: () => void; onBrowse: (folder: string) => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const files = useShellStore((state) => state.fileNodes)
  const tree = useMemo(() => createExplorerTree(folders, files), [folders, files])
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const stroke = useRef<Stroke | null>(null)
  const history = useRef({ undo: [] as Snapshot[], redo: [] as Snapshot[], revision: 0, next: 0, saved: 0 })
  const operation = useRef(false)
  const [saved, setSaved] = useState(initial)
  const [dimensions, setDimensions] = useState({ width: initial?.width ?? 640, height: initial?.height ?? 480 })
  const [ready, setReady] = useState(!initial)
  const [tool, setTool] = useState<Tool>('pencil')
  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#ffffff')
  const [secondary, setSecondary] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState(1)
  const [counts, setCounts] = useState({ undo: 0, redo: 0 })
  const [position, setPosition] = useState<PaintPoint | null>(null)
  const [form, setForm] = useState<{ name: string; parent: string } | null>(null)
  const [help, setHelp] = useState(false)
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
    target.putImageData(previous.pixels, 0, 0)
    state.revision = previous.revision
    report()
  }
  const chooseColor = (hex: string, alternate = secondary) => alternate ? setBg(hex) : setFg(hex)
  const coords = (event: PointerEvent<HTMLCanvasElement>) => {
    const { width, height } = event.currentTarget
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(width - 1, Math.floor((event.clientX - rect.left) * width / rect.width))),
      y: Math.max(0, Math.min(height - 1, Math.floor((event.clientY - rect.top) * height / rect.height))),
    }
  }
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!available || form || help || stroke.current || (event.button !== 0 && event.button !== 2)) return
    const target = ctx()
    if (!target) return
    event.currentTarget.focus({ preventScroll: true })
    const start = coords(event)
    setPosition(start)
    const alternate = event.button === 2 || (event.pointerType !== 'mouse' && secondary)
    const color = tool === 'eraser' || alternate ? bg : fg
    if (tool === 'zoom') { setZoom(levels[(levels.indexOf(zoom) + 1) % levels.length]); return }
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
    const thickness = tool === 'pencil' ? 1 : tool === 'eraser' ? Math.max(5, size) : size
    stroke.current = { pointer: event.pointerId, start, last: start, before, tool, color, size: thickness }
    draw(target, start, start, tool, color, thickness)
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const next = coords(event)
    setPosition((previous) => previous?.x === next.x && previous.y === next.y ? previous : next)
    const gesture = stroke.current
    const target = ctx()
    if (!gesture || gesture.pointer !== event.pointerId || !target) return
    if (isShape(gesture.tool)) target.putImageData(gesture.before.pixels, 0, 0)
    draw(target, isShape(gesture.tool) ? gesture.start : gesture.last, next, gesture.tool, gesture.color, gesture.size)
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
    { name: 'Ver', commands: levels.map((value) => ({ label: 'Zoom ' + value * 100 + '%', run: () => setZoom(value), pressed: zoom === value })) },
    { name: 'Imagen', commands: [
      { label: 'Borrar imagen', run: () => clear(false), disabled: !available },
      { label: 'Borrar a transparente', run: () => clear(true), disabled: !available },
    ] },
    { name: 'Opciones', commands: [1,3,5,9].map((value) => ({ label: 'Grosor ' + value + ' px', run: () => setSize(value), pressed: size === value })) },
    { name: 'Ayuda', commands: [{ label: 'Cómo usar Paint', run: () => setHelp(true) }] },
  ]

  return <Panel aria-label="Editor Paint" onKeyDown={(event) => {
    if (event.key === 'Escape' && (form || help)) {
      event.preventDefault(); event.stopPropagation(); setForm(null); setHelp(false); return
    }
    if (form || help || !available || (!event.ctrlKey && !event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 's') { event.preventDefault(); save() }
    if (key === 'z' || key === 'y') { event.preventDefault(); step(key === 'y' || event.shiftKey ? 'redo' : 'undo') }
  }}>
    <AppMenuBar label="Menús de Paint" menus={menus} />
    <Workspace>
      <Toolbox role="group" aria-label="Herramientas de dibujo">
        {tools.map(([id, name, path]) => <Button type="button" key={id} aria-label={name} title={name}
          aria-pressed={tool === id} disabled={!available} onClick={() => { setTool(id); setStatus('') }}>
          <svg width="17" height="17" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true"><path d={path} /></svg>
        </Button>)}
      </Toolbox>
      <Viewport aria-label="Área de dibujo">
        <canvas ref={canvas} tabIndex={0} aria-label="Lienzo de dibujo" style={{ width: dimensions.width * zoom, height: dimensions.height * zoom }}
          onContextMenu={(event) => event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove}
          onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
          onLostPointerCapture={(event) => finish(event, true)} />
      </Viewport>
    </Workspace>
    <Palette role="group" aria-label="Paleta de colores">
      <div className="active">
        <Button type="button" aria-label="Color principal" aria-pressed={!secondary} onClick={() => setSecondary(false)}><span style={{ background: fg }} /></Button>
        <Button type="button" aria-label="Color secundario" aria-pressed={secondary} onClick={() => setSecondary(true)}><span style={{ background: bg }} /></Button>
      </div>
      <div className="swatches">{swatches.map((value) => <Button type="button" key={value} title={'#' + value} aria-label={'Color #' + value}
        style={{ background: '#' + value }} onClick={() => chooseColor('#' + value)}
        onContextMenu={(event) => { event.preventDefault(); chooseColor('#' + value, true) }} />)}</div>
    </Palette>
    <Status>
      <span>{saved?.name ?? 'Sin título'}{dirty ? ' *' : ''} · {tools.find(([id]) => id === tool)?.[1]}</span>
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
    {help && <Overlay><form aria-label="Ayuda de Paint" onSubmit={(event) => { event.preventDefault(); setHelp(false) }}>
      <p>Elige una herramienta y dibuja. El botón derecho usa el color secundario. En móvil puedes elegirlo en la paleta. Guarda el dibujo para abrirlo desde el Explorador o exporta un PNG.</p>
      <Button type="submit" autoFocus>Entendido</Button>
    </form></Overlay>}
  </Panel>
}
