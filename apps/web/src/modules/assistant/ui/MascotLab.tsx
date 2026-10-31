import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import styled from '@emotion/styled'
import type { MascotController, MascotMode } from '../application/mascot-controller'
import { SvgMascot } from './SvgMascot'

const motionQuery = '(prefers-reduced-motion: reduce)'
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const prefersReducedMotion = () => window.matchMedia(motionQuery).matches

const Dock = styled.aside`
  position: fixed;
  right: 12px;
  bottom: calc(var(--os-taskbar-height) + 12px);
  z-index: 1050;
  width: min(360px, calc(100vw - 24px));
  max-height: calc(100dvh - var(--os-taskbar-height) - 24px);
  overflow: auto;
  font-size: 12px;
  color: var(--os-window-text);
`
const Stage = styled.div`
  width: min(200px, 100%);
  aspect-ratio: 1;
  margin-left: auto;
`
const Panel = styled.div`
  padding: 3px;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);
`
const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-weight: 700;
`
const Body = styled.div`
  display: grid;
  gap: 10px;
  padding: 10px;
  p { margin: 0; line-height: 1.4; }
  fieldset { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; border: 0; }
  legend { margin-bottom: 6px; }
`
const Button = styled.button`
  padding: 5px 8px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-toolbar);
  font: inherit;
  cursor: pointer;
  &[aria-pressed='true'] { border: var(--os-inset-border); background: var(--os-selected); }
  &:disabled { opacity: 0.55; cursor: default; }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`
const Row = styled.div`display: flex; align-items: center; flex-wrap: wrap; gap: 8px;`

const modes: { mode: MascotMode; label: string }[] = [
  { mode: 'idle', label: 'Reposo' },
  { mode: 'listening', label: 'Escucha' },
  { mode: 'thinking', label: 'Pensando' },
]

export default function MascotLab() {
  const controller = useRef<MascotController | null>(null)
  const [open, setOpen] = useState(true)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<MascotMode>('idle')
  const [face, setFace] = useState('Reposo')
  const [manualPause, setManualPause] = useState<boolean | null>(null)
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => true)
  const paused = manualPause ?? reducedMotion
  const onReady = useCallback((value: MascotController | null) => {
    controller.current = value
    setReady(value !== null)
  }, [])

  function select(next: MascotMode) {
    controller.current?.select(next)
    setMode(next)
  }

  return (
    <Dock aria-label="Pruebas del asistente" onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}
      onKeyDown={(event) => event.stopPropagation()}>
      {open ? <>
        <Stage>
          <SvgMascot paused={paused} onReady={onReady} onStateChange={setFace} />
        </Stage>
        <Panel>
          <Title><span>Asistente · pruebas locales</span><Button type="button" aria-label="Ocultar laboratorio" onClick={() => setOpen(false)}>×</Button></Title>
          <Body>
            <p>Solo avatar; todavía sin chatbot ni conexión a IA.</p>
              <p role="status">{!ready ? 'Preparando avatar…' : paused ? 'Animación en pausa' : `Estado: ${face}`}</p>
              <fieldset disabled={!ready || paused}>
                <legend>Probar expresiones</legend>
                {modes.map((item) => <Button key={item.mode} type="button" aria-pressed={mode === item.mode} onClick={() => select(item.mode)}>{item.label}</Button>)}
                <Button type="button" onClick={() => { controller.current?.answer(); setMode('idle') }}>Respuesta</Button>
              </fieldset>
              <Row>
                <Button type="button" disabled={!ready} onClick={() => setManualPause(!paused)}>{paused ? 'Reanudar' : 'Pausar'}</Button>
              </Row>
              {reducedMotion && <p>Movimiento reducido detectado. Puedes reanudar manualmente para probar.</p>}
          </Body>
        </Panel>
      </> : <Button type="button" onClick={() => { setMode('idle'); setOpen(true) }}>Mostrar asistente de prueba</Button>}
    </Dock>
  )
}
