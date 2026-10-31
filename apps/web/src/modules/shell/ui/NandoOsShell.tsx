import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'
import type { AppId } from '@nandoos/contracts'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { appRegistry } from '../../applications/domain/app-registry'
import { FileExplorer } from '../../applications/ui/FileExplorer'
import { RecycleBin } from '../../applications/ui/RecycleBin'
import { SettingsWindow } from '../../applications/ui/SettingsWindow'
import { AboutWindow } from '../../portfolio/ui/AboutWindow'
import { PortfolioSectionWindow } from '../../portfolio/ui/PortfolioSectionWindow'
import { usePortfolioContent } from '../../portfolio/application/usePortfolioContent'
import { apiRequest } from '../../portfolio/infrastructure/http-client'
import { AdminDashboard } from '../../admin/ui/AdminDashboard'
import { AdminLogin } from '../../admin/ui/AdminLogin'
import { useThemeStore } from '../../../shared/styles/theme.store'
import { rememberBoot, shouldPlayBoot, taskbarHeight } from '../../../shared/lib/input-preferences'
import { useTouchPress } from '../../../shared/lib/useTouchPress'
import { useShellStore } from '../application/shell.store'
import { findNearestDesktopGridPosition } from '../domain/desktop-grid'
import type { DesktopPosition, DesktopSystemItemId, UserDesktopItem, WindowBounds } from '../domain/types'
import { WindowFrame } from './WindowFrame'
import { BootScreen, GuestLogin, ShutdownScreen } from './SessionScreens'

// An explicit local-only opt-in: no test controls in production.
const MascotLab = import.meta.env.DEV && new URLSearchParams(window.location.search).get('mascot') === '1'
  ? lazy(() => import('../../assistant/ui/MascotLab'))
  : null
const AssistantDock = lazy(() => import('../../assistant/ui/AssistantDock'))

const Desktop = styled.main`
  position: relative;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  background-color: var(--os-desktop);
  background-image: var(--os-desktop-pattern);
  background-size: var(--os-desktop-pattern-size);
`

const DesktopShortcuts = styled.section`
  display: contents;
  @media (max-width: 640px) {
    position: absolute;
    inset: 0 0 var(--os-taskbar-height);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    align-content: start;
    gap: 8px;
    padding: 16px 8px;
    overflow: auto;
  }
`

const DesktopIcon = styled.button<{ $position: DesktopPosition; $selected: boolean; $dragging: boolean }>`
  position: absolute;
  top: ${({ $position }) => $position.y}px;
  left: ${({ $position }) => $position.x}px;
  z-index: ${({ $dragging }) => ($dragging ? 2 : 1)};
  display: grid;
  width: 88px;
  min-height: 76px;
  gap: 6px;
  padding: 6px 4px;
  border: 1px ${({ $selected }) => ($selected ? 'dotted var(--os-border-light)' : 'solid transparent')};
  color: var(--os-desktop-text);
  background: ${({ $selected }) => ($selected ? 'var(--os-desktop-selection)' : 'transparent')};
  text-shadow: 1px 1px var(--os-shadow);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:hover,
  &:focus-visible {
    border-color: var(--os-border-light);
    background: ${({ $selected }) => ($selected ? 'var(--os-desktop-selection)' : 'var(--os-desktop-hover)')};
    outline: none;
  }

  &:active { cursor: grabbing; }

  span:first-of-type { display: grid; place-items: center; height: 32px; font-size: 28px; line-height: 1; }
  span:last-of-type { font-size: 12px; line-height: 1.2; overflow-wrap: anywhere; }
  @media (max-width: 640px) {
    position: relative;
    top: auto;
    left: auto;
    justify-self: center;
    touch-action: pan-y;
    cursor: pointer;
  }
`

const ContextMenu = styled.div`
  position: fixed;
  z-index: 1300;
  display: grid;
  min-width: 190px;
  padding: 3px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-menu);
  color: var(--os-menu-text);
  box-shadow: 3px 3px var(--os-shadow);
`

const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  padding: 7px 24px 7px 10px;
  border: 0;
  color: ${({ $danger }) => ($danger ? 'var(--os-danger)' : 'var(--os-menu-text)')};
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover, &:focus-visible { color: var(--os-menu-hover-text); background: var(--os-menu-hover); outline: none; }
`

const ContextDivider = styled.div`
  height: 1px;
  margin: 3px 2px;
  background: var(--os-divider);
  box-shadow: 0 1px var(--os-border-light);
`

const ProtectedOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--os-overlay);
`

const ProtectedDialog = styled.section`
  width: min(380px, 100%);
  padding: 3px;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);
`

const ProtectedTitle = styled.div`
  padding: 6px 8px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 13px;
  font-weight: 700;
`

const ProtectedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 14px;
  font-size: 13px;
  line-height: 1.45;

  span { font-size: 30px; }
`

const ProtectedActions = styled.div`
  display: flex;
  justify-content: center;
  padding: 0 12px 12px;
`

const Taskbar = styled.footer`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 5px;
  height: var(--os-taskbar-height);
  padding: 3px;
  border-top: var(--os-raised-border);
  background: var(--os-taskbar);
  backdrop-filter: blur(14px);
