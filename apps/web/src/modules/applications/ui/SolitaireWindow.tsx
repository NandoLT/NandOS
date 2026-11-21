import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import { ClassicDialog } from '../../../shared/ui/ClassicDialog'
import { canMoveSolitaire, createSolitaireGame, describeCard, solitaireFoundationTarget, solitaireReducer, sourceCards, suitSymbols, suits } from '../domain/solitaire'
import type { SolitaireAction, SolitaireOptions, SolitaireSource, SolitaireTarget } from '../domain/solitaire'
import { SolitaireCard } from './SolitaireCard'
import type { CardBack } from './SolitaireCard'

const Panel = styled.div`
  display: flex; flex-direction: column; height: 100%; min-height: 0; background: #008000; color: #fff; font-size: 12px;
  &:focus { outline: none; }
`
const Scroll = styled.div`
  flex: 1; min-height: 0; overflow: auto; padding: 16px 12px; container-type: inline-size; overscroll-behavior: contain;
  @media (max-width: 640px) { padding: 12px 6px; }
`
const Table = styled.div`
  --gap: clamp(3px, 2cqi, 16px);
  --card-width: clamp(38px, calc((100cqi - 6 * var(--gap)) / 7), 72px);
  --card-height: calc(var(--card-width) * 100 / 72);
  --open-step: clamp(16px, 4cqi, 26px);
  --closed-step: clamp(8px, 2cqi, 14px);
  position: relative; display: grid; grid-template-columns: repeat(7, var(--card-width));
  gap: 26px var(--gap); width: max-content; margin-inline: auto; padding-bottom: 18px;
`
const Pile = styled.div`
  position: relative; min-height: var(--card-height); width: var(--card-width);
`
const CardButton = styled.button`
  position: absolute; left: 0; width: var(--card-width); height: var(--card-height); min-height: 0; min-width: 0;
  margin: 0; padding: 0; border: 0; border-radius: 3px; background: transparent; cursor: pointer;
  touch-action: none; user-select: none; -webkit-touch-callout: none;
  &[data-selected='true'] { filter: brightness(.8); outline: 2px solid #ffeb00; outline-offset: -2px; }
  &[data-dragging='true'] { opacity: .4; }
  &:focus-visible { outline: 2px dashed #ffeb00; outline-offset: 1px; z-index: 30 !important; }
`
const EmptyPile = styled.button`
  position: absolute; inset: 0; width: var(--card-width); height: var(--card-height); min-height: 0; padding: 0;
  border: 1px solid #005a00; border-radius: 3px; background: #008000; color: #006500;
  box-shadow: inset 1px 1px #004a00, 1px 1px #20a020; font: bold 36px/1 serif;
  &:focus-visible { outline: 2px dashed #ffeb00; outline-offset: -3px; }
  &[data-valid='true'] { outline: 2px solid #ffeb00; outline-offset: -2px; }
`
const Footer = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; min-height: 24px; padding: 3px 8px;
  border: var(--os-inset-border); background: var(--os-window); color: var(--os-window-text); font-size: 11px;
  span:first-of-type { flex: 1; min-width: 130px; }
