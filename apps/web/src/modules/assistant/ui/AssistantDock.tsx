import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppId, PortfolioContent } from '@nandoos/contracts'
import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import type { WindowBounds } from '../../shell/domain/types'
import type { MascotController } from '../application/mascot-controller'
import type { AssistantService, QuestionSource } from '../domain/conversation'
import { useAssistantStore } from '../application/assistant.store'
import { useAssistantConversation } from '../application/useAssistantConversation'
import { demoAssistant } from '../infrastructure/demo-assistant'
import { SvgMascot } from './SvgMascot'
import { AssistantButton, AssistantChat } from './AssistantChat'
import { useReducedMotion } from './useReducedMotion'

const Dock = styled.aside<{ $chatOpen: boolean }>`
  position: fixed; right: 12px; bottom: calc(var(--os-taskbar-height) + 12px);
  width: 200px; z-index: 1050; font-size: 12px; color: var(--os-window-text);
  @media (max-width: 640px) { display: ${({ $chatOpen }) => $chatOpen ? 'none' : 'block'}; }
`
const Launcher = styled(AssistantButton)`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-left: auto; min-height: 44px; padding: 7px 12px; font-weight: 700;
`
const Tools = styled.div`
  display: flex; gap: 6px; justify-content: center;
  button { position: relative; width: 34px; height: 32px; padding: 6px; display: grid; place-items: center; }
  button::after { content: attr(aria-label); position: absolute; bottom: calc(100% + 6px); right: 0;
    display: none; width: max-content; max-width: 190px; padding: 5px 7px;
    border: 1px solid var(--os-border-dark); background: var(--os-notice); color: var(--os-window-text);
    font-size: 11px; line-height: 1.4; font-weight: normal; pointer-events: none; z-index: 1; }
  button:hover::after, button:focus-visible::after { display: block; }
  @media (pointer: coarse) { button { width: 44px; height: 44px; } }
`
const Mascot = styled.button`
  display: block; width: 200px; height: 200px; padding: 0; border: 0; background: transparent;
  cursor: pointer; color: inherit;
  &:focus-visible { outline: 2px dotted var(--os-desktop-text); outline-offset: -8px; }
`
const fallBounce = keyframes`
  0% { transform: translateY(calc(-100dvh - 200px)) rotate(-9deg) scale(.94, 1.06); animation-timing-function: cubic-bezier(.55, .05, .85, .5); }
  48% { transform: translateY(0) rotate(2deg) scale(1.14, .82); animation-timing-function: cubic-bezier(.15, .7, .3, 1); }
  67% { transform: translateY(-48px) rotate(-3deg) scale(.94, 1.06); animation-timing-function: ease-in; }
  82% { transform: translateY(0) rotate(1deg) scale(1.07, .93); animation-timing-function: ease-out; }
  92% { transform: translateY(-10px) rotate(-1deg) scale(.98, 1.02); animation-timing-function: ease-in; }
  100% { transform: translateY(0) rotate(0) scale(1); }
`
const Entrance = styled.div`
  transform-origin: 50% calc(100% - 32px); animation: ${fallBounce} 1050ms both;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`

function ToolIcon({ kind }: { kind: 'chat' | 'hide' | 'help' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'chat' || kind === 'help' ? <><path d="M4 3h16v13H10l-6 5V3Z" />{kind === 'help' ? <><path d="M9 7a3 3 0 0 1 6 0c0 2-3 2-3 4" /><path d="M12 13h.01" /></> : <><path d="M8 8h8M8 12h5" /></>}</> : null}
    {kind === 'hide' ? <><path d="m6 6 12 12M18 6 6 18" /></> : null}
  </svg>
}

interface Props { content: PortfolioContent; viewport: WindowBounds; onLaunchApp(id: AppId): void; service?: AssistantService }

export default function AssistantDock({ content, viewport, onLaunchApp, service = demoAssistant }: Props) {
  const { visible, chatOpen, messages, mode, show, hide, openChat, closeChat } = useAssistantStore()
  const [draft, setDraft] = useState('')
  const controller = useRef<MascotController | null>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLButtonElement>(null)
  const handledReply = useRef(0)
  const reducedMotion = useReducedMotion()
  const conversation = useAssistantConversation(service, content)
  const onReady = useCallback((value: MascotController | null) => { controller.current = value }, [])
  const onStateChange = useCallback(() => undefined, [])

  useEffect(() => {
    if (conversation.replyVersion > handledReply.current) {
      handledReply.current = conversation.replyVersion
      if (visible && chatOpen) { controller.current?.answer(); return }
    }
    controller.current?.select(conversation.pending ? 'thinking' : chatOpen && draft.trim() ? 'listening' : 'idle')
  }, [visible, chatOpen, draft, conversation.pending, conversation.replyVersion])

  useEffect(() => () => useAssistantStore.getState().closeChat(), [])

  const send = (value: string, source: QuestionSource = 'conversation') => {
    if (!value.trim() || (conversation.pending && source !== 'faq')) return
    setDraft('')
    void conversation.send(value, source)
  }
  const close = () => {
    conversation.clear()
    setDraft('')
    closeChat()
    window.requestAnimationFrame(() => bubble.current?.focus())
  }

  return <>
    <Dock aria-label="Asistente nandBot" $chatOpen={chatOpen} onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}>
      {!visible ? <Launcher ref={launcher} type="button" aria-label="¿Tienes dudas? Abrir asistente nandBot" onClick={() => {
        show()
        window.requestAnimationFrame(() => bubble.current?.focus())
      }}><ToolIcon kind="help" /><span>¿Tienes dudas?</span></Launcher> : <Entrance data-entrance="fall-bounce">
        <Tools role="group" aria-label="Acciones de nandBot">
          <AssistantButton ref={bubble} type="button" aria-label={chatOpen ? 'Minimizar chat' : 'Abrir chat con nandBot'} aria-expanded={chatOpen}
            onClick={() => chatOpen ? close() : openChat()}><ToolIcon kind="chat" /></AssistantButton>
          <AssistantButton type="button" aria-label="Ocultar asistente" onClick={() => {
            conversation.clear()
            setDraft('')
            hide()
            window.requestAnimationFrame(() => launcher.current?.focus())
          }}><ToolIcon kind="hide" /></AssistantButton>
        </Tools>
        <Mascot type="button" aria-label="Hablar con nandBot" onClick={openChat}>
          <SvgMascot paused={reducedMotion} onReady={onReady} onStateChange={onStateChange} />
        </Mascot>
      </Entrance>}
    </Dock>
    {chatOpen && visible ? <AssistantChat viewport={viewport} messages={messages} source={mode} draft={draft} pending={conversation.pending} error={conversation.error}
      onDraft={setDraft} onSend={send} onClear={() => { conversation.clear(); setDraft('') }} onClose={close}
      onLaunchApp={(id) => { conversation.clear(); setDraft(''); closeChat(); onLaunchApp(id) }} /> : null}
  </>
}