`

const TaskbarButton = styled.button<{ $active?: boolean }>`
  flex-shrink: 0;
  min-width: 74px;
  height: 31px;
  padding: 3px 8px;
  border: ${({ $active }) => ($active ? 'var(--os-inset-border)' : 'var(--os-raised-border)')};
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-taskbar);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: -5px; }
`

const TaskbarWindows = styled.nav`
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: thin;
`

const StartMenu = styled.div`
  position: absolute;
  bottom: calc(var(--os-taskbar-height) - 3px);
  left: 3px;
  z-index: 1100;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 4px;
  width: min(310px, calc(100vw - 8px));
  padding: 4px;
  border: var(--os-raised-border);
  border-radius: var(--os-window-radius);
  background: var(--os-menu);
  box-shadow: 3px 3px var(--os-shadow);

  max-height: calc(100dvh - var(--os-taskbar-height) - 12px);
  @media (max-width: 640px) {
    overflow-x: hidden;
    overflow-y: auto;
  }
`

const MenuBrandRail = styled.aside`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 100%;
  padding: 8px 5px;
  border-radius: calc(var(--os-window-radius) / 2);
  color: #fff;
  background: var(--os-brand-rail);
`

const MenuBrandText = styled.span`
  flex: 1;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 16px;
  font-weight: 700;
`

const MenuLogo = styled.img`
  width: 26px;
  height: 26px;
  flex: none;
`

const MenuContent = styled.div`
  display: flex;
  flex-direction: column;
  align-self: start;
  min-width: 0;
`

const MenuCategoryGroup = styled.div`
  position: relative;
`

const MenuCategoryButton = styled.button`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 39px;
  padding: 5px 8px;
  border: 0;
  border-radius: calc(var(--os-control-radius) / 2);
  color: var(--os-menu-text);
  background: transparent;
  text-align: left;
  cursor: pointer;
  @media (max-width: 640px), (pointer: coarse) { min-height: 44px; }

  &:hover,
  &:focus-visible,
  &[aria-expanded='true'] {
    color: var(--os-menu-hover-text);
    background: var(--os-menu-hover);
    outline: none;
  }
`

const MenuCategoryIcon = styled.span`
  display: grid;
  place-items: center;
  font-size: 22px;
`

const MenuArrow = styled.span`
  justify-self: end;
  font-size: 12px;
`

const MenuFlyout = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1400;
  display: grid;
  width: 250px;
  max-height: min(70vh, 520px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-menu);
  box-shadow: 3px 3px var(--os-shadow);
`

const MenuSectionHeading = styled.div`
  padding: 6px 9px 5px;
  color: var(--os-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`

const StartButtonContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`

const StartLogo = styled.img`
  width: 20px;
  height: 20px;
  flex: none;
`

const MenuItem = styled.button<{ $disabled?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 8px;
  border: 0;
  border-radius: calc(var(--os-control-radius) / 2);
  color: ${({ $disabled }) => ($disabled ? 'var(--os-disabled)' : 'var(--os-menu-text)')};
  background: transparent;
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  @media (max-width: 640px), (pointer: coarse) { min-height: 44px; }

  & > span[aria-hidden='true'] {
    display: grid;
    place-items: center;
    flex: 0 0 30px;
    height: 26px;
    font-size: 22px;
    line-height: 1;
  }

  &:hover,
  &:focus-visible {
    color: ${({ $disabled }) => ($disabled ? 'var(--os-disabled)' : 'var(--os-menu-hover-text)')};
    background: ${({ $disabled }) => ($disabled ? 'var(--os-surface-alt)' : 'var(--os-menu-hover)')};
    outline: none;
  }

  @media (max-width: 520px) {
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }
`

const MenuTooltipBubble = styled.div`
  position: fixed;
  z-index: 2100;
  box-sizing: border-box;
  width: max-content;
  max-width: min(225px, calc(100vw - 16px));
  padding: 7px 9px;
  border: 1px solid var(--os-border);
  color: var(--os-window-text);
  background: var(--os-notice);
  box-shadow: 2px 2px var(--os-shadow);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  overflow-wrap: anywhere;
  pointer-events: none;
`

const MenuDivider = styled.div`
  height: 1px;
  margin: 4px 2px;
  background: var(--os-divider);
  box-shadow: 0 1px var(--os-border-light);
`

const Tray = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 31px;
  margin-left: auto;
  padding: 0 5px;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  background: var(--os-taskbar);
  font-size: 12px;
  @media (max-width: 640px), (pointer: coarse) { height: 44px; padding: 0 2px; gap: 0; }
`

const TrayControl = styled.button`
  position: relative;
  min-width: 26px;
  height: 26px;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  @media (max-width: 640px), (pointer: coarse) { min-width: 44px; height: 44px; }

  &:hover,
  &:focus-visible {
    border-color: var(--os-border-light);
    background: var(--os-surface-alt);
    outline: 1px dotted var(--os-window-text);
  }

  &[data-tooltip]:hover::after,
  &[data-tooltip]:focus-visible::after {
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    z-index: 1300;
    width: max-content;
    max-width: 220px;
    padding: 7px 9px;
    border: 1px solid var(--os-border);
    color: var(--os-window-text);
    background: var(--os-notice);
    box-shadow: 2px 2px var(--os-shadow);
    content: attr(data-tooltip);
    font-family: 'Segoe UI', Tahoma, sans-serif;
    font-size: 12px;
  }
`

const TrayTime = styled(TrayControl)`
  min-width: 46px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const Notice = styled.div`
  position: absolute;
  right: 18px;
  bottom: calc(var(--os-taskbar-height) + 16px);
  z-index: 1200;
  max-width: min(340px, calc(100vw - 36px));
  padding: 10px 12px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-notice);
  box-shadow: 3px 3px var(--os-shadow);
  font-size: 12px;
`

