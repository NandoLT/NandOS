import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import { ClassicDialog } from '../../../shared/ui/ClassicDialog'
import { createPinballGame, pinballMessage } from '../domain/pinball-game'
import type { PinballMode } from '../domain/pinball-game'
import type { PinballControl, PinballInputs, PinballSnapshot } from '../domain/pinball'

const Scene = lazy(() => import('./PinballScene').then((module) => ({ default: module.PinballScene })))
const Panel = styled.div`
  display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--os-window-text); background: var(--os-window); font-size: 12px; container-type: inline-size;
  &:focus { outline: none; }
`
const Stage = styled.div`
  position: relative; flex: 1; min-height: 160px; overflow: hidden; background: #080e1c; border: var(--os-inset-border);
  canvas { display: block; touch-action: none; }
`
const Overlay = styled.div`
  position: absolute; inset: 0; display: grid; place-content: center; padding: 18px; text-align: center;
  color: #e6f1ff; background: #080e1ccc; z-index: 1; line-height: 1.5;
  p { margin: 4px; } button { margin: 10px auto 0; }
`
const Dashboard = styled.div`
  display: none; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 12px;
  padding: 4px 8px; background: #100b19; color: #ffd18c; font: 12px/1.4 monospace; border: var(--os-inset-border);
  strong { color: #e9d1ff; } span:last-child { color: #e3c3ee; }
  @container (max-width: 560px) { display: flex; }
`
const Cabinet = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) clamp(174px, 27%, 260px); gap: 5px; padding: 4px; flex: 1; min-height: 0; background: #08090d;
  @container (max-width: 560px) { grid-template-columns: minmax(0, 1fr); > aside { display: none; } }
