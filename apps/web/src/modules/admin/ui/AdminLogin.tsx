import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import styled from '@emotion/styled'
import { ApiError, apiRequest } from '../../portfolio/infrastructure/http-client'

type BootstrapStatus = { configured: boolean; canSetup: boolean }

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
  width: min(460px, calc(100vw - 32px));
  overflow: hidden;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);
`

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 4px 8px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 13px;
  font-weight: 700;
`

const Content = styled.div`
  display: grid;
  gap: 14px;
  padding: clamp(18px, 5vw, 28px);
`

const Eyebrow = styled.div`
  color: var(--os-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Heading = styled.h1`
  margin: -8px 0 0;
  font-size: clamp(21px, 5vw, 26px);
`

const Description = styled.p`
  margin: -8px 0 0;
  color: var(--os-muted);
  font-size: 13px;
  line-height: 1.5;
`

const Form = styled.form`
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 11px 9px;

  label { font-size: 12px; }

  input {
    min-width: 0;
    padding: 8px;
    border: var(--os-inset-border);
    border-radius: var(--os-control-radius);
    color: var(--os-input-text);
    background: var(--os-input);
    font: 13px var(--os-font-family);
  }

  input:focus { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`

const Error = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  color: var(--os-danger);
  font-size: 13px;
  line-height: 1.45;
`

const Notice = styled.p`
  margin: 0;
  padding: 10px;
  border: var(--os-inset-border);
  color: var(--os-muted);
  background: var(--os-surface-alt);
  font-size: 12px;
  line-height: 1.45;
`

const Actions = styled.div`
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 34px;
  padding: 6px 12px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: ${({ $primary }) => $primary ? 'var(--os-accent-text)' : 'var(--os-window-text)'};
  background: ${({ $primary }) => $primary ? 'var(--os-accent)' : 'var(--os-window)'};
  font: 700 12px var(--os-font-family);
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: wait; }
  &:active:not(:disabled) { border-style: inset; }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`

type AdminLoginProps = {
  onAuthenticated: (username: string) => void
  onBackToGuest: () => void
}

export function AdminLogin({ onAuthenticated, onBackToGuest }: AdminLoginProps) {
  const [status, setStatus] = useState<BootstrapStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bootstrapKey, setBootstrapKey] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    apiRequest<BootstrapStatus>('auth/bootstrap-status')
      .then((result) => { if (active) setStatus(result) })
      .catch((reason: unknown) => {
        if (active) setStatusError(reason instanceof ApiError ? reason.message : 'No se pudo contactar con el servicio de administración.')
      })
    return () => { active = false }
  }, [])

  const isSetup = status?.configured === false && status.canSetup

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (isSetup && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      const result = await apiRequest<{ username: string }>(isSetup ? 'auth/setup' : 'auth/login', {
        method: 'POST',
        headers: isSetup ? { 'x-admin-bootstrap-key': bootstrapKey } : undefined,
        body: JSON.stringify({ username, password }),
      })
      onAuthenticated(result.username)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'No se pudo completar el acceso.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      <Panel>
        <TitleBar><span aria-hidden="true">🔐</span>NandOS · Administración</TitleBar>
        <Content>
          <Eyebrow>Acceso privado</Eyebrow>
          <Heading>{isSetup ? 'Configurar administrador' : 'Iniciar sesión'}</Heading>
          <Description>
            {isSetup
              ? 'Crea tu cuenta personal. La clave de instalación es de un solo uso; no hay credenciales predeterminadas.'
              : 'Acceso reservado al propietario del portfolio.'}
          </Description>

          {statusError ? (
            <Notice role="alert">{statusError} Comprueba que el API y la base de datos estén configurados.</Notice>
          ) : status && !status.configured && !status.canSetup ? (
            <Notice role="alert">La cuenta aún no está creada. Falta configurar una clave inicial segura en el servidor.</Notice>
          ) : !status ? (
            <Notice aria-live="polite">Comprobando el servicio de administración…</Notice>
          ) : (
            <Form onSubmit={submit}>
              {isSetup && <>
                <label htmlFor="bootstrap-key">Clave inicial:</label>
                <input
                  id="bootstrap-key"
                  type="password"
                  autoComplete="off"
                  value={bootstrapKey}
                  onChange={(event) => setBootstrapKey(event.target.value)}
                  required
                />
              </>}
              <label htmlFor="admin-username">Usuario:</label>
              <input
                id="admin-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={48}
                required
              />
              <label htmlFor="admin-password">Contraseña:</label>
              <input
                id="admin-password"
                type="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                maxLength={256}
                required
              />
              {isSetup && <>
                <label htmlFor="admin-password-confirm">Repite contraseña:</label>
                <input
                  id="admin-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={12}
                  maxLength={256}
                  required
                />
              </>}
              {error && <Error role="alert">{error}</Error>}
              <Actions>
                <Button type="button" onClick={onBackToGuest}>Volver a Invitado</Button>
                <Button type="submit" $primary disabled={submitting}>
                  {submitting ? 'Validando…' : isSetup ? 'Crear cuenta' : 'Entrar'}
                </Button>
              </Actions>
            </Form>
          )}

          {(statusError || (status && !status.configured && !status.canSetup) || !status) && (
            <Actions>
              <Button type="button" onClick={onBackToGuest}>Volver a Invitado</Button>
            </Actions>
          )}
        </Content>
      </Panel>
    </Screen>
  )
}