type DesktopContextTarget =
  | { kind: 'desktop'; position: DesktopPosition }
  | { kind: 'system'; id: DesktopSystemItemId; label: string }
  | { kind: 'user'; id: string; label: string }

type DesktopContextEvent = Pick<ReactMouseEvent, 'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation'>

function moveMenuFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return false
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  if (!items.length) return false
  const current = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? items.length - 1
    : event.key === 'ArrowDown' ? (current + 1) % items.length
    : current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length
  event.preventDefault()
  event.stopPropagation()
  items[next]?.focus()
  return true
}

type DesktopContextMenuState = {
  x: number
  y: number
  target: DesktopContextTarget
}

type StartMenuEntry = {
  label: string
  icon: string
  disabled?: boolean
  tooltip?: string
  onActivate: () => void
}

type MenuTooltipState = {
  id: string
  text: string
  left: number
  top: number
}

type MenuFlyoutPlacement = {
  left: number
  top: number
  width: number
  maxHeight: number
}

type StartMenuCategory = {
  id: string
  label: string
  icon: string
  entries: StartMenuEntry[]
}

function getMenuFlyoutPlacement(anchor: HTMLElement): MenuFlyoutPlacement {
  const bounds = anchor.getBoundingClientRect()
  const gutter = 8
  if (window.innerWidth <= 640) {
    const maxHeight = Math.min(520, window.innerHeight - taskbarHeight() - gutter * 2)
    return {
      left: gutter, top: Math.max(gutter, window.innerHeight - taskbarHeight() - maxHeight - gutter),
      width: window.innerWidth - gutter * 2, maxHeight,
    }
  }
  const width = Math.min(250, window.innerWidth - gutter * 2)
  const hasRoomOnRight = window.innerWidth - bounds.right >= width + gutter
  const requestedLeft = hasRoomOnRight ? bounds.right - 2 : bounds.left - width + 2
  const maxLeft = Math.max(gutter, window.innerWidth - width - gutter)
  const left = Math.max(gutter, Math.min(requestedLeft, maxLeft))
  const requestedTop = bounds.top - 3
  const maxHeight = Math.max(
    80,
    Math.min(520, window.innerHeight - gutter * 2, window.innerHeight - requestedTop - gutter)
  )
  const top = Math.max(gutter, Math.min(requestedTop, window.innerHeight - maxHeight - gutter))

  return { left, top, width, maxHeight }
}

type DesktopShortcutProps = {
  itemId: string
  position: DesktopPosition
  icon: string
  label: string
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onMove: (position: DesktopPosition) => void
  onDropToRecycleBin: () => void
  onContextMenu: (event: DesktopContextEvent) => void
}

function DesktopShortcut({
  itemId,
  position,
  icon,
  label,
  selected,
  onSelect,
  onOpen,
  onMove,
  onDropToRecycleBin,
  onContextMenu,
}: DesktopShortcutProps) {
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: DesktopPosition
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const touchPress = useTouchPress()
  const [dragPosition, setDragPosition] = useState<DesktopPosition | null>(null)
  const visiblePosition = dragPosition ?? position

  useEffect(() => {
    if (!drag.current) setDragPosition(null)
  }, [position.x, position.y])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    if (event.pointerType !== 'touch') event.preventDefault()
    event.currentTarget.focus()
    suppressClick.current = false
    onSelect()
    touchPress.start(event, () => {
      drag.current = null
      setDragPosition(null)
      onContextMenu(event)
    })
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      moved: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    touchPress.move(event)
    if (window.innerWidth <= 640) return
    const currentDrag = drag.current
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - currentDrag.startX
    const deltaY = event.clientY - currentDrag.startY
    if (!currentDrag.moved && Math.hypot(deltaX, deltaY) < 5) return
    currentDrag.moved = true

    const surface = event.currentTarget.closest('[data-desktop-surface="true"]')
    const bounds = surface?.getBoundingClientRect()
    const maxX = Math.max(0, (bounds?.width ?? window.innerWidth) - 96)
    const maxY = Math.max(0, (bounds?.height ?? window.innerHeight) - taskbarHeight() - 82)
    setDragPosition({
      x: Math.max(0, Math.min(maxX, currentDrag.origin.x + deltaX)),
      y: Math.max(0, Math.min(maxY, currentDrag.origin.y + deltaY)),
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    touchPress.cancel()
    const currentDrag = drag.current
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return
    drag.current = null

    if (currentDrag.moved) {
      suppressClick.current = true
      const finalPosition = dragPosition ?? {
        x: currentDrag.origin.x + event.clientX - currentDrag.startX,
        y: currentDrag.origin.y + event.clientY - currentDrag.startY,
      }
      const recycleBin =
        itemId === 'recycle-bin' ? null : document.querySelector('[data-desktop-id="recycle-bin"]')
      const binBounds = recycleBin?.getBoundingClientRect()
      const droppedOnBin =
        binBounds !== undefined &&
        event.clientX >= binBounds.left &&
        event.clientX <= binBounds.right &&
        event.clientY >= binBounds.top &&
        event.clientY <= binBounds.bottom

      if (droppedOnBin) onDropToRecycleBin()
      else onMove(finalPosition)
      setDragPosition(null)
    }
  }

  return (
    <DesktopIcon
      data-desktop-id={itemId}
      $position={visiblePosition}
      $selected={selected}
      $dragging={dragPosition !== null}
      type="button"
      aria-label={`${label}. Doble clic para abrir`}
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        touchPress.cancel()
        drag.current = null
        setDragPosition(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (touchPress.consumeHold()) return
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        onSelect()
        if (touchPress.isTouch()) onOpen()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        if (!touchPress.isTouch()) onOpen()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onOpen()
        }
      }}
      onContextMenu={onContextMenu}
    >
      <span aria-hidden="true">
        {icon.startsWith('/') ? <img src={icon} alt="" width="32" height="32" draggable={false} /> : icon}
      </span>
      <span>{label}</span>
    </DesktopIcon>
  )
}

