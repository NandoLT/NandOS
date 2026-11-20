import { useReducer, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import { calculatorKeyboardKey, calculatorReducer, initialCalculator } from '../domain/calculator'
import type { CalculatorKey } from '../domain/calculator'

const Panel = styled.div`
  height: 100%;
  color: var(--os-window-text);
  background: var(--os-window);
  font-size: 12px;
  &:focus { outline: none; }
`

const Body = styled.div`
  width: min(100%, 360px);
  margin-inline: auto;
  padding: 10px;
`

const Display = styled.output`
  display: block;
  min-height: 35px;
  margin-bottom: 9px;
  padding: 5px 8px;
  overflow-wrap: anywhere;
  border: var(--os-inset-border);
  background: var(--os-input);
  color: var(--os-input-text);
  text-align: right;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
  &[data-error='true'] { font-size: 13px; }
`

const Keypad = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
`

const Memory = styled.span`
  display: grid;
  place-items: center;
  min-width: 0;
  margin: 2px 5px 2px 0;
  border: var(--os-inset-border);
  font-weight: bold;
`

const ClearRow = styled.div`
  grid-column: span 5;
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr;
  gap: 4px;
  margin-bottom: 3px;
`

const Key = styled.button`
  min-width: 0;
  min-height: 32px;
  padding: 1px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-window);
  color: #000080;
  cursor: pointer;
  touch-action: manipulation;
  &[data-function='true'] { color: #870000; }
  &[data-memory='true'] { margin-inline-end: 5px; }
  &:active { border: var(--os-inset-border); }
  &:focus-visible { outline: 1px dotted currentColor; outline-offset: -4px; }
`

const Help = styled.div`
  margin: 0 10px 10px;
  padding: 8px;
  border: var(--os-inset-border);
  background: var(--os-surface);
  line-height: 1.5;
  p { margin: 0; }
`

type KeyDefinition = readonly [CalculatorKey, string, string?]
const clearKeys: readonly KeyDefinition[] = [
  ['backspace', 'Retroceso', 'Borrar último dígito'], ['CE', 'CE', 'Borrar entrada'], ['C', 'C', 'Borrar cálculo'],
]

const keyRows: readonly KeyDefinition[] = [
  ['MC', 'MC', 'Borrar memoria'], ['7', '7'], ['8', '8'], ['9', '9'], ['/', '/', 'Dividir'], ['sqrt', '√', 'Raíz cuadrada'],
  ['MR', 'MR', 'Recuperar memoria'], ['4', '4'], ['5', '5'], ['6', '6'], ['*', '*', 'Multiplicar'], ['%', '%', 'Porcentaje'],
  ['MS', 'MS', 'Guardar en memoria'], ['1', '1'], ['2', '2'], ['3', '3'], ['-', '−', 'Restar'], ['reciprocal', '1/x', 'Inverso'],
  ['M+', 'M+', 'Sumar a memoria'], ['0', '0'], ['sign', '+/−', 'Cambiar signo'], ['.', ',', 'Separador decimal'], ['+', '+', 'Sumar'], ['=', '=', 'Igual'],
]

export function CalculatorWindow() {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculator)
  const [help, setHelp] = useState(false)
  const [clipboardError, setClipboardError] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const display = state.entry.replace('.', ',')
  const focus = () => panel.current?.focus({ preventScroll: true })
  const press = (key: CalculatorKey) => {
    setClipboardError('')
    dispatch({ key })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display)
      setClipboardError('')
    } catch {
      setClipboardError('Usa Ctrl+C para copiar el resultado.')
    }
  }
  const paste = async () => {
    try {
      dispatch({ paste: await navigator.clipboard.readText() })
      setClipboardError('')
    } catch {
      setClipboardError('Usa Ctrl+V para pegar un número.')
    }
  }
  const renderKey = ([key, label, description]: KeyDefinition, index: number, clear = false) =>
    <Key key={key} type="button" aria-label={description} title={description}
      data-function={clear || index % 6 === 0 || /^[+*/=-]$/.test(key)} data-memory={!clear && index % 6 === 0}
      onClick={(event) => { press(key); if (event.detail > 0) focus() }}>
      {label}
    </Key>

  return <Panel ref={panel} tabIndex={-1} data-window-initial-focus onKeyDown={(event) => {
    if (event.defaultPrevented || event.altKey || event.nativeEvent.isComposing || event.target instanceof HTMLInputElement) return
    if (event.ctrlKey || event.metaKey) {
      const memoryKey = { l: 'MC', r: 'MR', m: 'MS', p: 'M+' }[event.key.toLowerCase()] as CalculatorKey | undefined
      if (memoryKey) { event.preventDefault(); press(memoryKey) }
      return
    }
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return
    const key = calculatorKeyboardKey(event.key)
    if (!key) return
    event.preventDefault()
    press(key)
  }} onCopy={(event) => {
    if (state.error) return
    event.preventDefault()
    event.clipboardData.setData('text/plain', display)
  }} onPaste={(event) => {
    event.preventDefault()
    setClipboardError('')
    dispatch({ paste: event.clipboardData.getData('text/plain') })
  }}>
    <AppMenuBar label="Menús de Calculadora" menus={[
      { name: 'Edición', commands: [
        { label: 'Copiar', run: () => void copy(), disabled: Boolean(state.error) },
        { label: 'Pegar', run: () => void paste() },
      ] },
      { name: 'Ver', commands: [{ label: 'Estándar', pressed: true, run: focus }] },
      { name: 'Ayuda', commands: [{ label: 'Teclas de la calculadora', pressed: help, run: () => setHelp(!help) }] },
    ]} />
    <Body>
      <Display aria-label="Resultado" data-error={Boolean(state.error)}>{state.error ?? display}</Display>
      <Keypad aria-label="Teclado de la calculadora" role="group">
        <Memory aria-label={state.memory === null ? 'Memoria vacía' : 'Memoria activa'}>{state.memory === null ? '' : 'M'}</Memory>
        <ClearRow>{clearKeys.map((key, index) => renderKey(key, index, true))}</ClearRow>
        {keyRows.map((key, index) => renderKey(key, index))}
      </Keypad>
    </Body>
    {help && <Help><p>Usa los números y operadores del teclado. Intro calcula, Supr borra la entrada, Esc borra el cálculo y F9 cambia el signo. Ctrl+M guarda en memoria, Ctrl+R recupera, Ctrl+P suma y Ctrl+L borra.</p></Help>}
    {clipboardError && <Help role="status"><p>{clipboardError}</p></Help>}
  </Panel>
}
