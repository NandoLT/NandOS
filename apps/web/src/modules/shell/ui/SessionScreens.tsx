import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import styled from '@emotion/styled'
import { prefersReducedMotion } from '../../../shared/lib/input-preferences'

const Screen = styled.main`
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 20px;
  color: var(--os-window-text);
  background-color: var(--os-desktop);
  background-image: var(--os-desktop-pattern);
  background-size: var(--os-desktop-pattern-size);
  font-family: var(--os-font-family);
`

const Panel = styled.section`
  width: min(560px, calc(100vw - 32px));
  overflow: hidden;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);
`

const WindowTitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 3px 6px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 13px;
  font-weight: 700;
  user-select: none;

  span:first-of-type { font-size: 14px; }
`

const PanelContent = styled.div`
  padding: clamp(16px, 4vw, 26px);
`

const Eyebrow = styled.div`
  margin-bottom: 10px;
  color: var(--os-accent);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
`

const Heading = styled.h1`
  margin: 0 0 8px;
  color: var(--os-window-text);
  font-family: var(--os-font-family);
  font-size: clamp(18px, 5vw, 22px);
`

const Subheading = styled.p`
  margin: 0 0 18px;
  color: var(--os-muted);
  font-family: var(--os-font-family);
  font-size: 13px;
  line-height: 1.5;
`

const BootOutput = styled.div`
  display: grid;
  gap: 7px;
  min-height: 142px;
  align-content: start;
  padding: 12px;
  border: var(--os-inset-border);
  color: #d5f7d5;
  background: #050805;
  font-family: 'Courier New', monospace;
`

const BootLine = styled.div`
  color: #d5f7d5;
  font-size: 12px;
  line-height: 1.4;
  animation: appear 120ms steps(2, end);

  span {
    color: #6bff6b;
    font-weight: 700;
  }

  @keyframes appear {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const ProgressTrack = styled.div`
  height: 18px;
  margin-top: 14px;
  overflow: hidden;
  padding: 2px;
  border: var(--os-inset-border);
  background: var(--os-window);
`

const Progress = styled.div<{ $value: number }>`
  width: ${({ $value }) => `${$value}%`};
  height: 100%;
  background: repeating-linear-gradient(90deg, var(--os-accent) 0 10px, var(--os-window) 10px 12px);
  transition: width 180ms steps(5, end);
`

const GhostButton = styled.button`
  margin-top: 16px;
  padding: 6px 12px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  font-family: var(--os-font-family);
  cursor: pointer;

  &:active { border-style: inset; }

  &:hover,
  &:focus-visible {
    outline: 1px dotted var(--os-window-text);
    outline-offset: -5px;
  }
`

const LoginPanel = styled(Panel)`
  width: min(440px, calc(100vw - 32px));
`

const Avatar = styled.div`
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  background: var(--os-input-muted);
  font-size: 30px;
`

const LoginWelcome = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  h1 { margin-bottom: 5px; }
  p { margin: 0; }
`

const LoginForm = styled.form`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  gap: 10px 8px;

  label {
    color: var(--os-window-text);
    font-size: 12px;
  }

  input {
    min-width: 0;
    width: 100%;
    padding: 6px 7px;
    border: var(--os-inset-border);
    border-radius: var(--os-control-radius);
    color: var(--os-input-text);
    background: var(--os-input);
    font: 13px var(--os-font-family);
  }

  input[readonly] {
    color: var(--os-muted);
    background: var(--os-input-muted);
  }

  input:focus {
    outline: 1px dotted var(--os-accent);
    outline-offset: 1px;
  }
`

const LoginButton = styled.button`
  grid-column: 2;
  justify-self: end;
  min-width: 112px;
  margin-top: 4px;
  padding: 6px 12px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  cursor: pointer;

  &:active { border-style: inset; }

  &:hover,
  &:focus-visible {
    outline: 1px dotted var(--os-window-text);
    outline-offset: -5px;
  }
`

const Hint = styled.p`
  margin: 18px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--os-divider);
  color: var(--os-muted);
  font-size: 12px;
`

const QuickLoginButton = styled(LoginButton)`
  width: 100%;
  min-height: 44px;
  margin: 0 0 20px;
  color: var(--os-accent-text);
  background: var(--os-accent);
  font-weight: 700;
`

const ErrorMessage = styled.p`
  margin: 0;
  grid-column: 2;
  color: var(--os-danger);
  font-family: var(--os-font-family);
  font-size: 13px;
