import { useEffect, useId, useRef } from 'react'
import styled from '@emotion/styled'

const Dialog = styled.dialog`
  position: fixed;
  inset: 0;
  width: min(390px, calc(100% - 24px));
  max-height: calc(100dvh - 24px);
  box-sizing: border-box;
  margin: auto;
  padding: 3px;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);

  &::backdrop { background: var(--os-overlay); }
`
const Title = styled.h2`
  margin: 0;
  padding: 6px 8px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 13px;
`
const Message = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 12px;
  font-size: 13px;
  line-height: 1.45;
  > span { flex: none; font-size: 28px; }
  p { margin: 0; }
`
const Actions = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 8px 10px;
  button {
    min-height: 32px;
    padding: 5px 10px;
    border: var(--os-raised-border);
    border-radius: var(--os-control-radius);
    color: inherit;
    background: var(--os-toolbar);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    &:active { border: var(--os-inset-border); }
    &:focus-visible { outline: 1px dotted currentColor; outline-offset: -4px; }
    @media (pointer: coarse) { min-height: 44px; }
  }
`

export function UnsavedChangesDialog({ apps, question, onCancel, onDiscard }: {
  apps: string
  question: string
  onCancel: () => void
  onDiscard: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const keepEditing = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    const modal = dialog.current
    if (!modal) return
    const opener = document.activeElement
    if (typeof modal.showModal === 'function') modal.showModal()
    else modal.open = true
    keepEditing.current?.focus({ preventScroll: true })
    return () => {
      if (typeof modal.close === 'function') modal.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return <Dialog ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby={id + '-title'}
    aria-describedby={id + '-message'} onClick={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); onCancel() }}
    onKeyDown={(event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    }}>
    <Title id={id + '-title'}>Cambios sin guardar</Title>
    <Message>
      <span aria-hidden="true">⚠️</span>
      <p id={id + '-message'}>Tienes cambios sin guardar en {apps}. {question}</p>
    </Message>
    <Actions>
      <button ref={keepEditing} type="button" onClick={onCancel}>Seguir editando</button>
      <button type="button" onClick={onDiscard}>Descartar cambios</button>
    </Actions>
  </Dialog>
}
