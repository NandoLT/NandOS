import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styled from '@emotion/styled'

export type MenuCommand = { label: string; run: () => void; disabled?: boolean; pressed?: boolean }
export type AppMenu = { name: string; commands: readonly MenuCommand[] }

const Bar = styled.nav`
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 1px 4px;
  border-bottom: var(--os-raised-border);
  background: var(--os-toolbar);
  font-size: 12px;
`
const Trigger = styled.button`
  padding: 4px 7px;
  border: 1px solid transparent;
  color: var(--os-window-text);
  background: transparent;
  font: inherit;
  cursor: pointer;
  @media (max-width: 640px), (pointer: coarse) { min-height: 28px; }
  &:hover, &[aria-expanded='true'] { color: var(--os-menu-hover-text); background: var(--os-menu-hover); }
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -2px; }
`
const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  width: 180px;
  max-width: 100%;
  padding: 3px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-menu);
  box-shadow: 3px 3px var(--os-shadow);
  button {
    width: 100%; padding: 7px 10px; border: 0; background: transparent;
    color: var(--os-menu-text); text-align: left; cursor: pointer;
  }
  button:disabled { opacity: .55; cursor: default; }
  button:hover:not(:disabled), button:focus-visible {
    color: var(--os-menu-hover-text); background: var(--os-menu-hover); outline: none;
  }
`
export function AppMenuBar({ label, menus, trailing, onOpen }: {
  label: string
  menus: readonly AppMenu[]
  trailing?: ReactNode
  onOpen?: () => void
}) {
  const bar = useRef<HTMLElement>(null)
  const [open, setOpen] = useState<{ name: string; left: number } | null>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !bar.current?.contains(event.target)) setOpen(null)
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [open])

  const returnFocus = () => {
    bar.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus({ preventScroll: true })
    setOpen(null)
  }
  return <Bar ref={bar} aria-label={label} onClick={(event) => event.stopPropagation()}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null) }}
    onKeyDown={(event) => {
      if (!open || event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      returnFocus()
    }}>
    {menus.map(({ name, commands }) => <div key={name}>
      <Trigger type="button" aria-expanded={open?.name === name} onClick={(event) => {
        if (open?.name === name) { setOpen(null); return }
        onOpen?.()
        setOpen({ name, left: event.currentTarget.offsetLeft })
      }}>{name}</Trigger>
      {open?.name === name && <Dropdown role="group" aria-label={'Opciones de ' + name}
        style={{ left: 'min(' + open.left + 'px, max(0px, 100% - 180px))' }}>
        {commands.map(({ label, run, disabled, pressed }) => <button key={label} type="button" disabled={disabled}
          aria-pressed={pressed} onClick={() => { returnFocus(); run() }}>{label}</button>)}
      </Dropdown>}
    </div>)}
    {trailing}
  </Bar>
}
