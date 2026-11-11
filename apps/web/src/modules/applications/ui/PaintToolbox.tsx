import styled from '@emotion/styled'
import type { ReactNode } from 'react'

import { hasShapeStyle, isSelectionTool, paintTools, sprayRadii } from '../domain/paint-tools'
import type { BrushTip, PaintTool, ShapeStyle } from '../domain/paint-tools'

const icons: Record<PaintTool, ReactNode> = {
  'free-select': <path d="m2 3 5 2 3-4 1 5 5 3-5 2 1 4-5-3-4 2 1-5z" fill="none" strokeDasharray="2 1" />,
  select: <rect x="2" y="3" width="13" height="10" fill="none" strokeDasharray="2 1" />,
  eraser: <><path d="m2 10 6-7h6v4l-6 7H4z" fill="#fff58d"/><path d="m8 14 6-7V3l-6 7H2" fill="#c5a532"/><path d="M3 10h5v3H4z" fill="#fffec1" stroke="none"/></>,
  fill: <><path d="m4 8 6-6 5 5-6 6z" fill="#12caca"/><path d="M6 8 4 6c-2-3-4 0-2 3l2 4M5 10l5-6M9 13l6-6" fill="none" strokeWidth="1.5"/><path d="m6 8 5-5" stroke="#d6ffff"/></>,
  picker: <><path d="m2 13 3-1 5-5-2-2-5 5z" fill="#2ee1df"/><path d="M7 5 11 1h3l2 2v2l-4 4z" fill="#212121"/><path d="M1 15h6" stroke="#007c7d"/></>,
  zoom: <><path d="m11 10 5 4-2 2-4-5z" fill="#3421c9"/><circle cx="7" cy="6" r="5" fill="#eee"/><path d="M4 6a3 3 0 0 1 3-3" fill="none" stroke="white"/></>,
  pencil: <><path d="m3 14 1-5 6-8 4 3-6 8z" fill="#ffe735"/><path d="m9 3 2-2 3 2-1 2z" fill="#ef77a3"/><path d="m3 14 1-5 4 3z" fill="#e9c797"/><path d="m3 14 1-2 1 1z"/></>,
  brush: <><path d="M7 2h3v5l2 2v5H4V9l3-2z" fill="#f4e257"/><path d="M4 10h8v5H4z" fill="#fff8dd"/><path d="M7 12v3m3-3v3" stroke="#806f56"/></>,
  spray: <><path d="m7 5 3-2 5 5-3 4-5-4z" fill="#3422d9"/><path d="m6 4 2-2 2 2-2 2z" fill="#7771e5"/><path d="M4 4H2m3 2H2m2 2H1m3 2H1m2 2H1" stroke="#271cad" strokeDasharray="1 1"/></>,
  text: <path d="M2 14h2L8 2h2l5 12h2v1h-7v-1h2l-1-3H6l-1 3h2v1H2zm5-5h3L8.5 5z" fillRule="evenodd" stroke="none"/>,
  line: <path d="m2 2 13 13"/>,
  curve: <path d="M6 1c12 6-8 9 3 15" fill="none"/>,
  rectangle: <rect x="2" y="3" width="13" height="11" fill="none"/>,
  polygon: <path d="M6 3h9l-5 6h5v5H2z" fill="none"/>,
  ellipse: <ellipse cx="8.5" cy="8.5" rx="6.5" ry="5" fill="none"/>,
  rounded: <rect x="2" y="3" width="13" height="11" rx="3" fill="none"/>,
}

const Toolbox = styled.aside`
  padding: 4px; min-height: 0; overflow: auto;
  border-right: var(--os-raised-border);
`
const Tools = styled.div`
  display: grid; grid-template-columns: repeat(2, 28px);
  button { width: 28px; height: 27px; padding: 0; border: var(--os-raised-border); }
  button[aria-pressed='true'] { border: var(--os-inset-border); background: var(--os-surface-alt); }
  button:disabled { opacity: .48; }
  svg { display: block; margin: auto; }
`
const Options = styled.div`
  margin-top: 5px; padding: 2px; min-height: 56px;
  border: var(--os-inset-border);
  display: grid; align-content: start;
  button { height: 18px; padding: 0; border: 0; display: grid; place-content: center; }
  button[aria-pressed='true'] { background: var(--os-menu-hover); color: var(--os-menu-hover-text); }
`
const ToolButton = styled.button`
  min-height: 0;
  color: var(--os-window-text); background: var(--os-window);
  cursor: pointer;
  &:disabled { cursor: default; }
  &:focus-visible { outline: 1px dotted currentColor; outline-offset: -3px; }
`
const tips: ReadonlyArray<[BrushTip, string]> = [['round', 'Redonda'], ['square', 'Cuadrada'], ['forward', 'Diagonal ascendente'], ['backward', 'Diagonal descendente']]
const styles: ReadonlyArray<[ShapeStyle, string]> = [['outline', 'Solo contorno'], ['both', 'Contorno y relleno'], ['solid', 'Solo relleno']]

type ToolOption = { label: string; active: boolean; select: () => void; preview: ReactNode }

