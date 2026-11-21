import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import styled from '@emotion/styled'

const Dialog = styled.dialog`
  position: fixed; inset: 0; width: min(390px, calc(100% - 24px)); max-height: calc(100dvh - 24px);
  margin: auto; padding: 3px; overflow: auto; border: var(--os-window-border);
  color: var(--os-window-text); background: var(--os-window); box-shadow: var(--os-window-shadow); font-size: 13px;
  &::backdrop { background: var(--os-overlay); }
  h2 { margin: 0; padding: 5px 7px; color: var(--os-titlebar-text); background: var(--os-titlebar); font-size: 13px; }
  section { padding: 12px; line-height: 1.5; }
  p { margin: 0 0 8px; }
  footer { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 0 10px 10px; }
  button { min-height: 30px; padding: 4px 12px; border: var(--os-raised-border); border-radius: 0; color: inherit; background: var(--os-window); font: inherit; }
  button:focus-visible { outline: 1px dotted currentColor; outline-offset: -4px; }
  fieldset { margin: 0 0 10px; border: 2px groove #fff; }
  label { display: flex; align-items: center; gap: 7px; margin: 4px 0; }
  input[type='radio'], input[type='checkbox'] { min-height: 0; }
`
export function ClassicDialog({ title, children, actions, onClose, closeLabel = 'Aceptar' }: {
  title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; closeLabel?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const node = ref.current
    const opener = document.activeElement
    if (typeof node?.showModal === 'function') node.showModal()
    else if (node) node.open = true
    return () => {
      node?.close?.()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return <Dialog ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }}>
    <h2 id={id}>{title}</h2><section>{children}</section><footer>{actions}<button type="button" onClick={onClose}>{closeLabel}</button></footer>
  </Dialog>
}