type SessionScreen = 'boot' | 'login' | 'admin-login' | 'admin' | 'desktop' | 'shutdown'

export function NandoOsShell() {
  const [screen, setScreen] = useState<SessionScreen>(() => shouldPlayBoot() ? 'boot' : 'login')
  const [adminUsername, setAdminUsername] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const [viewport, setViewport] = useState<WindowBounds>({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight - taskbarHeight(),
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedDesktopItem, setSelectedDesktopItem] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<DesktopContextMenuState | null>(null)
  const [protectedItem, setProtectedItem] = useState<string | null>(null)
  const [openStartCategory, setOpenStartCategory] = useState<string | null>(null)
  const [openStartCategoryPlacement, setOpenStartCategoryPlacement] =
    useState<MenuFlyoutPlacement | null>(null)
  const [menuTooltip, setMenuTooltip] = useState<MenuTooltipState | null>(null)
  const startMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const startMenuRef = useRef<HTMLDivElement | null>(null)
  const openStartCategoryAnchorRef = useRef<HTMLElement | null>(null)
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId)
  const setSelectedThemeId = useThemeStore((state) => state.setSelectedThemeId)
  const {
    windows,
    activeWindowId,
    isStartMenuOpen,
    desktopPositions,
    userDesktopItems,
    recycleBinItems,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    moveWindow,
    resizeWindow,
    moveDesktopItem,
    moveUserDesktopItem,
    createDesktopFolder,
    moveUserItemToRecycleBin,
    restoreUserItemFromRecycleBin,
    permanentlyDeleteUserItem,
    emptyRecycleBin,
    setStartMenuOpen,
    endGuestSession,
  } = useShellStore()
  const { data: portfolioContent = DEFAULT_PORTFOLIO_CONTENT } = usePortfolioContent()

  const showMenuTooltip = (id: string, text: string, element: HTMLButtonElement) => {
    const bounds = element.getBoundingClientRect()
    const tooltipWidth = Math.min(225, window.innerWidth - 16)
    const estimatedTooltipHeight = 58
    const top = bounds.bottom + estimatedTooltipHeight + 4 <= window.innerHeight - 8
      ? bounds.bottom + 4
      : Math.max(8, bounds.top - estimatedTooltipHeight - 4)
    const left = Math.max(8, Math.min(bounds.left + 8, window.innerWidth - tooltipWidth - 8))

    setMenuTooltip({ id, text, left, top })
  }

  const hideMenuTooltip = (id: string) => {
    setMenuTooltip((current) => current?.id === id ? null : current)
  }

  const menuTooltipProps = (id: string, text?: string) => ({
    'aria-describedby': text ? id : undefined,
    onMouseEnter: text
      ? (event: ReactMouseEvent<HTMLButtonElement>) => showMenuTooltip(id, text, event.currentTarget)
      : undefined,
    onMouseLeave: text ? () => hideMenuTooltip(id) : undefined,
    onFocus: text
      ? (event: ReactFocusEvent<HTMLButtonElement>) => showMenuTooltip(id, text, event.currentTarget)
      : undefined,
    onBlur: text ? () => hideMenuTooltip(id) : undefined,
  })

  const closeStartMenu = useCallback(() => {
    setMenuTooltip(null)
    setStartMenuOpen(false)
    setOpenStartCategory(null)
    setOpenStartCategoryPlacement(null)
    openStartCategoryAnchorRef.current = null
  }, [setOpenStartCategory, setOpenStartCategoryPlacement, setStartMenuOpen])

  useEffect(() => {
    if (isStartMenuOpen) startMenuRef.current?.focus()
  }, [isStartMenuOpen])

  const showLogin = useCallback(() => {
    rememberBoot()
    setScreen(adminUsername ? 'admin' : 'login')
  }, [adminUsername])
  const startDesktop = useCallback(() => setScreen('desktop'), [])
  const startShutdown = useCallback(() => {
    closeStartMenu()
    setNotice(null)
    setScreen('shutdown')
  }, [closeStartMenu])

  const logOffGuest = () => {
    closeStartMenu()
    endGuestSession()
    setContextMenu(null)
    setProtectedItem(null)
    setNotice(null)
    setScreen('login')
  }

  useEffect(() => {
    let active = true
    apiRequest<{ authenticated: boolean; username?: string }>('auth/session')
      .then((session) => {
        if (!active || !session.authenticated || !session.username) return
        setAdminUsername(session.username)
        setScreen((current) => current === 'boot' || current === 'login' ? 'admin' : current)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000)
    const handleResize = () => {
      setViewport({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight - taskbarHeight() })
      if (openStartCategoryAnchorRef.current) {
        setOpenStartCategoryPlacement(getMenuFlyoutPlacement(openStartCategoryAnchorRef.current))
      }
    }

    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => {
      window.clearInterval(clockTimer)
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const noticeTimer = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(noticeTimer)
  }, [notice])

  const formattedTime = useMemo(
    () => clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    [clock]
  )

  if (screen === 'boot') return <BootScreen onComplete={showLogin} />
  if (screen === 'login') return <GuestLogin onLogin={startDesktop} onAdminLogin={() => setScreen('admin-login')} />
  if (screen === 'admin-login') return (
    <AdminLogin
      onAuthenticated={(username) => {
        setAdminUsername(username)
        setScreen('admin')
      }}
      onBackToGuest={() => setScreen('login')}
    />
  )
  if (screen === 'admin') return (
    <AdminDashboard
      username={adminUsername ?? ''}
      onUsernameChange={setAdminUsername}
      onLogout={() => {
        setAdminUsername(null)
        setScreen('login')
      }}
    />
  )
  if (screen === 'shutdown') return <ShutdownScreen onRestart={() => setScreen('boot')} />

  const openShellWindow = openWindow

  const accessCv = (language: 'es' | 'en', action: 'download' | 'open') => {
    const documentMetadata = portfolioContent.cvDocuments[language] ?? DEFAULT_PORTFOLIO_CONTENT.cvDocuments[language]
    const filename = documentMetadata?.filename ?? (language === 'es'
      ? 'CV_Fernando_Lopez_Trejo_ES.pdf'
      : 'CV_Fernando_Lopez_Trejo_EN.pdf')
    const link = document.createElement('a')
    link.href = documentMetadata?.url ?? `/cv/${filename}`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    if (action === 'download') link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setNotice(action === 'download'
      ? `Descargando CV (${language.toUpperCase()}).`
      : `Abriendo CV (${language.toUpperCase()}) en una nueva pestaña.`)
  }

  const downloadCv = (language: 'es' | 'en') => accessCv(language, 'download')
  const openCv = (language: 'es' | 'en') => accessCv(language, 'open')

  const launchApp = (id: AppId) => {
    if (id === 'cv-viewer') {
      openCv('es')
      return
    }
    if (
      id === 'about' || id === 'file-explorer' || id === 'recycle-bin' || id === 'settings' ||
      id === 'experience' || id === 'projects' || id === 'skills' || id === 'contact'
    ) {
      openShellWindow(id)
    }
  }

  const appEntry = (id: AppId): StartMenuEntry => {
    const app = appRegistry.find((registeredApp) => registeredApp.id === id)
    if (!app) return { label: id, icon: '📦', disabled: true, onActivate: () => undefined }
    const tooltip = `${app.name} estará disponible próximamente.`
    return {
      label: app.name,
      icon: app.icon,
      disabled: app.status !== 'available',
      tooltip: app.status !== 'available' ? tooltip : undefined,
      onActivate: () => launchApp(app.id),
    }
  }

  const startMenuCategories: StartMenuCategory[] = [
    {
      id: 'programs',
      label: 'Programas',
      icon: '📂',
      entries: appRegistry.filter((app) => app.id !== 'settings').map((app) => appEntry(app.id)),
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: '📁',
      entries: [
        { label: 'Mis documentos', icon: '📁', onActivate: () => launchApp('file-explorer') },
        { label: 'Este equipo', icon: '🖥️', onActivate: () => launchApp('file-explorer') },
        { label: 'CV (Español)', icon: '📄', onActivate: () => openCv('es') },
        { label: 'CV (English)', icon: '📄', onActivate: () => openCv('en') },
      ],
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: '⚙️',
      entries: [
        { label: 'Configuración', icon: '⚙️', onActivate: () => launchApp('settings') },
        { label: 'Apariencia y temas', icon: '🎨', onActivate: () => launchApp('settings') },
        {
          label: 'Sistema',
          icon: '🖥️',
          disabled: true,
          tooltip: 'Los ajustes del sistema estarán disponibles próximamente.',
          onActivate: () => undefined,
        },
      ],
    },
    {
      id: 'search',
      label: 'Buscar',
      icon: '🔎',
      entries: [
        {
          label: 'Archivos o carpetas…',
          icon: '📄',
          disabled: true,
          tooltip: 'La búsqueda estará disponible próximamente.',
          onActivate: () => undefined,
        },
        {
          label: 'En Internet…',
          icon: '🌐',
          disabled: true,
          tooltip: 'Nando Browser estará disponible próximamente.',
          onActivate: () => undefined,
        },
      ],
    },
  ]

  const activateStartEntry = (entry: StartMenuEntry) => {
    if (entry.disabled) {
      setNotice(entry.tooltip ?? `${entry.label} estará disponible próximamente.`)
      return
    }
    entry.onActivate()
    closeStartMenu()
  }

  const openStartMenuCategory = (categoryId: string, anchor: HTMLElement) => {
    openStartCategoryAnchorRef.current = anchor
    setOpenStartCategoryPlacement(getMenuFlyoutPlacement(anchor))
    setOpenStartCategory(categoryId)
  }

  const focusFirstFlyoutItem = () => {
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-start-flyout] [data-menu-entry]')?.focus())
  }

  const returnToStartCategory = () => {
    setOpenStartCategory(null)
    document.querySelector<HTMLButtonElement>(`[data-start-category="${openStartCategory}"]`)?.focus()
  }

  const handleFlyoutKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (moveMenuFocus(event)) return
    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      returnToStartCategory()
    }
  }

  const showContextMenu = (event: DesktopContextEvent, target: DesktopContextTarget) => {
    event.preventDefault()
    event.stopPropagation()
    closeStartMenu()
    const menuWidth = 210
    const menuHeight = target.kind === 'desktop' ? 60 : 90
    setContextMenu({
      x: Math.max(4, Math.min(event.clientX, window.innerWidth - menuWidth - 4)),
      y: Math.max(4, Math.min(event.clientY, window.innerHeight - menuHeight - 4)),
      target,
    })
  }

  const openDesktopTarget = (target: DesktopContextTarget) => {
    setContextMenu(null)
    if (target.kind === 'desktop') return
    if (target.kind === 'user') {
      setNotice(`«${target.label}» está vacía.`)
      return
    }
    if (target.id === 'cv') downloadCv('es')
    else openShellWindow(target.id)
  }

  const deleteDesktopTarget = (target: DesktopContextTarget) => {
    setContextMenu(null)
    if (target.kind === 'system') {
      setProtectedItem(target.label)
    } else if (target.kind === 'user') {
      moveUserItemToRecycleBin(target.id)
      setNotice(`«${target.label}» se ha movido a la Papelera de reciclaje.`)
    }
  }

  const createFolderFromContext = (target: DesktopContextTarget) => {
    if (target.kind !== 'desktop') return
    const position = findNearestDesktopGridPosition(
      target.position,
      { width: window.innerWidth, height: window.innerHeight, taskbarHeight: taskbarHeight() },
      [...Object.values(desktopPositions), ...userDesktopItems]
    )
    createDesktopFolder(position)
    setContextMenu(null)
  }

  const snapDesktopShortcut = (itemId: string, position: DesktopPosition) => {
    const occupiedPositions = [
      ...Object.entries(desktopPositions)
        .filter(([id]) => id !== itemId)
        .map(([, occupied]) => occupied),
      ...userDesktopItems.filter((item) => item.id !== itemId),
    ]
    return findNearestDesktopGridPosition(
      position,
      { width: window.innerWidth, height: window.innerHeight, taskbarHeight: taskbarHeight() },
      occupiedPositions
    )
  }

  const systemShortcuts: Array<{
    id: DesktopSystemItemId
    label: string
    icon: string
  }> = [
    { id: 'about', label: 'About Me', icon: '👤' },
    { id: 'cv', label: 'CV_Fernando_Lopez', icon: '/pdf-document.svg' },
    { id: 'file-explorer', label: 'Este equipo', icon: '📁' },
    { id: 'recycle-bin', label: 'Papelera de reciclaje', icon: '🗑️' },
    { id: 'projects', label: 'Proyectos', icon: '🗂️' },
    { id: 'contact', label: 'Contacto', icon: '✉️' },
  ]

  return (
    <Desktop
      data-desktop-surface="true"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        if (contextMenu || protectedItem) {
          event.preventDefault()
          event.stopPropagation()
          setContextMenu(null)
          setProtectedItem(null)
          document.querySelector<HTMLButtonElement>(`[data-desktop-id="${selectedDesktopItem}"]`)?.focus()
        }
      }}
      onClick={() => {
        if (isStartMenuOpen) closeStartMenu()
        setOpenStartCategory(null)
        if (contextMenu) setContextMenu(null)
        setSelectedDesktopItem(null)
      }}
      onContextMenu={(event) => {
        if (event.target !== event.currentTarget &&
          !(event.target instanceof HTMLElement && event.target.dataset.desktopBackground === 'true')) return
        const surfaceBounds = event.currentTarget.getBoundingClientRect()
        showContextMenu(event, {
          kind: 'desktop',
          position: {
            x: event.clientX - surfaceBounds.left,
            y: event.clientY - surfaceBounds.top,
          },
        })
      }}
    >
      <DesktopShortcuts data-desktop-background="true" aria-label="Accesos del escritorio">
      {systemShortcuts.map((shortcut) => (
        <DesktopShortcut
          key={shortcut.id}
          itemId={shortcut.id}
          position={desktopPositions[shortcut.id]}
          icon={shortcut.icon}
          label={shortcut.label}
          selected={selectedDesktopItem === shortcut.id}
          onSelect={() => {
            setSelectedDesktopItem(shortcut.id)
            setContextMenu(null)
          }}
          onOpen={() => shortcut.id === 'cv' ? downloadCv('es') : openShellWindow(shortcut.id)}
          onMove={(position) => moveDesktopItem(shortcut.id, snapDesktopShortcut(shortcut.id, position))}
          onDropToRecycleBin={() => {
            setSelectedDesktopItem(shortcut.id)
            setProtectedItem(shortcut.label)
          }}
          onContextMenu={(event) => {
            setSelectedDesktopItem(shortcut.id)
            showContextMenu(event, { kind: 'system', id: shortcut.id, label: shortcut.label })
          }}
        />
      ))}

      {userDesktopItems.map((item: UserDesktopItem) => (
        <DesktopShortcut
          key={item.id}
          itemId={item.id}
          position={item}
          icon={item.icon}
          label={item.name}
          selected={selectedDesktopItem === item.id}
          onSelect={() => {
            setSelectedDesktopItem(item.id)
            setContextMenu(null)
          }}
          onOpen={() => setNotice(`«${item.name}» está vacía.`)}
          onMove={(position) => moveUserDesktopItem(item.id, snapDesktopShortcut(item.id, position))}
          onDropToRecycleBin={() => {
            moveUserItemToRecycleBin(item.id)
            setSelectedDesktopItem(null)
            setNotice(`«${item.name}» se ha movido a la Papelera de reciclaje.`)
          }}
          onContextMenu={(event) => {
            setSelectedDesktopItem(item.id)
            showContextMenu(event, { kind: 'user', id: item.id, label: item.name })
          }}
        />
      ))}

      </DesktopShortcuts>

      {windows.map((windowState) => (
        <WindowFrame
          key={windowState.id}
          windowState={windowState}
          isActive={activeWindowId === windowState.id}
          viewport={viewport}
          onFocus={() => focusWindow(windowState.id)}
          onClose={() => closeWindow(windowState.id)}
          onMinimize={() => minimizeWindow(windowState.id)}
          onMaximize={() =>
            toggleMaximize(windowState.id, {
              x: 4,
              y: 4,
              width: viewport.width - 8,
              height: viewport.height - 8,
            })
          }
          onMove={(x, y) => moveWindow(windowState.id, x, y)}
          onResize={(width, height) => resizeWindow(windowState.id, width, height)}
        >
          {windowState.id === 'about' ? (
            <AboutWindow />
          ) : windowState.id === 'file-explorer' ? (
            <FileExplorer
              onOpenAbout={() => openShellWindow('about')}
              onDownloadCv={downloadCv}
              onNotify={setNotice}
            />
          ) : windowState.id === 'settings' ? (
            <SettingsWindow
              selectedThemeId={selectedThemeId}
              onSelectTheme={setSelectedThemeId}
            />
          ) : windowState.id === 'recycle-bin' ? (
            <RecycleBin
              items={recycleBinItems}
              onRestore={restoreUserItemFromRecycleBin}
              onPermanentlyDelete={permanentlyDeleteUserItem}
              onEmpty={emptyRecycleBin}
            />
          ) : (
            <PortfolioSectionWindow
              sectionId={windowState.id}
              onDownloadCv={downloadCv}
            />
          )}
        </WindowFrame>
      ))}

      {contextMenu && (
        <ContextMenu
          role="menu"
          aria-label="Menú contextual"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={moveMenuFocus}
        >
          {contextMenu.target.kind === 'desktop' ? (
            <ContextMenuItem role="menuitem" type="button" onClick={() => createFolderFromContext(contextMenu.target)}>
              📁 Nueva carpeta
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem role="menuitem" type="button" autoFocus onClick={() => openDesktopTarget(contextMenu.target)}>
                Abrir
              </ContextMenuItem>
              <ContextDivider />
              <ContextMenuItem
                role="menuitem"
                type="button"
                $danger
                onClick={() => deleteDesktopTarget(contextMenu.target)}
              >
                Eliminar
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {protectedItem && (
        <ProtectedOverlay>
          <ProtectedDialog role="alertdialog" aria-modal="true" aria-labelledby="protected-title" onKeyDown={(event) => {
            if (event.key === 'Tab') {
              event.preventDefault()
              event.currentTarget.querySelector('button')?.focus()
            }
          }}>
            <ProtectedTitle id="protected-title">No se puede eliminar este elemento</ProtectedTitle>
            <ProtectedMessage>
              <span aria-hidden="true">🚫</span>
              <div>
                «{protectedItem}» es un elemento del sistema y está protegido. Solo se pueden eliminar
                elementos creados por el usuario durante esta sesión.
              </div>
            </ProtectedMessage>
            <ProtectedActions>
              <TaskbarButton type="button" autoFocus onClick={() => {
                setProtectedItem(null)
                document.querySelector<HTMLButtonElement>(`[data-desktop-id="${selectedDesktopItem}"]`)?.focus()
              }}>
                Aceptar
              </TaskbarButton>
            </ProtectedActions>
          </ProtectedDialog>
        </ProtectedOverlay>
      )}

      {isStartMenuOpen && (
        <StartMenu
          ref={startMenuRef}
          role="navigation"
          aria-label="Menú Start"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (moveMenuFocus(event)) return
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeStartMenu()
              startMenuButtonRef.current?.focus()
            }
            if (event.key === 'ArrowRight') {
              const category = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-start-category]')
              if (!category?.dataset.startCategory) return
              event.preventDefault()
              openStartMenuCategory(category.dataset.startCategory, category)
              focusFirstFlyoutItem()
            }
          }}
          onScroll={() => {
            setMenuTooltip(null)
            if (openStartCategoryAnchorRef.current) {
              setOpenStartCategoryPlacement(getMenuFlyoutPlacement(openStartCategoryAnchorRef.current))
            }
          }}
        >
          <MenuBrandRail aria-label="NandOS">
            <MenuLogo src="/nandos-logo.svg" alt="" aria-hidden="true" />
            <MenuBrandText>NandOS</MenuBrandText>
          </MenuBrandRail>
          <MenuContent>
            {startMenuCategories.map((category) => (
              <MenuCategoryGroup
                key={category.id}
                onMouseEnter={(event) => {
                  if (window.innerWidth > 640) openStartMenuCategory(category.id, event.currentTarget)
                }}
                onMouseLeave={() => { if (window.innerWidth > 640) setOpenStartCategory(null) }}
              >
                <MenuCategoryButton
                  data-start-category={category.id}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={openStartCategory === category.id}
                  aria-controls={`start-flyout-${category.id}`}
                  onClick={(event) => {
                    openStartMenuCategory(category.id, event.currentTarget)
                    if (event.detail === 0) focusFirstFlyoutItem()
                  }}
                >
                  <MenuCategoryIcon aria-hidden="true">{category.icon}</MenuCategoryIcon>
                  <span>{category.label}</span>
                  <MenuArrow aria-hidden="true">▶</MenuArrow>
                </MenuCategoryButton>
                {openStartCategory === category.id && openStartCategoryPlacement && createPortal(
                  <MenuFlyout
                    data-start-flyout
                    id={`start-flyout-${category.id}`}
                    role="group"
                    aria-label={category.label}
                    onKeyDown={handleFlyoutKeyDown}
                    style={{
                      left: `${openStartCategoryPlacement.left}px`,
                      top: `${openStartCategoryPlacement.top}px`,
                      width: `${openStartCategoryPlacement.width}px`,
                      maxHeight: `${openStartCategoryPlacement.maxHeight}px`,
                    }}
                  >
                    {viewport.width <= 640 && (
                      <MenuItem type="button" onClick={returnToStartCategory}>← Volver al menú</MenuItem>
                    )}
                    <MenuSectionHeading>{category.label}</MenuSectionHeading>
                    {category.entries.map((entry, index) => {
                      const tooltipId = `start-tooltip-${category.id}-${index}`

                      return (
                        <MenuItem
                          data-menu-entry
                          key={entry.label}
                          type="button"
                          $disabled={entry.disabled}
                          aria-disabled={entry.disabled || undefined}
                          {...menuTooltipProps(tooltipId, entry.disabled ? entry.tooltip : undefined)}
                          onClick={() => activateStartEntry(entry)}
                        >
                          <span aria-hidden="true">{entry.icon}</span>
                          {entry.label}
                        </MenuItem>
                      )
                    })}
                  </MenuFlyout>,
                  document.body
                )}
              </MenuCategoryGroup>
            ))}
            <MenuItem
              type="button"
              $disabled
              aria-disabled="true"
              {...menuTooltipProps('start-tooltip-help', 'La ayuda de NandOS estará disponible próximamente.')}
              onClick={() => setNotice('La ayuda de NandOS estará disponible próximamente.')}
            >
              <span aria-hidden="true">❔</span> Ayuda
            </MenuItem>
            <MenuItem
              type="button"
              $disabled
              aria-disabled="true"
              {...menuTooltipProps('start-tooltip-run', 'Ejecutar comandos estará disponible próximamente.')}
              onClick={() => setNotice('Ejecutar comandos estará disponible próximamente.')}
            >
              <span aria-hidden="true">🪟</span> Ejecutar…
            </MenuItem>
            <MenuDivider />
            <MenuItem
              type="button"
              {...menuTooltipProps('start-tooltip-logoff', 'Cerrar la sesión de Invitado y volver al inicio de sesión.')}
              onClick={logOffGuest}
            >
              <span aria-hidden="true">🔑</span> <span>Log off Invitado</span>
            </MenuItem>
            <MenuItem
              type="button"
              {...menuTooltipProps('start-tooltip-shutdown', 'Apagar NandOS.')}
              onClick={startShutdown}
            >
              <span aria-hidden="true">⏻</span> <span>Apagar</span>
            </MenuItem>
          </MenuContent>
        </StartMenu>
      )}

      {menuTooltip && typeof document !== 'undefined' && createPortal(
        <MenuTooltipBubble
          id={menuTooltip.id}
          role="tooltip"
          style={{ left: menuTooltip.left, top: menuTooltip.top }}
        >
          {menuTooltip.text}
        </MenuTooltipBubble>,
        document.body
      )}

      <Suspense fallback={null}>
        {MascotLab ? <MascotLab /> : <AssistantDock content={portfolioContent} viewport={viewport} onLaunchApp={launchApp} />}
      </Suspense>

      {notice && <Notice role="status">{notice}</Notice>}

      <Taskbar onClick={(event) => event.stopPropagation()}>
        <TaskbarButton
          type="button"
          $active={isStartMenuOpen}
          ref={startMenuButtonRef}
          aria-label="Abrir menú de aplicaciones"
          data-start-button
          onClick={() => {
            if (isStartMenuOpen) closeStartMenu()
            else {
              setOpenStartCategory(null)
              setStartMenuOpen(true)
            }
          }}
        >
          <StartButtonContent>
            <StartLogo src="/nandos-logo.svg" alt="" aria-hidden="true" />
            Start
          </StartButtonContent>
        </TaskbarButton>
        <TaskbarWindows aria-label="Aplicaciones abiertas">
        {windows.map((windowState) => (
          <TaskbarButton
            key={windowState.id}
            type="button"
            $active={activeWindowId === windowState.id}
            onClick={() =>
              windowState.isMinimized
                ? restoreWindow(windowState.id)
                : minimizeWindow(windowState.id)
            }
          >
            {windowState.icon} {windowState.title}
          </TaskbarButton>
        ))}
        </TaskbarWindows>
        <Tray aria-label="Bandeja del sistema">
          <TrayControl
            type="button"
            aria-label="Estado de conexión de red"
            data-tooltip="Conexión de red · ajustes próximamente"
            onClick={() => setNotice('Los ajustes de red estarán disponibles próximamente.')}
          >
            ◉
          </TrayControl>
          <TrayControl
            type="button"
            aria-label="Control de volumen"
            data-tooltip="Volumen · control próximamente"
            onClick={() => setNotice('El control de volumen estará disponible próximamente.')}
          >
            🔊
          </TrayControl>
          <TrayTime
            type="button"
            aria-label={`Hora ${formattedTime}. Reloj y calendario`}
            data-tooltip="Reloj y calendario · ajustes próximamente"
            onClick={() => setNotice('El calendario y los ajustes de hora estarán disponibles próximamente.')}
          >
            <time dateTime={clock.toISOString()}>{formattedTime}</time>
          </TrayTime>
        </Tray>
      </Taskbar>
    </Desktop>
  )
}