`

const startupLines = [
  'NANDOS BIOS · Power-on self test .............. OK',
  'Detecting virtual desktop ..................... OK',
  'Mounting profile volume ....................... OK',
  'Starting window manager ....................... OK',
  'Loading portfolio applications ................ OK',
]

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      onComplete()
      return
    }
    const intervalId = window.setInterval(() => {
      setVisibleLines((count) => Math.min(count + 1, startupLines.length))
    }, 390)
    const timeoutId = window.setTimeout(onComplete, 2300)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') onComplete()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onComplete])

  const progress = Math.round((visibleLines / startupLines.length) * 100)

  return (
    <Screen>
      <Panel aria-live="polite">
        <WindowTitleBar><span aria-hidden="true">▣</span>NandOS BIOS Setup</WindowTitleBar>
        <PanelContent>
          <Eyebrow>Autodiagnóstico del sistema</Eyebrow>
          <Heading>Iniciando NandOS</Heading>
          <Subheading>Preparando el escritorio personal de Fernando.</Subheading>
          <BootOutput>
            {startupLines.slice(0, visibleLines).map((line) => (
              <BootLine key={line}>{line.replace('OK', '')}<span>OK</span></BootLine>
            ))}
          </BootOutput>
          <ProgressTrack aria-label="Progreso de inicio">
            <Progress $value={progress} />
          </ProgressTrack>
          <GhostButton type="button" onClick={onComplete}>Omitir inicio</GhostButton>
        </PanelContent>
      </Panel>
    </Screen>
  )
}

export function GuestLogin({ onLogin, onAdminLogin }: { onLogin: () => void; onAdminLogin?: () => void }) {
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password === '12345') {
      onLogin()
      return
    }
    setHasError(true)
  }

  return (
    <Screen>
      <LoginPanel>
        <WindowTitleBar><span aria-hidden="true">🔑</span>NandOS · Inicio de sesión</WindowTitleBar>
        <PanelContent>
          <LoginWelcome>
            <Avatar aria-hidden="true">👤</Avatar>
            <div>
              <Eyebrow>Sesión de demostración</Eyebrow>
              <Heading>Bienvenido, Invitado</Heading>
              <Subheading>Escribe la contraseña para iniciar sesión.</Subheading>
            </div>
          </LoginWelcome>
          <QuickLoginButton type="button" autoFocus onClick={onLogin}>
            Entrar como invitado
          </QuickLoginButton>
          <LoginForm onSubmit={handleSubmit}>
            <label htmlFor="guest-name">Usuario:</label>
            <input id="guest-name" type="text" value="Invitado" readOnly />
            <label htmlFor="guest-password">Contraseña:</label>
            <input
              id="guest-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setHasError(false)
              }}
            />
            {hasError && <ErrorMessage role="alert">Contraseña incorrecta. Prueba con 12345.</ErrorMessage>}
            <LoginButton type="submit">Aceptar</LoginButton>
          </LoginForm>
          <Hint>Contraseña de demostración: 12345 · Este acceso no es una autenticación real.</Hint>
          {onAdminLogin && (
            <GhostButton type="button" onClick={onAdminLogin}>Acceso de administración</GhostButton>
          )}
        </PanelContent>
      </LoginPanel>
    </Screen>
  )
}

const shutdownLines = [
  'Cerrando la sesión de Invitado ................. OK',
  'Guardando el estado del escritorio ............ OK',
  'Deteniendo servicios visuales ................. OK',
  'NandOS se ha detenido.',
]

export function ShutdownScreen({ onRestart }: { onRestart: () => void }) {
  const [visibleLines, setVisibleLines] = useState(() => prefersReducedMotion() ? shutdownLines.length : 0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const intervalId = window.setInterval(() => {
      setVisibleLines((count) => {
        if (count >= shutdownLines.length - 1) window.clearInterval(intervalId)
        return Math.min(count + 1, shutdownLines.length)
      })
    }, 430)
    return () => window.clearInterval(intervalId)
  }, [])

  const isStopped = visibleLines === shutdownLines.length

  return (
    <Screen>
      <Panel aria-live="polite">
        <WindowTitleBar><span aria-hidden="true">⏻</span>NandOS · Apagando</WindowTitleBar>
        <PanelContent>
          <Eyebrow>Cierre de sesión</Eyebrow>
          <Heading>{isStopped ? 'Sistema detenido' : 'Apagando NandOS…'}</Heading>
          <BootOutput>
            {shutdownLines.slice(0, visibleLines).map((line) => (
              <BootLine key={line}>{line.replace('OK', '')}{line.includes('OK') && <span>OK</span>}</BootLine>
            ))}
          </BootOutput>
          {isStopped ? (
            <>
              <Subheading>Ya puedes cerrar esta pestaña. El servidor local sigue ejecutándose hasta que lo detengas desde su terminal.</Subheading>
              <GhostButton type="button" onClick={onRestart}>Volver a iniciar NandOS</GhostButton>
            </>
          ) : (
            <ProgressTrack aria-label="Progreso de apagado">
              <Progress $value={Math.round((visibleLines / shutdownLines.length) * 100)} />
            </ProgressTrack>
          )}
        </PanelContent>
      </Panel>
    </Screen>
  )
}
