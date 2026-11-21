import { useEffect, useId, useState } from 'react'
import type { HTMLAttributes, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'
import type { AppId } from '@nandoos/contracts'
import { AppIcon } from '../../../shared/lib/AppIcon'
import { programMenu } from '../../applications/domain/program-menu'
import type { ProgramMenuItem } from '../../applications/domain/program-menu'
import { TASKBAR_HEIGHT } from '../../../shared/lib/input-preferences'

export type ProgramMenuPlacement = { left: number; top: number; width: number; maxHeight: number }
const Flyout = styled.div`
  position: fixed;
  z-index: 1400;
  display: grid;
  overflow: auto;
  padding: 4px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-menu);
  box-shadow: 3px 3px var(--os-shadow);
`
const Heading = styled.div`
  padding: 6px 9px 5px;
  color: var(--os-muted);
  font-size: 10px;
  font-weight: bold;
  letter-spacing: .07em;
  text-transform: uppercase;
`
const Item = styled.button`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 34px;
  padding: 7px 8px;
  border: 0;
  color: var(--os-menu-text);
  background: transparent;
  text-align: left;
  cursor: pointer;
  @media (max-width: 640px), (pointer: coarse) { min-height: 44px; }
  &:hover, &:focus-visible, &[aria-expanded='true'] {
    color: var(--os-menu-hover-text); background: var(--os-menu-hover); outline: none;
  }
  &[aria-disabled='true'] { color: var(--os-disabled); cursor: not-allowed; }
`

type Branch = { id: string; label: string; entries: ProgramMenuItem[]; placement: ProgramMenuPlacement; anchor: HTMLButtonElement }
function placeBranch(anchor: HTMLButtonElement, count: number): ProgramMenuPlacement {
  const bounds = anchor.getBoundingClientRect()
  const width = 250
  const maxHeight = Math.min(520, window.innerHeight - TASKBAR_HEIGHT - 16)
  const height = Math.min(maxHeight, count * (window.matchMedia?.('(pointer: coarse)').matches ? 44 : 40) + 40)
  return {
    left: Math.max(8, Math.min(bounds.right + width <= window.innerWidth - 8 ? bounds.right - 2 : bounds.left - width + 2, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(bounds.top - 3, window.innerHeight - TASKBAR_HEIGHT - height - 8)), width, maxHeight,
  }
}

export function ProgramMenu({ placement, mobile, onBack, onLaunch, onUnavailable, tooltipProps }: {
  placement: ProgramMenuPlacement
  mobile: boolean
  onBack: () => void
  onLaunch: (id: AppId) => void
  onUnavailable: (message: string) => void
  tooltipProps: (id: string, text?: string) => HTMLAttributes<HTMLButtonElement>
}) {
  const [path, setPath] = useState<Branch[]>([])
  const prefix = useId()
  useEffect(() => {
    const dismissChildren = () => setPath([])
    window.addEventListener('resize', dismissChildren)
    return () => window.removeEventListener('resize', dismissChildren)
  }, [])
  const focusFirst = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.querySelector<HTMLButtonElement>('[data-menu-entry]')?.focus())
  const open = (entry: ProgramMenuItem, depth: number, anchor: HTMLButtonElement, focus: boolean) => {
    if (!entry.children) return
    const id = prefix + '-' + entry.id
    setPath((current) => [...current.slice(0, depth), { id, label: entry.label, entries: entry.children!, anchor, placement: placeBranch(anchor, entry.children!.length) }])
    if (focus || mobile) focusFirst(id)
  }
  const back = (depth: number) => {
    if (!depth) { onBack(); return }
    const anchor = path[depth - 1].anchor
    setPath((current) => current.slice(0, depth - 1))
    // Mobile parents remount when popping a level, so resolve their button anew.
    requestAnimationFrame(() => {
      if (anchor.isConnected) anchor.focus()
      else document.getElementById(depth === 1 ? 'start-flyout-programs' : path[depth - 2].id)
        ?.querySelector<HTMLButtonElement>('[data-program-id="' + path[depth - 1].id.slice(prefix.length + 1) + '"]')?.focus()
    })
  }
  const keyDown = (event: KeyboardEvent<HTMLDivElement>, depth: number, entries: ProgramMenuItem[]) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > button[data-menu-entry]')]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (current + 1) % buttons.length : (current - 1 + buttons.length) % buttons.length
      buttons[next]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); back(depth)
    } else if (event.key === 'ArrowRight') {
      const entry = entries.find((item) => item.id === (event.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.programId)
      if (entry?.children) { event.preventDefault(); event.stopPropagation(); open(entry, depth, event.target as HTMLButtonElement, true) }
    }
  }
  const levels = [{ id: 'start-flyout-programs', label: 'Programas', entries: programMenu, placement }, ...path]
  return <>{levels.map((level, depth) => mobile && depth !== path.length ? null : createPortal(
    <Flyout key={level.id} id={level.id} data-start-flyout role="group" aria-label={level.label}
      style={{ ...(mobile ? placement : level.placement), zIndex: 1400 + depth }}
      onKeyDown={(event) => keyDown(event, depth, level.entries)}
      onScroll={(event) => { if (event.target === event.currentTarget) setPath((current) => current.slice(0, depth)) }}>
      {mobile && <Item type="button" onClick={() => back(depth)}><span style={{ gridColumn: '1 / -1' }}>← Volver a {depth ? levels[depth - 1].label : 'Start'}</span></Item>}
      <Heading>{level.label}</Heading>
      {level.entries.map((entry) => <Item key={entry.id} data-menu-entry data-program-id={entry.id}
        type="button" aria-disabled={entry.disabled || undefined}
        aria-haspopup={entry.children ? 'menu' : undefined}
        aria-expanded={entry.children ? path[depth]?.label === entry.label : undefined}
        aria-controls={entry.children ? prefix + '-' + entry.id : undefined}
        {...tooltipProps(prefix + '-tooltip-' + entry.id, entry.disabled ? entry.label + ' estará disponible próximamente.' : undefined)}
        onMouseEnter={(event) => {
          tooltipProps(prefix + '-tooltip-' + entry.id, entry.disabled ? entry.label + ' estará disponible próximamente.' : undefined).onMouseEnter?.(event)
          if (mobile) return
          if (entry.children) open(entry, depth, event.currentTarget, false)
          else setPath((current) => current.slice(0, depth))
        }}
        onFocus={(event) => {
          tooltipProps(prefix + '-tooltip-' + entry.id, entry.disabled ? entry.label + ' estará disponible próximamente.' : undefined).onFocus?.(event)
          if (!entry.children) setPath((current) => current.slice(0, depth))
        }}
        onClick={(event) => {
          if (entry.children) { open(entry, depth, event.currentTarget, event.detail === 0); return }
          if (entry.disabled) { onUnavailable(entry.label + ' estará disponible próximamente.'); return }
          if (entry.appId) onLaunch(entry.appId)
        }}>
        <span aria-hidden="true"><AppIcon icon={entry.icon} size={22} /></span><span>{entry.label}</span>
        <span aria-hidden="true">{entry.children ? '▶' : ''}</span>
      </Item>)}
    </Flyout>, document.body, level.id)
  )}</>
}
