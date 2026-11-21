import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import { chordMineCell, createMineGame, markMineCell, mineLevels, mineSeconds, remainingMines, revealMineCell } from '../domain/minesweeper'
import type { MineConfig, MineGame, MineLevel } from '../domain/minesweeper'
import { readMineRecords, storeMineRecord } from '../infrastructure/minesweeper-records'
import { MineCounter, MineFace, MineSprite } from './MinesweeperGraphics'

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--os-window-text);
  background: var(--os-window);
  font-size: 12px;
  &:focus { outline: none; }
`
const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px;
  overscroll-behavior: contain;
`
const Cabinet = styled.div`
  width: max-content;
  margin-inline: auto;
  padding: 6px;
  border: 3px solid;
  border-color: #fff #808080 #808080 #fff;
  color: #000;
  background: #c0c0c0;
  &[data-color='false'] { filter: grayscale(1); }
`
const Score = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  padding: 4px;
  border: 2px solid;
  border-color: #808080 #fff #fff #808080;
  > svg { flex: none; border: 1px inset #ddd; }
`
const FaceButton = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  min-height: 0;
  padding: 0;
  border: 2px solid;
  border-color: #fff #808080 #808080 #fff;
  border-radius: 0;
  color: #000;
  background: #c0c0c0;
  cursor: pointer;
  &:active { border-color: #808080 #fff #fff #808080; }
  &:focus-visible { outline: 1px dotted #000; outline-offset: -4px; }
`
const Board = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 24px);
  width: max-content;
  border: 3px solid;
  border-color: #808080 #fff #fff #808080;
  user-select: none;
