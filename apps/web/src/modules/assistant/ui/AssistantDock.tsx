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
  margin-left: auto; min-height: 44px; padding: 5px 10px 5px 8px; font-weight: 700;
  white-space: nowrap;
  svg { width: 32px; height: 32px; flex: none; }
  [data-short] { display: none; }
  @media (max-width: 640px) {
    svg { width: 28px; height: 28px; }
    [data-full] { display: none; }
    [data-short] { display: inline; }
  }
`
const Tools = styled.div`
  position: absolute;
  left: calc(50% + 5px);
  bottom: calc(100% - 40px);
  z-index: 1;
  transform: translateX(-50%);
  display: flex; align-items: stretch; gap: 2px; padding: 2px;
  border: var(--os-raised-border); background: var(--os-toolbar);
  box-shadow: 2px 2px 0 #0004;
  button {
    position: relative; min-height: 26px; padding: 2px 5px;
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  }
  button + button { width: 26px; }
  svg { width: 16px; height: 16px; flex: none; }
  span { font-size: 11px; font-weight: 700; }
  button::after { content: attr(aria-label); position: absolute; bottom: calc(100% + 6px); right: 0;
    display: none; width: max-content; max-width: 190px; padding: 5px 7px;
    border: 1px solid var(--os-border-dark); background: var(--os-notice); color: var(--os-window-text);
    font-size: 11px; line-height: 1.4; font-weight: normal; pointer-events: none; z-index: 1; }
  button:focus-visible::after { display: block; }
  @media (hover: hover) { button:hover::after { display: block; } }
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
  position: relative; height: 200px;
  transform-origin: 50% calc(100% - 32px); animation: ${fallBounce} 1050ms both;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`

const launcherMascot = <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
  <path fill="#201e27" d="M5 4h22v2h2v17h2v6H1v-6h2V6h2Z" />
  <path fill="#f9deb1" d="M5 6h22v17H5Z" />
  <path fill="#a47c62" d="M25 6h2v17H5v-2h20Z" />
  <path fill="#fff0cc" d="M5 6h20v2H7v13H5Z" />
  <path fill="#101f36" d="M8 9h15v11H8Z" />
  <path fill="#54efed" d="M11 12h2v3h-2Zm7 0h2v3h-2Zm-5 4h5v2h-5Z" />
  <path fill="#e8bc91" d="M4 23h24v2h1v2H3v-2h1Z" />
  <path fill="#705446" d="M6 24h3v2H6Zm5 0h3v2h-3Zm5 0h3v2h-3Zm5 0h5v2h-5Z" />
</svg>

function ToolIcon({ kind }: { kind: 'chat' | 'hide' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'chat' ? <path d="M4 3h16v13H10l-6 5V3ZM8 8h8m-8 4h5" /> : <path d="m6 6 12 12M18 6 6 18" />}
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

  useEffect(() => {
    useAssistantStore.getState().reset()
    return () => useAssistantStore.getState().reset()
  }, [])

  const send = (value: string, source: QuestionSource = 'conversation') => {
    if (!value.trim() || (conversation.pending && source !== 'faq')) return
    setDraft('')
    void conversation.send(value, source)
  }
  const resetConversation = () => {
    conversation.clear()
    setDraft('')
  }
  const closeConversation = () => {
    resetConversation()
    closeChat()
  }
  const returnToMascot = () => {
    closeConversation()
    window.requestAnimationFrame(() => bubble.current?.focus())
  }
  const dismiss = () => {
    resetConversation()
    hide()
    window.requestAnimationFrame(() => launcher.current?.focus())
  }

  return <>
    <Dock aria-label="Asistente nandBot" $chatOpen={chatOpen} onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}>
      {!visible ? <Launcher ref={launcher} type="button" aria-label="Mostrar a nandBot" onClick={() => {
        show()
        window.requestAnimationFrame(() => {
          if (!useAssistantStore.getState().chatOpen) bubble.current?.focus({ preventScroll: true })
        })
      }}>
        {launcherMascot}<span data-full>Mostrar a nandBot</span><span data-short>nandBot</span>
      </Launcher> : <Entrance data-entrance="fall-bounce">
        <Tools role="group" aria-label="Acciones de nandBot">
          <AssistantButton ref={bubble} type="button" aria-label={chatOpen ? 'Minimizar chat' : 'Abrir chat con nandBot'} aria-expanded={chatOpen}
            aria-haspopup="dialog" onClick={chatOpen ? returnToMascot : openChat}><ToolIcon kind="chat" /><span>Chat</span></AssistantButton>
          <AssistantButton type="button" aria-label="Ocultar asistente" onClick={dismiss}><ToolIcon kind="hide" /></AssistantButton>
        </Tools>
        <SvgMascot paused={reducedMotion} onReady={onReady} onStateChange={onStateChange} />
      </Entrance>}
    </Dock>
    {chatOpen && visible ? <AssistantChat viewport={viewport} messages={messages} source={mode} draft={draft} pending={conversation.pending} error={conversation.error}
      onDraft={setDraft} onSend={send} onClear={resetConversation} onClose={returnToMascot}
      onLaunchApp={(id) => { closeConversation(); onLaunchApp(id) }} /> : null}
  </>
}
