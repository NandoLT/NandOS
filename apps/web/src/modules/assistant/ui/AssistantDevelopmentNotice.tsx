import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'

const Notice = styled.div`
  flex-shrink: 0; padding: 8px 10px; border-bottom: 1px solid var(--os-divider);
  background: var(--os-notice); color: var(--os-window-text); line-height: 1.4;
  > div { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
  strong { display: inline-flex; align-items: center; gap: 6px; }
  p { margin: 5px 0 0; font-size: 11px; }
  svg { flex-shrink: 0; }
`
const Button = styled.button`
  min-height: 30px; padding: 5px 9px; border: var(--os-raised-border);
  border-radius: var(--os-control-radius); background: var(--os-toolbar);
  color: var(--os-window-text); font: inherit; cursor: pointer;
  &:hover { background: var(--os-selected); color: var(--os-selected-text); }
  &:active { border: var(--os-inset-border); }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: -4px; }
  @media (pointer: coarse) { min-height: 44px; }
`
const InfoTag = styled(Button)`
  margin-left: auto; min-height: 26px; padding: 3px 7px; font-size: 11px; font-weight: 700;
`
const Dialog = styled.dialog`
  position: fixed; inset: 0; margin: auto; padding: 0;
  width: min(560px, calc(100vw - 24px)); max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 32px); overflow: hidden;
  border: var(--os-window-border); border-radius: var(--os-window-radius);
  background: var(--os-window); color: var(--os-window-text);
  box-shadow: var(--os-window-shadow); font: inherit; font-size: 13px;
  &[open] { display: flex; flex-direction: column; }
  &::backdrop { background: var(--os-overlay); }
`
const TitleBar = styled.header`
  display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 5px 6px 5px 10px;
  background: var(--os-titlebar); color: var(--os-titlebar-text);
  h2 { flex: 1; margin: 0; font-size: 13px; }
  button { min-width: 28px; font-weight: 700; }
`
const Content = styled.div`
  flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  padding: 16px; background: var(--os-surface); line-height: 1.55; overflow-wrap: anywhere;
  p { margin: 0 0 12px; }
  h3 { margin: 16px 0 7px; font-size: 13px; }
  ol, ul { margin: 0 0 12px; padding-left: 22px; }
  li + li { margin-top: 6px; }
  p:last-child { margin-bottom: 0; }
`
const Footer = styled.footer`
  display: flex; justify-content: flex-end; flex-shrink: 0;
  padding: 10px; border-top: 1px solid var(--os-divider);
`

function WarningIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 23 21H1Z" fill="#ffd24a" stroke="#433c17" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 8v6m0 3v.5" stroke="#242015" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
}

export function AssistantDevelopmentNotice() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const accept = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const modal = dialog.current
    const opener = trigger.current
    modal?.showModal()
    accept.current?.focus({ preventScroll: true })
    return () => {
      if (modal?.open) modal.close()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  return <>
    <Notice>
      <div><strong><WarningIcon />Chatbot en proceso</strong>
        <InfoTag ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open}
          aria-controls={open ? id : undefined} title="Conoce la arquitectura prevista y el estado de nandBot"
          onClick={() => setOpen(true)}>+ información</InfoTag>
      </div>
      <p>Demostración sin IA · respuestas preparadas. La conexión con la wiki aún no está activa.</p>
    </Notice>
    {open ? createPortal(<Dialog ref={dialog} id={id} aria-modal="true" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-summary`} onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false) }
      }}>
      <TitleBar><WarningIcon /><h2 id={`${id}-title`}>El futuro de nandBot</h2>
        <Button type="button" aria-label="Cerrar información de nandBot" onClick={() => setOpen(false)}>×</Button>
      </TitleBar>
      <Content>
        <p id={`${id}-summary`}><strong>El asistente está en desarrollo.</strong> Ahora muestra respuestas de demostración y no consulta todavía la wiki ni envía tus preguntas a un modelo de IA.</p>
        <h3>La arquitectura que estamos preparando</h3>
        <ol>
          <li><strong>Wiki en Neon:</strong> solo los artículos publicados podrán alimentar la base de conocimiento del asistente.</li>
          <li><strong>RAG con Qdrant:</strong> recuperará los fragmentos relevantes de la wiki para responder con fuentes, sin inventar datos sobre Fernando o NandOS si falta información.</li>
          <li><strong>LiteLLM:</strong> conectará el servicio con los modelos de embeddings y conversación. Los modelos y proveedores de conversación siguen pendientes de elección.</li>
          <li><strong>System One:</strong> evaluaremos Jev u otra alternativa para distinguir preguntas de la wiki, conversación general y consultas que necesiten aclaración. No hay un proveedor elegido ni está habilitado este enrutamiento.</li>
        </ol>
        <h3>¿Qué falta para activarlo?</h3>
        <p>Montar un <strong>servidor en casa</strong> para Qdrant, LiteLLM y los servicios de IA, y validar seguridad, disponibilidad y calidad de las respuestas. El RAG queda en espera mientras preparamos esa infraestructura.</p>
        <p>La web y el backend API siguen en <strong>Vercel</strong>; los datos y la wiki, en <strong>Neon</strong>. El portfolio, el CV y la Ayuda siguen disponibles independientemente del futuro servidor.</p>
        <p><strong>Sin fecha de activación confirmada.</strong> Mientras tanto, puedes explorar las preguntas frecuentes y leer la wiki desde Start → Ayuda.</p>
      </Content>
      <Footer><Button ref={accept} type="button" onClick={() => setOpen(false)}>Entendido</Button></Footer>
    </Dialog>, document.body) : null}
  </>
}
