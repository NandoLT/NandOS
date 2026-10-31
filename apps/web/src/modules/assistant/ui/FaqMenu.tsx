import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'
import { suggestedQuestions } from '../domain/conversation'

const Anchor = styled.div`
  flex-shrink: 0; padding: 7px 10px; border-top: 1px solid var(--os-divider);
  background: var(--os-window);
`
const Trigger = styled.button`
  display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;
  min-height: 32px; padding: 6px 9px; border: var(--os-raised-border); border-radius: var(--os-control-radius);
  background: var(--os-toolbar); color: var(--os-window-text); font: inherit; font-weight: 700; cursor: pointer;
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: -4px; }
  &[aria-expanded='true'] { border: var(--os-inset-border); }
`
const Popup = styled.div`
  position: fixed; z-index: 1200; display: grid; gap: 2px; overflow-y: auto; overscroll-behavior: contain;
  padding: 3px; border: var(--os-raised-border); border-radius: var(--os-control-radius);
  background: var(--os-menu); color: var(--os-menu-text); box-shadow: var(--os-window-shadow);
  button { min-height: 36px; padding: 8px; border: 0; text-align: left; white-space: normal; overflow-wrap: anywhere;
    background: transparent; color: inherit; font: inherit; font-size: 12px; line-height: 1.4; cursor: pointer; }
  button:hover, button:focus-visible { outline: none; background: var(--os-menu-hover); color: var(--os-menu-hover-text); }
  @media (pointer: coarse) { button { min-height: 44px; } }
`

export function FaqMenu({ onSelect, layoutKey }: { onSelect(question: string): void; layoutKey: string }) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState({ left: 8, bottom: 8, width: 300, maxHeight: 260 })
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(360, rect.width || 360, window.innerWidth - 16)
      setPlacement({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        bottom: window.innerHeight - Math.max(14, rect.top) + 6, width,
        maxHeight: Math.max(0, Math.min(280, rect.top - 14)) })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open, layoutKey])

  useEffect(() => {
    if (!open) return
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  const dismiss = () => { setOpen(false); trigger.current?.focus() }
  const handleKeys = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); dismiss() }
    if (event.key === 'Tab') { setOpen(false); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    if (!open) { setOpen(true); return }
    const items = Array.from(popup.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
    items[index]?.focus()
  }

  return <Anchor onKeyDown={handleKeys}>
    <Trigger ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen((value) => !value)}>Preguntas frecuentes<span aria-hidden="true">{open ? '▾' : '▴'}</span></Trigger>
    {open ? createPortal(<Popup ref={popup} id={id} role="menu" aria-label="Preguntas frecuentes" style={placement}
      onKeyDown={handleKeys} onClick={(event) => event.stopPropagation()}>
      {suggestedQuestions.map((question) => <button key={question} role="menuitem" type="button" onClick={() => {
        onSelect(question)
        dismiss()
      }}>{question}</button>)}
    </Popup>, document.body) : null}
  </Anchor>
}