`
const Cell = styled.button`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 3px solid;
  border-color: #fff #808080 #808080 #fff;
  border-radius: 0;
  background: #c0c0c0;
  color: #000;
  font: bold 19px/1 'Courier New', monospace;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  &[data-open='true'], &:active:not([aria-disabled='true']) {
    border: 0;
    box-shadow: inset 1px 1px #808080;
  }
  &[data-exploded='true'] { background: #f00; }
  &:focus-visible { position: relative; z-index: 1; outline: 2px dotted #000; outline-offset: -4px; }
`
const TouchBar = styled.div`
  display: none;
  padding: 5px 8px;
  border-top: var(--os-raised-border);
  gap: 8px;
  align-items: center;
  &[data-active='true'] { display: flex; }
  @media (max-width: 640px), (pointer: coarse) { display: flex; }
  button { min-height: 28px; padding: 3px 8px; border: var(--os-raised-border); border-radius: 0; background: var(--os-window); color: inherit; font: inherit; }
  button[aria-pressed='true'] { border: var(--os-inset-border); background: var(--os-surface); }
`
const Status = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
const Dialog = styled.dialog`
  position: fixed;
  inset: 0;
  width: min(370px, calc(100% - 24px));
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 3px;
  border: var(--os-window-border);
  background: var(--os-window);
  color: var(--os-window-text);
  font-size: 13px;
  box-shadow: var(--os-window-shadow);
  &::backdrop { background: var(--os-overlay); }
  h2 { margin: 0; padding: 5px 7px; color: var(--os-titlebar-text); background: var(--os-titlebar); font-size: 13px; }
  section { padding: 12px; line-height: 1.5; }
  p { margin: 0 0 8px; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
  input { width: 90px; padding: 4px; border: var(--os-inset-border); background: var(--os-input); color: var(--os-input-text); }
  button { min-height: 28px; padding: 4px 12px; border: var(--os-raised-border); background: var(--os-window); color: inherit; font: inherit; }
  footer { display: flex; justify-content: center; padding: 0 8px 10px; }
`

function MineDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const modal = ref.current
    const opener = document.activeElement
    if (typeof modal?.showModal === 'function') modal.showModal()
    else if (modal) modal.open = true
    return () => {
      modal?.close?.()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return <Dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose() }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }}>
    <h2 id={titleId}>{title}</h2><section>{children}</section><footer><button type="button" onClick={onClose}>Aceptar</button></footer>
  </Dialog>
}

function CustomGame({ config, onStart }: { config: MineConfig; onStart: (config: MineConfig) => void }) {
  const [error, setError] = useState('')
  return <form onSubmit={(event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = { columns: Number(data.get('columns')), rows: Number(data.get('rows')), mines: Number(data.get('mines')) }
    try { createMineGame(next); onStart(next) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa las dimensiones.') }
  }}>
    <label>Alto (8–24)<input name="rows" type="number" min="8" max="24" defaultValue={config.rows} required /></label>
    <label>Ancho (8–30)<input name="columns" type="number" min="8" max="30" defaultValue={config.columns} required /></label>
    <label>Minas<input name="mines" type="number" min="1" max="667" defaultValue={config.mines} required /></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit">Empezar partida</button>
  </form>
}

const numberColors = ['#000', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080']
function cellName(game: MineGame, index: number) {
  const cell = game.cells[index]
  const position = 'Fila ' + (Math.floor(index / game.config.columns) + 1) + ', columna ' + (index % game.config.columns + 1) + ': '
  if (game.status === 'lost' && cell.mine) return position + 'mina'
  return position + (cell.revealed ? cell.adjacent ? cell.adjacent + ' minas alrededor' : 'vacía' : cell.mark === 'flag' ? 'bandera' : cell.mark === 'question' ? 'interrogación' : 'cubierta')
}

export function MinesweeperWindow({ onClose, onResize }: { onClose: () => void; onResize: (width: number, height: number) => void }) {
  const [game, setGame] = useState(() => createMineGame())
  const [level, setLevel] = useState<MineLevel | null>('beginner')
  const [questions, setQuestions] = useState(true)
  const [color, setColor] = useState(true)
  const [flagMode, setFlagMode] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const [clock, setClock] = useState(0)
  const [dialog, setDialog] = useState<'help' | 'records' | 'custom' | null>(null)
  const [records, setRecords] = useState(readMineRecords)
  const board = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const cabinet = useRef<HTMLDivElement>(null)
  const touchBar = useRef<HTMLDivElement>(null)
  const fitWindow = useEffectEvent(onResize)
  useLayoutEffect(() => {
    const root = panel.current
    const field = cabinet.current
    const frame = root?.closest('[role="dialog"]')
    const menu = root?.querySelector('nav')
    if (!root || !field || !frame || !menu || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      if (!root.getClientRects().length) return
      const border = getComputedStyle(frame)
      const frameWidth = parseFloat(border.borderLeftWidth) + parseFloat(border.borderRightWidth)
      const frameHeight = parseFloat(border.borderTopWidth) + parseFloat(border.borderBottomWidth)
      const scroll = field.parentElement!
      const scrollbar = scroll.offsetHeight - scroll.clientHeight
      const toolbarHeight = touchBar.current?.getBoundingClientRect().height ?? 0
      fitWindow(Math.ceil(field.getBoundingClientRect().width + 8 + frameWidth),
        Math.ceil(field.getBoundingClientRect().height + menu.getBoundingClientRect().height + toolbarHeight + 28 + 8 + frameHeight + scrollbar))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(field)
    observer.observe(menu)
    if (touchBar.current) observer.observe(touchBar.current)
    window.addEventListener('resize', fit)
    fit()
    return () => { observer.disconnect(); window.removeEventListener('resize', fit) }
  }, [])
  const seconds = mineSeconds(game, clock)

  useEffect(() => {
    if (game.status !== 'playing') return
    const timer = window.setInterval(() => setClock(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [game.status])

  const restart = (config = game.config, nextLevel = level) => {
    setGame(createMineGame(config))
    setLevel(nextLevel)
    setPressed(false)
    setFlagMode(false)
    setFocusIndex(0)
    setClock(0)
    setDialog(null)
  }
  const reveal = (index: number) => {
    const next = game.cells[index].revealed ? chordMineCell(game, index) : revealMineCell(game, index)
    setGame(next)
    if (next !== game && next.status === 'won' && level) setRecords(storeMineRecord(level, mineSeconds(next, next.endedAt ?? 0)))
  }
  const mark = (index: number) => setGame(markMineCell(game, index, questions))
  const focusCell = (index: number) => {
    setFocusIndex(index)
    const target = board.current?.querySelectorAll<HTMLButtonElement>('button')[index]
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  const message = game.status === 'won' ? '¡Has ganado! Todas las casillas seguras están descubiertas.' : game.status === 'lost' ? 'Has encontrado una mina. Pulsa la carita para volver a jugar.' : game.status === 'ready' ? 'Elige una casilla para empezar.' : 'Partida en curso.'

  return <Panel ref={panel} tabIndex={-1} data-window-initial-focus onPointerUp={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
    onKeyDown={(event) => { if (event.key === 'F2' && !dialog) { event.preventDefault(); restart() } }}>
    <AppMenuBar label="Menús de Buscaminas" menus={[
      { name: 'Juego', commands: [
        { label: 'Nuevo · F2', run: () => restart() },
        ...Object.entries(mineLevels).map(([id, config]) => ({ label: config.label, pressed: level === id, run: () => restart(config, id as MineLevel) })),
        { label: 'Personalizado…', pressed: level === null, run: () => setDialog('custom') },
        { label: 'Marcas (?)', pressed: questions, run: () => setQuestions(!questions) },
        { label: 'Color', pressed: color, run: () => setColor(!color) },
        { label: 'Mejores tiempos…', run: () => setDialog('records') },
        { label: 'Salir', run: onClose },
      ] },
      { name: 'Ayuda', commands: [{ label: 'Cómo jugar…', run: () => setDialog('help') }] },
    ]} />
    <Scroll>
      <Cabinet ref={cabinet} data-color={color}>
        <Score>
          <MineCounter label="Minas restantes" value={remainingMines(game)} />
          <FaceButton type="button" aria-label="Nueva partida" title="Nueva partida (F2)" onClick={() => restart()}>
            <MineFace mood={game.status === 'won' ? 'won' : game.status === 'lost' ? 'lost' : pressed ? 'surprised' : 'happy'} />
          </FaceButton>
          <MineCounter label="Tiempo en segundos" value={seconds} />
        </Score>
        <Board ref={board} $columns={game.config.columns} role="group" aria-label="Tablero de Buscaminas"
          onPointerLeave={() => setPressed(false)}>
          {game.cells.map((cell, index) => {
            const mineVisible = game.status === 'lost' && cell.mine && cell.mark !== 'flag'
            const wrong = game.status === 'lost' && !cell.mine && cell.mark === 'flag'
            const finished = game.status === 'won' || game.status === 'lost'
            return <Cell key={index} type="button" tabIndex={focusIndex === index ? 0 : -1}
              aria-label={cellName(game, index)} aria-disabled={finished}
              data-open={cell.revealed || mineVisible || wrong} data-exploded={game.exploded === index}
              style={{ color: numberColors[cell.adjacent] }}
              onFocus={() => setFocusIndex(index)}
              onPointerDown={(event) => { if (event.button === 0 && !finished) setPressed(true) }}
              onClick={() => { setPressed(false); if (flagMode && !cell.revealed) mark(index); else reveal(index) }}
              onContextMenu={(event) => { event.preventDefault(); mark(index) }}
              onKeyDown={(event) => {
                if (event.altKey || event.ctrlKey || event.metaKey) return
                const x = index % game.config.columns
                const y = Math.floor(index / game.config.columns)
                let next = index
                if (event.key === 'ArrowLeft') next = y * game.config.columns + Math.max(0, x - 1)
                else if (event.key === 'ArrowRight') next = y * game.config.columns + Math.min(game.config.columns - 1, x + 1)
                else if (event.key === 'ArrowUp') next = Math.max(0, y - 1) * game.config.columns + x
                else if (event.key === 'ArrowDown') next = Math.min(game.config.rows - 1, y + 1) * game.config.columns + x
                else if (event.key.toLowerCase() === 'f') { event.preventDefault(); mark(index); return }
                else if (event.key === 'Home') next = y * game.config.columns
                else if (event.key === 'End') next = (y + 1) * game.config.columns - 1
                else return
                event.preventDefault(); focusCell(next)
              }}>
              {wrong ? <MineSprite kind="wrong" /> : mineVisible ? <MineSprite kind="mine" /> : cell.mark === 'flag' ? <MineSprite kind="flag" /> : cell.mark === 'question' && !cell.revealed ? '?' : cell.revealed && !cell.mine && cell.adjacent ? cell.adjacent : null}
            </Cell>
          })}
        </Board>
      </Cabinet>
    </Scroll>
    <TouchBar ref={touchBar} data-active={flagMode}><button type="button" aria-pressed={flagMode} onClick={() => setFlagMode(!flagMode)}>⚑ Banderas</button><span>{flagMode ? 'Toca para marcar.' : 'Toca para descubrir.'}</span></TouchBar>
    <Status role="status">{message}</Status>
    {dialog && <MineDialog title={dialog === 'records' ? 'Mejores tiempos' : dialog === 'custom' ? 'Campo personalizado' : 'Ayuda de Buscaminas'} onClose={() => setDialog(null)}>
      {dialog === 'help' ? <>
        <p>Descubre todas las casillas sin minas. Cada número indica cuántas minas hay en las ocho casillas de alrededor. La primera casilla siempre es segura.</p>
        <p>Clic para descubrir; botón derecho para marcar bandera, interrogación y quitar la marca. Pulsa un número descubierto para abrir sus vecinas si ya has colocado las banderas que indica.</p>
        <p>En móvil, activa Banderas para marcar sin descubrir. Los tableros grandes se desplazan sin cambiar el tamaño de las casillas.</p>
        <p>Teclado: Tab entra en el tablero, flechas para moverte, Intro o Espacio para descubrir, F para marcar y F2 para reiniciar.</p>
        <p>Las mejores marcas se guardan en este navegador. Cerrar la aplicación termina la partida.</p>
      </> : dialog === 'custom' ? <CustomGame config={game.config} onStart={(config) => restart(config, null)} /> : <>
        {Object.entries(mineLevels).map(([id, config]) => <p key={id}><strong>{config.label}:</strong> {records[id as MineLevel] === undefined ? 'Sin marca' : records[id as MineLevel] + ' segundos'}</p>)}
        <p>Marcas locales de este navegador.</p>
      </>}
    </MineDialog>}
  </Panel>
}
