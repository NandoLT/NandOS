import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styled from '@emotion/styled'
import { AppMenuBar } from '../../../shared/ui/AppMenuBar'
import { ClassicDialog } from '../../../shared/ui/ClassicDialog'
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
  padding: 6px 10px; background: #111; color: #ffa33c; font: 12px/1.4 monospace; border: var(--os-inset-border);
  strong { color: #fff0c7; } span:last-child { color: #a5bbcc; }
  @container (max-width: 560px) { display: flex; }
`
const Cabinet = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 5px; padding: 4px; flex: 1; min-height: 0; background: #08090d;
  @container (max-width: 560px) { grid-template-columns: minmax(0, 1fr); > aside { display: none; } }
`
const ScorePanel = styled.aside`
  display: flex; flex-direction: column; gap: 7px; padding: 5px; min-height: 0; overflow: auto;
  background: #0a090c; border: 3px ridge #a4a4a4; color: #c3a0f1;
  h2 { margin: 8px 0 2px; text-align: center; color: #c3a0f1; font: italic bold 36px/.86 Georgia, serif; text-shadow: 2px 2px #61458e; transform: rotate(-6deg); }
  h2 small { display: block; font: bold 13px/1.5 monospace; letter-spacing: 1px; transform: rotate(6deg); }
  svg { display: block; width: 100%; height: 90px; }
  section { padding: 7px; border: 3px ridge #8b8b8b; font: 12px/1.5 monospace; }
  section strong { display: block; font: bold 24px/1.4 monospace; color: #d8c2fc; font-variant-numeric: tabular-nums; }
  section p { margin: 0; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 5px; margin: 0; font: 11px/1.5 monospace; }
  dd { margin: 0; color: #e5c675; } dt { color: #a9a0b5; }
  meter { display: block; width: 100%; height: 12px; margin-top: 7px; }
  footer { margin-top: auto; padding-top: 6px; color: #9c92a9; text-align: center; font: 10px/1.5 monospace; }
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
const Controls = styled.div`
  display: flex; gap: 5px; align-items: stretch; padding: 4px;
  button { flex: 1; min-width: 0; min-height: 32px; padding: 5px 8px; border: var(--os-raised-border); background: var(--os-window); color: var(--os-window-text); font: inherit; touch-action: none; user-select: none; }
  button[aria-pressed='true'] { border: var(--os-inset-border); background: #c8d2e0; }
  button:focus-visible { outline: 1px dotted currentColor; outline-offset: -5px; }
`
const Footer = styled.div`
  padding: 3px 7px; border: var(--os-inset-border); font-size: 11px; line-height: 1.4;
  /* Keep the floating assistant launcher clear of the touch controls. */
  @media (max-width: 640px) { min-height: 48px; padding-right: 116px; }
`
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <Overlay><p>No se ha podido iniciar el tablero 3D.</p><p>Comprueba que tu navegador tenga WebGL activado y vuelve a abrir Pinball.</p></Overlay> : this.props.children }
}
const keyControl = (code: string): PinballControl | undefined => ({ ArrowLeft: 'left', KeyZ: 'left', ArrowRight: 'right', Slash: 'right', Space: 'launch' } as Record<string, PinballControl>)[code]
const emptySnapshot: PinballSnapshot = { ready: true, charge: 0, shots: 0, drains: 0, hits: 0 }
export function PinballWindow({ isPaused, isActive, onClose }: { isPaused: boolean; isActive: boolean; onClose: () => void }) {
  const [manualPause, setManualPause] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [blurred, setBlurred] = useState(false)
  const [help, setHelp] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [releaseKey, setReleaseKey] = useState(0)
  const [snapshot, setSnapshot] = useState(emptySnapshot)
  const [pressed, setPressed] = useState<PinballInputs>({ left: false, right: false, launch: false })
  const inputs = useRef<PinballInputs>({ left: false, right: false, launch: false })
  const sources = useRef<Record<PinballControl, Set<string>>>({ left: new Set(), right: new Set(), launch: new Set() })
  const panel = useRef<HTMLDivElement>(null)
  const paused = isPaused || !isActive || manualPause || hidden || blurred || help
  const supported = typeof window.WebGL2RenderingContext !== 'undefined'
  useEffect(() => { if (isActive && !isPaused) panel.current?.focus({ preventScroll: true }) }, [isActive, isPaused])
  const clear = useCallback(() => {
    for (const value of Object.values(sources.current)) value.clear()
    inputs.current = { left: false, right: false, launch: false }
    setPressed({ ...inputs.current }); setReleaseKey((value) => value + 1)
  }, [])
  const control = useCallback((name: PinballControl, source: string, down: boolean) => {
    if (down && (paused || !ready)) return
    if (down) sources.current[name].add(source)
    else sources.current[name].delete(source)
    inputs.current[name] = sources.current[name].size > 0
    setPressed({ ...inputs.current })
  }, [paused, ready])
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
  const restart = useCallback(() => { clear(); setReady(false); setFailed(false); setSnapshot(emptySnapshot); setRevision((value) => value + 1); setManualPause(false); panel.current?.focus() }, [clear])
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
      { name: 'Juego', commands: [{ label: 'Reiniciar ensayo · F2', run: restart }, { label: manualPause ? 'Continuar · P' : 'Pausar · P', run: () => setManualPause((value) => !value) }, { label: 'Salir', run: onClose }] },
      { name: 'Ayuda', commands: [{ label: 'Cómo jugar', run: () => setHelp(true) }] },
    ]} />
    <Dashboard><strong>PINBALL · PROTOTIPO</strong><span>LANZAMIENTOS {snapshot.shots} · SALIDAS {snapshot.drains} · REBOTES {snapshot.hits}</span><span>Intentos ilimitados</span></Dashboard>
    <Cabinet><Stage aria-label="Tablero tridimensional de Pinball" onPointerDown={() => panel.current?.focus({ preventScroll: true })}>
      {supported && !failed ? <SceneBoundary key={revision} onError={sceneError}><Suspense fallback={null}><Scene paused={paused} releaseKey={releaseKey} inputs={inputs} onSnapshot={setSnapshot} onReady={sceneReady} onError={sceneError} /></Suspense></SceneBoundary> : <Overlay><p>{failed ? 'No se han podido cargar las físicas.' : 'Este navegador no dispone de WebGL 2.'}</p><p>Prueba con la aceleración gráfica activada en un navegador compatible.</p></Overlay>}
      {supported && !failed && !ready && <Overlay><p>Preparando el tablero 3D…</p></Overlay>}
      {ready && !failed && paused && <Overlay><p>Partida en pausa</p>{manualPause && <button type="button" onClick={() => { setManualPause(false); panel.current?.focus() }}>Continuar</button>}</Overlay>}

    </Stage>
    <ScorePanel aria-label="Panel de Space Cadet">
      <div><h2><small>3D PINBALL</small>Space<br />Cadet</h2><CadetEmblem /></div>
      <section aria-label="Lanzamientos del ensayo">LANZAMIENTOS<strong>{String(snapshot.shots).padStart(6, '0')}</strong></section>
      <section><p>ENSAYO LIBRE</p><p>{paused ? 'Partida en pausa' : snapshot.ready ? 'Esperando lanzamiento' : 'Bola en juego'}</p><meter aria-label="Carga del lanzador" min={0} max={1} value={snapshot.charge} /></section>
      <section><dl><dt>REBOTES</dt><dd>{snapshot.hits}</dd><dt>SALIDAS</dt><dd>{snapshot.drains}</dd><dt>INTENTOS</dt><dd>∞</dd></dl></section>
      <footer>RECREACIÓN · NANDOS<br />Tablero en desarrollo</footer>
    </ScorePanel></Cabinet>
    <Controls aria-label="Controles de Pinball">{(['left', 'launch', 'right'] as const).map((name) => <button key={name} type="button" disabled={!ready || failed || paused} aria-pressed={pressed[name]}
      aria-label={name === 'left' ? 'Flipper izquierdo' : name === 'right' ? 'Flipper derecho' : 'Cargar y lanzar bola'}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); panel.current?.focus(); control(name, 'pointer-' + event.pointerId, true) }}
      onPointerUp={(event) => control(name, 'pointer-' + event.pointerId, false)} onPointerCancel={clear} onLostPointerCapture={(event) => { if (sources.current[name].has('pointer-' + event.pointerId)) clear() }}
      onKeyDown={(event) => { if (event.code === 'Enter') { event.preventDefault(); control(name, 'enter', true) } }}
      onKeyUp={(event) => { if (event.code === 'Enter') { event.preventDefault(); control(name, 'enter', false) } }}>
      {name === 'left' ? '◀ Izquierdo' : name === 'right' ? 'Derecho ▶' : 'Lanzador'}
    </button>)}</Controls>
    <Footer role="status">{snapshot.ready ? pressed.launch ? 'Carga: ' + Math.round(snapshot.charge * 100) + ' %. Suelta para lanzar.' : 'Mantén Espacio o Lanzador y suelta para lanzar.' : '← / Z y → / /: flippers · P: pausa · F2: reiniciar'}</Footer>
    {help && <ClassicDialog title="Pinball · Cómo jugar" onClose={() => setHelp(false)}><p>Mantén pulsado Espacio o el muelle del lanzador para comprimir el muelle; suelta para lanzar. Una carga suave puede volver al carril para reintentarlo, sin perder la bola.</p><p>Usa ← o Z para el flipper izquierdo y → o / para el derecho. Puedes pulsar los dos a la vez. En móvil, mantén los botones inferiores.</p><p>P pausa la partida y F2 reinicia el ensayo. Al perder la bola volverá al lanzador: tienes intentos ilimitados.</p><p>Este primer prototipo sirve para ajustar el tacto. Los carriles curvos ya son jugables. La puntuación, las misiones, el sonido y las rampas elevadas llegarán en los siguientes bloques.</p></ClassicDialog>}
  </Panel>
}