`
const Ghost = styled.div`
  position: fixed; z-index: 3000; pointer-events: none; opacity: .92;
  > div { position: absolute; width: 100%; aspect-ratio: 72 / 100; filter: drop-shadow(2px 3px 2px #0006); }
`
const BackChoices = styled.div`
  display: flex; justify-content: center; gap: 12px;
  button { width: 80px; height: 108px; min-height: 0; padding: 3px; }
  button[aria-pressed='true'] { outline: 2px dotted var(--os-window-text); outline-offset: 2px; }
`
const Celebration = styled.div`
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  > div { position: absolute; top: 0; width: var(--card-width); height: var(--card-height); animation: solitaire-bounce 3s ease-out forwards; }
  @keyframes solitaire-bounce { 0% { transform: translateY(0) rotate(0); } 45% { transform: translateY(210px) rotate(15deg); } 65% { transform: translateY(70px) rotate(-20deg); } 100% { transform: translateY(430px) rotate(35deg); opacity: 0; } }
`
const sourceKey = (source: SolitaireSource) => source.kind === 'waste' ? 'waste' : source.kind === 'foundation' ? 'foundation-' + source.column : 'tableau-' + source.column + '-' + source.index
const offset = (pile: { faceUp: boolean }[], index: number) => {
  const previous = pile.slice(0, index)
  const open = previous.filter((card) => card.faceUp).length
  return 'calc(' + open + ' * var(--open-step) + ' + (previous.length - open) + ' * var(--closed-step))'
}
function OptionsForm({ options, onApply }: { options: SolitaireOptions; onApply: (options: SolitaireOptions) => void }) {
  const [draft, setDraft] = useState(options)
  return <form onSubmit={(event) => { event.preventDefault(); onApply(draft) }}>
    <fieldset><legend>Robar</legend>{([1, 3] as const).map((count) => <label key={count}><input type="radio" name="draw" checked={draft.draw === count} onChange={() => setDraft({ ...draft, draw: count })} />{count === 1 ? 'Una carta' : 'Tres cartas'}</label>)}</fieldset>
    <fieldset><legend>Puntuación</legend><label><input type="checkbox" checked={draft.scoring} onChange={(event) => setDraft({ ...draft, scoring: event.target.checked })} />Puntuación estándar</label><label><input type="checkbox" checked={draft.timed} onChange={(event) => setDraft({ ...draft, timed: event.target.checked })} />Partida cronometrada</label></fieldset>
    <p>Aplicar estas opciones empieza un nuevo reparto.</p><button type="submit">Aplicar y repartir</button>
  </form>
}

type Drag = { source: SolitaireSource; pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; width: number; moved: boolean }
type Preview = { source: string; cards: number[]; x: number; y: number; width: number }
export function SolitaireWindow({ isPaused, onClose }: { isPaused: boolean; onClose: () => void }) {
  const [game, setGame] = useState(() => createSolitaireGame())
  const [selected, setSelected] = useState<SolitaireSource | null>(null)
  const [message, setMessage] = useState('Roba del mazo o selecciona una carta.')
  const [back, setBack] = useState<CardBack>('blue')
  const [statusBar, setStatusBar] = useState(true)
  const [dialog, setDialog] = useState<'help' | 'options' | 'deck' | 'new' | 'restart' | null>(null)
  const [wonDismissed, setWonDismissed] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const board = useRef<HTMLDivElement>(null)
  const seconds = Math.floor(game.elapsed)
  const selectedKey = selected ? sourceKey(selected) : ''

  useEffect(() => {
    if (!game.started || game.won || !game.options.timed || isPaused || dialog) return
    let last = performance.now()
    const reset = () => { last = performance.now() }
    const timer = window.setInterval(() => {
      const now = performance.now()
      if (document.visibilityState !== 'hidden') {
        const delta = (now - last) / 1000
        setGame((current) => solitaireReducer(current, { type: 'tick', seconds: delta }))
      }
      last = now
    }, 1000)
    document.addEventListener('visibilitychange', reset)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', reset) }
  }, [game.started, game.won, game.options.timed, isPaused, dialog])

  const reset = (sameDeal = false, options = game.options) => {
    setGame(createSolitaireGame(options, sameDeal ? game.deal : undefined))
    setSelected(null); setPreview(null); setWonDismissed(false); setDialog(null)
    drag.current = null
    setMessage('Nuevo reparto. ¡Buena suerte!')
  }
  const act = (action: SolitaireAction) => {
    setGame((current) => solitaireReducer(current, action))
    setSelected(null)
  }
  const requestDeal = (same = false) => {
    if (game.started && !game.won) setDialog(same ? 'restart' : 'new')
    else reset(same)
  }
  const move = (from: SolitaireSource, to: SolitaireTarget) => {
    if (!canMoveSolitaire(game, from, to)) { setMessage('Ese movimiento no es válido. Alterna colores y coloca las cartas en orden descendente.'); return false }
    act({ type: 'move', from, to }); setMessage('Carta movida.'); return true
  }
  const choose = (source: SolitaireSource) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    if (game.won) return
    if (selected && sourceKey(selected) !== sourceKey(source) && source.kind !== 'waste' && move(selected, { kind: source.kind, column: source.column })) return
    if (sourceCards(game, source).length) {
      const next = selectedKey === sourceKey(source) ? null : source
      setSelected(next)
      setMessage(next ? describeCard(sourceCards(game, next)[0]) + ': elige un destino.' : 'Selección cancelada.')
    }
  }
  const autoFoundation = (source: SolitaireSource) => {
    const target = solitaireFoundationTarget(game, source)
    if (target) move(source, target)
    else setMessage('Esta carta todavía no puede ir a una base.')
  }
  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, source: SolitaireSource) => {
    if (event.button !== 0 || game.won || !sourceCards(game, source).length) return
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = { source, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.x, offsetY: event.clientY - rect.y, width: rect.width, moved: false }
    suppressClick.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const dragMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 5) return
    active.moved = true
    event.preventDefault()
    setPreview({ source: sourceKey(active.source), cards: sourceCards(game, active.source), x: event.clientX - active.offsetX, y: event.clientY - active.offsetY, width: active.width })
  }
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current
    drag.current = null; setPreview(null)
    if (!active?.moved) return
    suppressClick.current = true
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-solitaire-target]')?.dataset.solitaireTarget
    if (target) {
      const [kind, column] = target.split(':')
      if (kind === 'tableau' || kind === 'foundation') move(active.source, { kind, column: Number(column) })
    }
  }
  const card = (id: number, source: SolitaireSource, top = '0px', zIndex = 1) => <CardButton key={id} type="button" aria-label={describeCard(id)}
    style={{ top, zIndex }} data-selected={selectedKey === sourceKey(source)} data-dragging={preview?.source === sourceKey(source)}
    onClick={(event) => { event.stopPropagation(); choose(source) }}
    onDoubleClick={(event) => { event.stopPropagation(); autoFoundation(source) }}
    onPointerDown={(event) => beginDrag(event, source)} onPointerMove={dragMove} onPointerUp={endDrag}
    onPointerCancel={() => { drag.current = null; setPreview(null) }}
    onLostPointerCapture={() => { drag.current = null; setPreview(null) }}>
    <SolitaireCard id={id} />
  </CardButton>
  const destination = (target: SolitaireTarget, label: string, symbol = '') => <EmptyPile type="button" aria-label={label}
    tabIndex={(target.kind === 'foundation' ? game.foundations : game.tableau)[target.column].length ? -1 : 0}
    aria-hidden={(target.kind === 'foundation' ? game.foundations : game.tableau)[target.column].length > 0 || undefined}
    data-valid={Boolean(selected && canMoveSolitaire(game, selected, target))}
    onClick={() => { if (selected) move(selected, target); else setMessage('Selecciona primero una carta.') }}>{symbol}</EmptyPile>

  return <Panel tabIndex={-1} data-window-initial-focus onKeyDown={(event) => {
    if (dialog || event.target instanceof HTMLInputElement) return
    if (event.key === 'Escape' && selected) { event.preventDefault(); event.stopPropagation(); setSelected(null); setMessage('Selección cancelada.'); return }
    if (event.key === 'F2') { event.preventDefault(); requestDeal(); return }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); act({ type: 'undo' }); return }
    if (event.ctrlKey || event.altKey || event.metaKey) return
    if (event.key.toLowerCase() === 'd') { event.preventDefault(); act({ type: 'draw' }); return }
    if (event.key.startsWith('Arrow') && board.current?.contains(event.target as Node)) {
      const buttons = [...board.current.querySelectorAll<HTMLButtonElement>('button:not([tabindex="-1"])')]
      const current = buttons.indexOf(event.target as HTMLButtonElement)
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
      event.preventDefault(); buttons[(current + delta + buttons.length) % buttons.length]?.focus()
    }
  }}>
    <AppMenuBar label="Menús de Solitario" menus={[
      { name: 'Juego', commands: [
        { label: 'Repartir · F2', run: () => requestDeal() },
        { label: 'Deshacer · Ctrl+Z', disabled: !game.history.length || game.won, run: () => act({ type: 'undo' }) },
        { label: 'Reiniciar este reparto…', run: () => requestDeal(true) },
        { label: 'Baraja…', run: () => setDialog('deck') },
        { label: 'Opciones…', run: () => setDialog('options') },
        { label: 'Barra de estado', pressed: statusBar, run: () => setStatusBar(!statusBar) },
        { label: 'Salir', run: onClose },
      ] },
      { name: 'Ayuda', commands: [{ label: 'Cómo jugar…', run: () => setDialog('help') }] },
    ]} />
    <Scroll><Table ref={board} role="group" aria-label="Mesa de Solitario">
      <Pile>
        {game.stock.length ? <CardButton type="button" aria-label={'Robar ' + (game.options.draw === 3 ? 'tres cartas' : 'una carta')} onClick={() => { act({ type: 'draw' }); setMessage('Cartas robadas del mazo.') }}><SolitaireCard back={back} /></CardButton>
          : <EmptyPile type="button" aria-label="Volver a pasar el mazo" onClick={() => { act({ type: 'draw' }); setMessage('Mazo preparado.') }}>↻</EmptyPile>}
      </Pile>
      <Pile style={{ gridColumn: '2 / 4' }} aria-label="Descarte">
        {game.waste.slice(-Math.min(game.options.draw, game.waste.length)).map((id, i, visible) => i === visible.length - 1
          ? <div key={id} style={{ position: 'absolute', left: 'calc(' + i + ' * var(--card-width) * .24)', width: 'var(--card-width)', height: 'var(--card-height)' }}>{card(id, { kind: 'waste' })}</div>
          : <div key={id} aria-hidden="true" style={{ position: 'absolute', left: 'calc(' + i + ' * var(--card-width) * .24)', width: 'var(--card-width)', height: 'var(--card-height)' }}><SolitaireCard id={id} /></div>)}
      </Pile>
      {game.foundations.map((pile, column) => <Pile key={'base-' + column} data-solitaire-target={'foundation:' + column}>
        {destination({ kind: 'foundation', column }, 'Base ' + (column + 1) + (pile.length ? '' : ' vacía'), suitSymbols[suits[column]])}
        {pile.length ? card(pile.at(-1)!, { kind: 'foundation', column }) : null}
      </Pile>)}
      {game.tableau.map((pile, column) => <Pile key={'column-' + column} data-solitaire-target={'tableau:' + column}
        style={{ gridColumn: column + 1, minHeight: 'calc(var(--card-height) + ' + offset(pile, Math.max(0, pile.length - 1)) + ')' }}>
        {destination({ kind: 'tableau', column }, 'Columna ' + (column + 1) + ' vacía')}
        {pile.map((item, index) => item.faceUp ? card(item.id, { kind: 'tableau', column, index }, offset(pile, index), index + 1)
          : <CardButton key={item.id} type="button" aria-label={'Voltear carta de columna ' + (column + 1)} aria-hidden={index !== pile.length - 1 || undefined} tabIndex={index === pile.length - 1 ? 0 : -1}
            style={{ top: offset(pile, index), zIndex: index + 1 }} onClick={() => { if (index === pile.length - 1) { act({ type: 'flip', column }); setMessage('Carta descubierta.') } }}><SolitaireCard back={back} /></CardButton>)}
      </Pile>)}
      {game.won && <Celebration aria-hidden="true">{game.foundations.map((pile, i) => <div key={i} style={{ left: (i * 23) + '%', animationDelay: (i * .22) + 's' }}><SolitaireCard id={pile.at(-1)!} /></div>)}</Celebration>}
    </Table></Scroll>
    <Footer style={statusBar ? undefined : { position: 'absolute', width: 1, height: 1, minHeight: 0, padding: 0, overflow: 'hidden', clipPath: 'inset(50%)' }}>
      <span role="status">{game.won ? '¡Has ganado!' : message}</span>
      {game.options.scoring && <span aria-label="Puntuación">Puntos: {game.score}</span>}
      {game.options.timed && <span aria-label="Tiempo de partida">Tiempo: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
    </Footer>
    {preview && createPortal(<Ghost aria-hidden="true" style={{ left: preview.x, top: preview.y, width: preview.width }}>{preview.cards.map((id, i) => <div key={id} style={{ top: i * 24 }}><SolitaireCard id={id} /></div>)}</Ghost>, document.body)}
    {dialog === 'help' && <ClassicDialog title="Cómo jugar al Solitario" onClose={() => setDialog(null)}>
      <p>Lleva las 52 cartas a las cuatro bases, del as al rey y siempre del mismo palo.</p><p>En las siete columnas, coloca cartas en orden descendente alternando rojo y negro. Solo un rey puede ocupar una columna vacía. Puedes mover secuencias completas.</p>
      <p>Arrastra una carta o pulsa origen y destino. El doble clic envía una carta a una base si es posible. Pulsa una carta boca abajo cuando quede descubierta para voltearla.</p>
      <p>Pulsa el mazo para robar una o tres cartas; cuando se agote, pulsa el círculo para volver a pasarlo. No todos los repartos tienen solución.</p>
      <p>Teclado: Tab y flechas para recorrer cartas y huecos; Intro/Espacio para seleccionar y colocar; D para robar, Ctrl+Z para deshacer y F2 para repartir. Esc cancela la selección.</p>
      <p>Puntuación estándar: +10 por carta a una base, +5 del descarte a una columna o al voltear; −15 al retirar de una base; −2 al deshacer y cada 10 segundos. Volver a pasar el mazo resta 100 al robar una, o 20 después de tres pasadas al robar tres. Las partidas cronometradas ganadas en al menos 30 segundos reciben una bonificación por tiempo.</p>
      <p>Minimizar o dejar la pestaña oculta pausa el reloj. Cerrar termina la partida.</p>
    </ClassicDialog>}
    {dialog === 'deck' && <ClassicDialog title="Reverso de las cartas" onClose={() => setDialog(null)}><BackChoices>{(['blue', 'red', 'castle'] as const).map((value) => <button key={value} type="button" aria-label={{ blue: 'Azul geométrico', red: 'Rojo clásico', castle: 'Castillo' }[value]} aria-pressed={back === value} onClick={() => setBack(value)}><SolitaireCard back={value} /></button>)}</BackChoices></ClassicDialog>}
    {dialog === 'options' && <ClassicDialog title="Opciones de Solitario" closeLabel="Cancelar" onClose={() => setDialog(null)}><OptionsForm options={game.options} onApply={(options) => reset(false, options)} /></ClassicDialog>}
    {(dialog === 'new' || dialog === 'restart') && <ClassicDialog title="Repartir cartas" closeLabel="Seguir jugando" onClose={() => setDialog(null)} actions={<button type="button" onClick={() => reset(dialog === 'restart')}>Repartir</button>}><p>{dialog === 'restart' ? '¿Quieres empezar de nuevo con las mismas cartas?' : '¿Quieres abandonar la partida actual y repartir otra?'}</p></ClassicDialog>}
    {game.won && !wonDismissed && <ClassicDialog title="¡Has ganado!" closeLabel="Ver mesa" onClose={() => setWonDismissed(true)} actions={<button type="button" onClick={() => reset()}>Nueva partida</button>}><p>Has completado las cuatro bases. ¡Enhorabuena!</p><p>{game.score} puntos · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · {game.moves} movimientos</p></ClassicDialog>}
  </Panel>
}