export function PaintToolbox({ tool, available, onTool, zoom, onZoom, eraser, onEraser, brush, onBrush, sprayRadius, onSprayRadius, width, onWidth, shape, onShape, transparent, onTransparency }: {
  tool: PaintTool; available: boolean; onTool: (value: PaintTool) => void
  zoom: number; onZoom: (value: number) => void
  eraser: number; onEraser: (value: number) => void
  brush: { tip: BrushTip; size: number }; onBrush: (value: { tip: BrushTip; size: number }) => void
  sprayRadius: number; onSprayRadius: (radius: number) => void
  width: number; onWidth: (value: number) => void
  shape: ShapeStyle; onShape: (value: ShapeStyle) => void
  transparent: boolean; onTransparency: (value: boolean) => void
}) {
  let options: ToolOption[] = []
  let columns = 1
  if (tool === 'brush') {
    columns = 3
    options = tips.flatMap(([tip, label]) => [9, 5, 2].map((size) => ({
      label: label + ', ' + size + ' px', active: brush.tip === tip && brush.size === size, select: () => onBrush({ tip, size }),
      preview: <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
        {tip === 'round' && <circle cx="7" cy="7" r={size / 2} fill="currentColor" />}
        {tip === 'square' && <rect x={7 - size / 2} y={7 - size / 2} width={size} height={size} fill="currentColor" />}
        {(tip === 'forward' || tip === 'backward') &&
          <path d={tip === 'forward' ? 'M2 12 12 2' : 'M2 2 12 12'} stroke="currentColor" strokeWidth={size / 3} />}
      </svg>,
    })))
  } else if (tool === 'eraser') {
    options = [4, 6, 8, 10].map((size) => ({
      label: 'Goma de ' + size + ' px', active: eraser === size, select: () => onEraser(size),
      preview: <span aria-hidden="true" style={{ width: size, height: size, background: 'currentColor' }} />,
    }))
  } else if (tool === 'spray') {
    options = sprayRadii.map((radius) => ({
      label: 'Aerógrafo de ' + radius * 2 + ' px', active: sprayRadius === radius, select: () => onSprayRadius(radius),
      preview: <svg width="36" height="16" viewBox="0 0 36 16" aria-hidden="true">
        <g transform={'translate(18 8) scale(' + radius / 12 + ')'}>
          <path d="M-10 0h1m4-5h1m2 7h1m2-6h1m3 4h1m3 5h1m-6-1h1m-11 3h1m8-5h1m6-4h1m-14 2h1m-4-2h1"
            stroke="currentColor" strokeWidth="1.5" />
        </g>
      </svg>,
    }))
  } else if (tool === 'line' || tool === 'curve') {
    options = [1, 2, 3, 4, 5].map((size) => ({
      label: (tool === 'curve' ? 'Curva de ' : 'Línea de ') + size + ' px', active: width === size, select: () => onWidth(size),
      preview: <span aria-hidden="true" style={{ width: 35, height: size, background: 'currentColor' }} />,
    }))
  } else if (hasShapeStyle(tool) || tool === 'polygon') {
    options = styles.map(([value, label]) => ({
      label, active: shape === value, select: () => onShape(value),
      preview: <svg width="38" height="13" viewBox="0 0 38 13" aria-hidden="true">
        <rect x="1" y="1" width="36" height="11" fill={value === 'outline' ? 'none' : 'currentColor'}
          fillOpacity={value === 'both' ? '.38' : '1'} stroke={value === 'solid' ? 'none' : 'currentColor'} />
      </svg>,
    }))
  } else if (isSelectionTool(tool) || tool === 'text') {
    options = [false, true].map((value) => ({
      label: value ? 'Fondo transparente' : 'Fondo opaco', active: transparent === value,
      select: () => onTransparency(value),
      preview: <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true">
        <rect x="3" y="2" width="10" height="8" fill="currentColor" fillOpacity=".45" />
        <rect x="10" y="4" width="18" height="9" fill={value ? 'none' : 'currentColor'}
          fillOpacity=".75" stroke="currentColor" strokeDasharray={value ? '2 1' : undefined} />
      </svg>,
    }))
  } else if (tool === 'zoom') {
    options = [1, 2, 6, 8].map((value) => ({
      label: value + '×', active: zoom === value, select: () => onZoom(value),
      preview: <span aria-hidden="true">{value}× <span style={{ display: 'inline-block', width: value, height: value, background: 'currentColor' }} /></span>,
    }))
  }

  return <Toolbox aria-label="Caja de herramientas">
    <Tools role="group" aria-label="Herramientas de dibujo">
      {paintTools.map(([id, label]) => <ToolButton type="button" key={id} aria-label={label}
        title={label} aria-pressed={tool === id}
        disabled={!available} onClick={() => onTool(id)}>
        <svg width="17" height="17" viewBox="0 0 17 17" fill="#161616" stroke="#161616" strokeLinejoin="round" aria-hidden="true">{icons[id]}</svg>
      </ToolButton>)}
    </Tools>
    <Options style={{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }} role="group" aria-label="Opciones de la herramienta">
      {options.map(({ label, active, select, preview }) => <ToolButton type="button" key={label}
        aria-label={label} title={label} aria-pressed={active} disabled={!available} onClick={select}>{preview}</ToolButton>)}
    </Options>
  </Toolbox>
}
