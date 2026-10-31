import { useEffect, useRef, useState } from 'react'
import type { AppId } from '@nandoos/contracts'
import styled from '@emotion/styled'
import { WindowFrame } from '../../shell/ui/WindowFrame'
import type { WindowBounds } from '../../shell/domain/types'
import { actionLabels, suggestedQuestions, welcomeMessage } from '../domain/conversation'
import type { AssistantAction, ChatMessage, QuestionSource } from '../domain/conversation'
import { FaqMenu } from './FaqMenu'

interface Props {
  viewport: WindowBounds
  messages: ChatMessage[]
  source: QuestionSource | null
  draft: string
  pending: boolean
  error: string | null
  onDraft(value: string): void
  onSend(value: string, source?: QuestionSource): void
  onClear(): void
  onClose(): void
  onLaunchApp(id: AppId): void
}

const Layer = styled.div`
  position: fixed; inset: 0; z-index: 1040; pointer-events: none;
  > section { pointer-events: auto; }
`
const Layout = styled.div`
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  color: var(--os-window-text); font-size: 12px;
`
const Notice = styled.p`
  flex-shrink: 0; margin: 0; padding: 8px 10px; border-bottom: 1px solid var(--os-divider);
  line-height: 1.4; background: var(--os-notice); color: var(--os-window-text);
`
const History = styled.div`
  flex: 1; min-height: 0; overflow: auto; padding: 12px;
  background: var(--os-surface); color: var(--os-window-text); overscroll-behavior: contain;
`
const Message = styled.article<{ $user?: boolean }>`
  margin: 0 0 12px; padding: 10px; overflow-wrap: anywhere;
  border: 1px solid var(--os-divider);
  background: ${({ $user }) => $user ? 'var(--os-selected)' : 'var(--os-surface-alt)'};
  color: ${({ $user }) => $user ? 'var(--os-selected-text)' : 'var(--os-window-text)'};
  strong { display: block; margin-bottom: 5px; font-size: 11px; }
  p { margin: 0; line-height: 1.55; white-space: pre-wrap; }
`
export const AssistantButton = styled.button`
  padding: 6px 9px; min-height: 30px; border: var(--os-raised-border);
  border-radius: var(--os-control-radius); color: var(--os-window-text);
  background: var(--os-toolbar); font: inherit; cursor: pointer;
  &:hover:not(:disabled) { background: var(--os-selected); color: var(--os-selected-text); }
  &:active:not(:disabled) { border: var(--os-inset-border); }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: -4px; }
  &:disabled { opacity: .6; cursor: default; }
  @media (pointer: coarse) { min-height: 44px; }
`
const Suggestions = styled.div`
  display: grid; gap: 6px; margin: 10px 0;
  p { margin: 0 0 2px; font-weight: 700; }
  button { text-align: left; line-height: 1.4; }
`
const Actions = styled.div`display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px;`
const Composer = styled.form`
  display: grid; gap: 6px; padding: 10px; border-top: 1px solid var(--os-divider);
  flex-shrink: 0; background: var(--os-window);
  label { font-weight: 700; }
  textarea { width: 100%; min-height: 52px; max-height: 110px; resize: vertical; padding: 7px;
    border: var(--os-inset-border); border-radius: var(--os-control-radius);
    background: var(--os-input); color: var(--os-input-text); font: inherit; line-height: 1.4; }
  textarea:focus-visible { outline: 2px solid var(--os-accent); outline-offset: 1px; }
`
const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  small { color: var(--os-muted); font-size: 10px; line-height: 1.3; }
`

const apps: Record<AssistantAction, AppId> = {
  cv: 'cv-viewer', contact: 'contact', experience: 'experience', projects: 'projects', settings: 'settings', about: 'about',
}

export function AssistantChat({ viewport, messages, source, draft, pending, error, onDraft, onSend, onClear, onClose, onLaunchApp }: Props) {
  const [geometry, setGeometry] = useState(() => {
    const width = Math.min(410, viewport.width - 24)
    const height = Math.min(520, viewport.height - 24)
    const bounds = { x: Math.max(8, viewport.width - width - 224), y: Math.max(8, viewport.height - height - 12), width, height }
    return { bounds, previousBounds: bounds, isMaximized: false }
  })
  const history = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const bounds = {
    ...geometry.bounds,
    width: Math.min(geometry.bounds.width, viewport.width - 16),
    height: Math.min(geometry.bounds.height, viewport.height - 16),
    x: Math.max(8, Math.min(geometry.bounds.x, viewport.width - geometry.bounds.width - 8)),
    y: Math.max(8, Math.min(geometry.bounds.y, viewport.height - geometry.bounds.height - 8)),
  }
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => input.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    if (history.current) history.current.scrollTop = source !== 'faq' && (messages.length || pending || error) ? history.current.scrollHeight : 0
  }, [source, messages, pending, error])

  return <Layer onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}>
    <WindowFrame windowState={{ id: 'assistant', title: 'nandBot · Ayuda', icon: '💬', ...geometry, bounds, isMinimized: false, zIndex: 1 }}
      viewport={viewport} isActive onFocus={() => undefined} onClose={onClose} onMinimize={onClose}
      onMaximize={() => setGeometry((current) => current.isMaximized
        ? { ...current, isMaximized: false, bounds: current.previousBounds }
        : { isMaximized: true, previousBounds: bounds, bounds: { x: 8, y: 8, width: viewport.width - 16, height: viewport.height - 16 } })}
      onMove={(x, y) => setGeometry((current) => ({ ...current, bounds: { ...bounds, x, y } }))}
      onResize={(width, height) => setGeometry((current) => ({ ...current, bounds: { ...bounds, width: Math.max(340, width), height: Math.max(360, height) } }))}
      contentStyle={{ padding: 0, overflow: 'hidden' }}>
      <Layout>
        <Notice><strong>Demo local · sin IA</strong> — respuestas preparadas. La wiki se conectará más adelante.</Notice>
        <History ref={history} role="log" aria-label="Conversación con nandBot" aria-live="polite" aria-relevant="additions text" tabIndex={0}>
          {!messages.length && !pending ? <>
            <Message><strong>nandBot</strong><p>{welcomeMessage}</p></Message>
            <Suggestions aria-label="Preguntas sugeridas">
              <p>Puedes empezar por aquí:</p>
              {suggestedQuestions.map((question) => <AssistantButton key={question} type="button" onClick={() => onSend(question, 'faq')}>{question}</AssistantButton>)}
            </Suggestions>
          </> : null}
          {messages.map((message) => <Message key={message.id} $user={message.role === 'user'}>
            <strong>{message.role === 'user' ? 'Tú' : 'nandBot'}</strong><p>{message.text}</p>
            {message.role === 'assistant' && message.actions?.length ? <Actions>
              {message.actions.map((action) => <AssistantButton key={action} type="button" onClick={() => onLaunchApp(apps[action])}>{actionLabels[action]}</AssistantButton>)}
            </Actions> : null}
          </Message>)}
          {pending && <p role="status">nandBot está pensando…</p>}
          {error && <p role="alert">{error}</p>}
        </History>
        <FaqMenu onSelect={(question) => onSend(question, 'faq')} layoutKey={`${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}:${viewport.width}:${viewport.height}`} />
        <Composer onSubmit={(event) => { event.preventDefault(); onSend(draft) }}>
          <label htmlFor="nandbot-question">Tu pregunta</label>
          <textarea id="nandbot-question" ref={input} placeholder="Escribe tu pregunta…" value={draft} maxLength={1000} rows={2}
            onChange={(event) => onDraft(event.target.value)} aria-describedby="nandbot-privacy"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                if (!pending && draft.trim()) onSend(draft)
              }
            }} />
          <Footer><AssistantButton type="button" disabled={!messages.length && !pending} onClick={onClear}>Borrar conversación</AssistantButton>
            <AssistantButton type="submit" disabled={pending || !draft.trim()}>{pending ? 'Pensando…' : 'Enviar'}</AssistantButton></Footer>
          <Footer><small id="nandbot-privacy">La conversación se borra al cerrar. No envíes información sensible.</small><small>Enter: enviar · ⇧ Enter: salto</small></Footer>
        </Composer>
      </Layout>
    </WindowFrame>
  </Layer>
}
