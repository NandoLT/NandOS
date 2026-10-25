import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import styled from '@emotion/styled'
import type { WindowBounds, WindowState } from '../domain/types'

type WindowFrameProps = {
  windowState: WindowState
  viewport: WindowBounds
  children: ReactNode
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onMove: (x: number, y: number) => void
  onResize: (width: number, height: number) => void
}

const Frame = styled.section<{ $window: WindowState }>`
  position: absolute;
  top: ${({ $window }) => $window.bounds.y}px;
  left: ${({ $window }) => $window.bounds.x}px;
  z-index: ${({ $window }) => $window.zIndex};
  display: ${({ $window }) => ($window.isMinimized ? 'none' : 'grid')};
  grid-template-rows: 28px minmax(0, 1fr) 18px;
  width: ${({ $window }) => $window.bounds.width}px;
  height: ${({ $window }) => $window.bounds.height}px;
  min-width: 300px;
  min-height: 180px;
  overflow: hidden;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);

  @media (max-width: 640px) {
    top: 8px;
    left: 8px;
    width: calc(100vw - 16px);
    height: calc(100vh - 58px);
    min-width: 0;
    grid-template-rows: 28px minmax(0, 1fr);
  }
`

const TitleBar = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 3px 2px 6px;
  color: var(--os-titlebar-text);
  background: ${({ $active }) => ($active ? 'var(--os-titlebar)' : 'var(--os-titlebar-inactive)')};
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`

const Title = styled.span`
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const WindowButton = styled.button`
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;

  &:active {
    border-style: inset;
  }

  &:focus-visible {
    outline: 2px dotted var(--os-accent-text);
    outline-offset: -5px;
  }
`

const Content = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 18px;
  background: var(--os-window);
`

const ResizeHandle = styled.button`
  position: relative;
  grid-row: 3;
  justify-self: end;
  align-self: end;
  width: 16px;
  height: 16px;
  margin-right: 2px;
  padding: 0;
  border: 0;
  background: repeating-linear-gradient(135deg, transparent 0 3px, var(--os-border-dark) 3px 4px);
  cursor: nwse-resize;
  touch-action: none;

  &:focus-visible {
    outline: 2px dotted var(--os-accent);
    outline-offset: -2px;
  }

  @media (max-width: 640px) { display: none; }
`

export function WindowFrame({
  windowState,
  viewport,
  children,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
}: WindowFrameProps) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      windowState.isMaximized ||
      event.target instanceof HTMLButtonElement
    ) {
      return
    }
    onFocus()

    const startX = event.clientX
    const startY = event.clientY
    const originX = windowState.bounds.x
    const originY = windowState.bounds.y

    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = Math.max(
        8,
        Math.min(viewport.width - 120, originX + moveEvent.clientX - startX)
      )
      const nextY = Math.max(
        8,
        Math.min(viewport.height - 80, originY + moveEvent.clientY - startY)
      )
      onMove(nextX, nextY)
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || windowState.isMaximized) return
    event.preventDefault()
    event.stopPropagation()
    onFocus()

    const startX = event.clientX
    const startY = event.clientY
    const startWidth = windowState.bounds.width
    const startHeight = windowState.bounds.height
    const maxWidth = Math.max(320, viewport.width - windowState.bounds.x - 8)
    const maxHeight = Math.max(200, viewport.height - windowState.bounds.y - 8)

    const handleMove = (moveEvent: PointerEvent) => {
      const width = Math.max(320, Math.min(maxWidth, startWidth + moveEvent.clientX - startX))
      const height = Math.max(200, Math.min(maxHeight, startHeight + moveEvent.clientY - startY))
      onResize(width, height)
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <Frame
      $window={windowState}
      aria-label={windowState.title}
      role="dialog"
      onPointerDown={onFocus}
    >
      <TitleBar $active={!windowState.isMinimized} onPointerDown={handlePointerDown}>
        <span aria-hidden="true">{windowState.icon}</span>
        <Title>{windowState.title}</Title>
        <WindowButton aria-label="Minimizar" onClick={onMinimize}>
          _
        </WindowButton>
        <WindowButton aria-label="Maximizar" onClick={onMaximize}>
          {windowState.isMaximized ? '❐' : '□'}
        </WindowButton>
        <WindowButton aria-label="Cerrar" onClick={onClose}>
          ×
        </WindowButton>
      </TitleBar>
      <Content>{children}</Content>
      <ResizeHandle
        type="button"
        aria-label={`Redimensionar ${windowState.title}`}
        onPointerDown={handleResizePointerDown}
      />
    </Frame>
  )
}