`
const ScorePanel = styled.aside`
  display: flex; flex-direction: column; gap: 8px; padding: 7px; min-height: 0; overflow: auto; container-type: size;
  background: radial-gradient(ellipse at 50% 10%, #201333, #090810 63%); border: 2px solid #968a9b; color: #d6adef;
  h2 { margin: 10px 0 3px; text-align: center; color: #e2b4ff; font: italic bold clamp(27px, 10cqh, 60px)/.86 Georgia, serif; text-shadow: 2px 3px #6d459a; transform: rotate(-6deg); }
  h2 small { display: block; margin-bottom: 4px; font: bold 13px/1.5 monospace; letter-spacing: 2px; transform: rotate(6deg); }
  svg { display: block; width: 100%; height: clamp(42px, 17cqh, 120px); }
  section { padding: 7px; border: 2px inset #8b8b8b; background: #020203; font: 12px/1.5 monospace; }
  section strong { display: block; font: bold clamp(22px, 15cqw, 36px)/1.35 monospace; text-shadow: 1px 0 #9874b6; color: #f0d9ff; font-variant-numeric: tabular-nums; }
  h3 { margin: 0 0 3px; font: inherit; letter-spacing: 1px; }
  ul { list-style: none; margin: 0; padding: 0; color: #f5e8ff; }
  li { display: flex; align-items: baseline; gap: 5px; }
  li span:first-child { color: #e2adff; }
  .ball { color: #fa738d; font: bold 16px/1.5 monospace; text-align: right; }
  .ball b { color: #c9aff5; font-size: 23px; padding: 0 7px; border: 1px solid #625c67; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 5px; margin: 0; font: 11px/1.5 monospace; }
  dd { margin: 0; color: #e5c675; } dt { color: #a9a0b5; }
`
function CadetEmblem() {
  return <svg viewBox="0 0 180 100" aria-hidden="true">
    <circle cx="25" cy="31" r="16" fill="#60743d" /><path d="M10 27h24M15 19l20 9M13 37l17-3" stroke="#849552" strokeWidth="3" />
    <path d="m44 76 18-35 54-16 43 30-31 26-62 9Z" fill="#716d75" stroke="#c9c4c4" strokeWidth="2" />
    <path d="m48 73 27-25 52-12 26 18-27 17-55 14Z" fill="#aaa6a6" />
    <path d="m92 27 23-12 15 24 14 9-34 12-27-8Z" fill="#c3c0b9" stroke="#5a5366" strokeWidth="2" />
    <path d="m99 31 13-10 13 19-22 6Z" fill="#6cb7bd" /><path d="m112 24 9 15-9 1Z" fill="#b5d9cd" />
    <path d="m133 63 20 4-23 13-13-3Z" fill="#94664e" /><path d="m139 65 14 3-17 7Z" fill="#deb766" />
    <ellipse cx="72" cy="70" rx="12" ry="7" fill="#47464e" /><path d="m37 83 10-2M156 17l8 1M61 10l2 7" stroke="#ddcdad" strokeWidth="2" />
  </svg>
}
// Keep equivalent keyboard/screen-reader buttons without reserving any board height.
const Controls = styled.div`
  position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%);
  &:focus-within { inset: auto 8px 8px; width: auto; height: auto; display: flex; gap: 5px; clip-path: none; z-index: 2; }
  button { min-height: 32px; padding: 5px 8px; border: var(--os-raised-border); background: var(--os-window); color: var(--os-window-text); font: inherit; touch-action: none; }
  button:focus-visible { outline: 1px dotted currentColor; outline-offset: -5px; }
`
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <Overlay><p>No se ha podido iniciar el tablero 3D.</p><p>Comprueba que tu navegador tenga WebGL activado y vuelve a abrir Pinball.</p></Overlay> : this.props.children }
}
const keyControl = (code: string): PinballControl | undefined => ({ ArrowLeft: 'left', KeyZ: 'left', ArrowRight: 'right', Slash: 'right', Space: 'launch' } as Record<string, PinballControl>)[code]
const emptySnapshot = (mode: PinballMode): PinballSnapshot => ({ ready: true, charge: 0, shots: 0, drains: 0, hits: 0, game: createPinballGame(mode) })
export function PinballWindow({ isPaused, isActive, onClose }: { isPaused: boolean; isActive: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<PinballMode>('classic')
  const [manualPause, setManualPause] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [blurred, setBlurred] = useState(false)
  const [help, setHelp] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [releaseKey, setReleaseKey] = useState(0)
  const [snapshot, setSnapshot] = useState(() => emptySnapshot('classic'))
  const [pressed, setPressed] = useState<PinballInputs>({ left: false, right: false, launch: false })
  const inputs = useRef<PinballInputs>({ left: false, right: false, launch: false })
  const sources = useRef<Record<PinballControl, Set<string>>>({ left: new Set(), right: new Set(), launch: new Set() })
  const panel = useRef<HTMLDivElement>(null)
  const gameOver = snapshot.game.phase === 'over'
  const objectives = [
    { label: 'Completa ambos bancos', done: snapshot.game.targets.every(Boolean) },
    { label: 'Recorre la órbita superior', done: snapshot.game.orbit },
  ]
  const paused = isPaused || !isActive || manualPause || hidden || blurred || help
  const supported = typeof window.WebGL2RenderingContext !== 'undefined'
  useEffect(() => { if (isActive && !isPaused) panel.current?.focus({ preventScroll: true }) }, [isActive, isPaused])
  const clear = useCallback(() => {
    for (const value of Object.values(sources.current)) value.clear()
    inputs.current = { left: false, right: false, launch: false }
    setPressed({ ...inputs.current }); setReleaseKey((value) => value + 1)
  }, [])
  const control = useCallback((name: PinballControl, source: string, down: boolean) => {
    if (down && (paused || !ready || gameOver)) return
    if (down) sources.current[name].add(source)
    else sources.current[name].delete(source)
    inputs.current[name] = sources.current[name].size > 0
    setPressed({ ...inputs.current })
  }, [paused, ready, gameOver])
  // Fiber consumes these events internally; handle cancellation at the DOM boundary.
  const cancelPointer = (event: PointerEvent<HTMLElement>) => {
    const source = 'pointer-' + event.pointerId
    for (const name of ['left', 'right', 'launch'] as const) {
      const held = sources.current[name]
      if (!held.has(source)) continue
      control(name, source, false)
      if (name === 'launch' && !held.size) setReleaseKey((value) => value + 1)
    }
  }
  useEffect(() => { if (paused) clear() }, [paused, clear])
  useEffect(() => {
    const visibility = () => { setHidden(document.hidden); clear() }
    const blur = () => { setBlurred(true); clear() }
    const focus = () => setBlurred(false)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('blur', blur); window.addEventListener('focus', focus)
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus) }
  }, [clear])
  const sceneReady = useCallback(() => setReady(true), [])
  const sceneError = useCallback(() => setFailed(true), [])
  const restart = useCallback((nextMode: PinballMode = mode) => { clear(); setMode(nextMode); setReady(false); setFailed(false); setSnapshot(emptySnapshot(nextMode)); setRevision((value) => value + 1); setManualPause(false); panel.current?.focus() }, [clear, mode])
  useEffect(() => {
    if (!isActive || isPaused) return
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target instanceof HTMLElement && event.target.closest('nav, dialog, input, textarea, [contenteditable="true"]')) return
      if (event.code === 'F2') { event.preventDefault(); restart(); return }
      if (event.code === 'KeyP') { event.preventDefault(); if (!event.repeat) setManualPause((value) => !value); return }
      const name = keyControl(event.code)
      if (name) { event.preventDefault(); control(name, event.code, true) }
    }
    const up = (event: KeyboardEvent) => { const name = keyControl(event.code); if (name) { event.preventDefault(); control(name, event.code, false) } }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [isActive, isPaused, control, restart])
  return <Panel ref={panel} tabIndex={0} aria-label="Juego de Pinball"
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) clear() }}>
    <AppMenuBar label="Menús de Pinball" onOpen={clear} menus={[
      { name: 'Juego', commands: [{ label: 'Nueva partida · F2', run: () => restart() }, { label: (mode === 'classic' ? '✓ ' : '') + 'Partida clásica · 3 bolas', run: () => restart('classic') }, { label: (mode === 'practice' ? '✓ ' : '') + 'Ensayo libre', run: () => restart('practice') }, { label: manualPause ? 'Continuar · P' : 'Pausar · P', run: () => setManualPause((value) => !value) }, { label: 'Salir', run: onClose }] },
      { name: 'Ayuda', commands: [{ label: 'Cómo jugar', run: () => setHelp(true) }] },
    ]} />
    <Dashboard><strong>{snapshot.game.score.toLocaleString('es-ES')} PUNTOS</strong><span>BOLA {snapshot.game.ball}{mode === 'classic' ? ' / 3' : ' · LIBRE'}</span><span>{pinballMessage(snapshot.game)}</span></Dashboard>
    <Cabinet><Stage aria-label="Tablero tridimensional de Pinball" onPointerDown={() => panel.current?.focus({ preventScroll: true })}
      onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer}>
      {supported && !failed ? <SceneBoundary key={revision} onError={sceneError}><Suspense fallback={null}><Scene mode={mode} paused={paused} releaseKey={releaseKey} inputs={inputs} onControl={control} onSnapshot={setSnapshot} onReady={sceneReady} onError={sceneError} /></Suspense></SceneBoundary> : <Overlay><p>{failed ? 'No se han podido cargar las físicas.' : 'Este navegador no dispone de WebGL 2.'}</p><p>Prueba con la aceleración gráfica activada en un navegador compatible.</p></Overlay>}
      {supported && !failed && !ready && <Overlay><p>Preparando el tablero 3D…</p></Overlay>}
      {gameOver && !paused && <Overlay><p>FIN DE PARTIDA</p><p>{snapshot.game.score.toLocaleString('es-ES')} puntos</p><button type="button" onClick={() => restart()}>Nueva partida · F2</button></Overlay>}
      {ready && !failed && paused && <Overlay><p>Partida en pausa</p>{manualPause && <button type="button" onClick={() => { setManualPause(false); panel.current?.focus() }}>Continuar</button>}</Overlay>}
    <Controls aria-label="Controles de Pinball">{(['left', 'launch', 'right'] as const).map((name) => <button key={name} type="button" disabled={!ready || failed || paused || gameOver} aria-pressed={pressed[name]}
      aria-label={name === 'left' ? 'Flipper izquierdo' : name === 'right' ? 'Flipper derecho' : 'Cargar y lanzar bola'}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); panel.current?.focus(); control(name, 'pointer-' + event.pointerId, true) }}
      onPointerUp={(event) => control(name, 'pointer-' + event.pointerId, false)}
      onKeyDown={(event) => { if (event.code === 'Enter') { event.preventDefault(); control(name, 'enter', true) } }}
      onKeyUp={(event) => { if (event.code === 'Enter') { event.preventDefault(); control(name, 'enter', false) } }}>
      {name === 'left' ? '◀ Izquierdo' : name === 'right' ? 'Derecho ▶' : 'Lanzador'}
    </button>)}</Controls>
    </Stage>
    <ScorePanel aria-label="Panel de Space Cadet">
      <div><h2><small>3D PINBALL</small>Space<br />Cadet</h2><CadetEmblem /></div>
      <div className="ball">BOLA <b>{snapshot.game.ball}</b></div>
      <section aria-label="Puntuación">JUGADOR 1<strong>{String(snapshot.game.score).padStart(8, '0')}</strong></section>
      <section aria-label="Estado de misión"><h3>MISIONES</h3><ul>
        {objectives.map(({ label, done }) => <li key={label}><span aria-label={done ? 'Completado' : 'Pendiente'}>{done ? '☑' : '☐'}</span>{label}</li>)}
      </ul></section>
      <section><dl><dt>RANGO</dt><dd>CADETE</dd><dt>MISIONES</dt><dd>{objectives.filter(({ done }) => done).length} / {objectives.length}</dd><dt>MODALIDAD</dt><dd>{mode === 'classic' ? '3 BOLAS' : 'LIBRE'}</dd></dl></section>
    </ScorePanel></Cabinet>
    {help && <ClassicDialog title="Pinball · Cómo jugar" onClose={() => setHelp(false)}><p>Mantén pulsado Espacio o el muelle para cargar; suelta para lanzar. Una carga suave puede volver al carril sin perder la bola.</p><p>Usa ← o Z para el flipper izquierdo y → o / para el derecho. En móvil, pulsa directamente sobre los flippers y el muelle. P pausa y F2 reinicia. Juego &gt; Ensayo libre permite practicar sin límite.</p><p>Recorre la órbita superior y golpea los dos bancos amarillos. Cada objetivo da un bono una vez por partida. Los carriles IN devuelven la bola a los flippers; por los carriles OUT se pierde. Si la bola queda inmóvil, la búsqueda automática la devuelve al lanzador sin descontarla.</p></ClassicDialog>}
  </Panel>
}
