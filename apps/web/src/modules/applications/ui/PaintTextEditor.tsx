import styled from '@emotion/styled'
import type { PaintRegion } from '../domain/paint-selection'
import { paintTextFonts, paintTextStyle } from '../domain/paint-text'
import type { PaintTextStyle } from '../domain/paint-text'

const Toolbar = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 3px 5px; padding: 3px 5px;
  background: var(--os-toolbar); border-bottom: var(--os-raised-border);
  label { display: inline-flex; align-items: center; gap: 4px; }
  select { max-width: 100%; }
  button { padding: 2px 6px; border: var(--os-raised-border); color: inherit; background: var(--os-window); }
  button[aria-pressed='true'] { border: var(--os-inset-border); background: var(--os-surface-alt); }
`
const TextArea = styled.textarea`
  position: absolute; z-index: 1; box-sizing: border-box; margin: 0; border: 0; resize: none;
  outline: 1px dashed #000; box-shadow: 0 0 0 2px #fff;
`

export function PaintTextToolbar({ style, onStyle, onApply, onCancel }: {
  style: PaintTextStyle; onStyle: (style: PaintTextStyle) => void; onApply: () => void; onCancel: () => void
}) {
  return <Toolbar role="group" aria-label="Formato de texto">
    <label>Fuente<select value={style.family} onChange={(event) => onStyle({ ...style, family: event.target.value })}>
      {paintTextFonts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>Tamaño<select value={style.size} onChange={(event) => onStyle({ ...style, size: Number(event.target.value) })}>
      {[12, 16, 20, 24, 32, 48].map((size) => <option key={size}>{size}</option>)}
    </select></label>
    <button type="button" aria-label="Negrita" aria-pressed={style.bold} onClick={() => onStyle({ ...style, bold: !style.bold })}><strong>N</strong></button>
    <button type="button" aria-label="Cursiva" aria-pressed={style.italic} onClick={() => onStyle({ ...style, italic: !style.italic })}><i>C</i></button>
    <button type="button" onClick={onApply}>Aplicar texto</button>
    <button type="button" onClick={onCancel}>Cancelar texto</button>
  </Toolbar>
}

export function PaintTextEditor({ box, zoom, text, style, color, background, onText }: {
  box: PaintRegion; zoom: number; text: string; style: PaintTextStyle
  color: string; background: string; onText: (text: string) => void
}) {
  return <TextArea autoFocus aria-label="Texto del dibujo" wrap="off" spellCheck={false} maxLength={4000}
    value={text} onChange={(event) => onText(event.target.value)}
    style={{ left: box.x * zoom, top: box.y * zoom, width: box.width * zoom, height: box.height * zoom,
      padding: 2 * zoom, font: paintTextStyle(style, zoom), color, background, overflow: 'auto' }} />
}
