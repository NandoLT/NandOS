import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import styled from '@emotion/styled'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { usePortfolioContent } from '../../portfolio/application/usePortfolioContent'
import { useTouchPress } from '../../../shared/lib/useTouchPress'

type ExplorerItem = {
  name: string
  kind: 'folder' | 'file' | 'application'
  icon: string
  path?: string
  action?: 'about' | 'cv-es' | 'cv-en' | 'roadmap'
}

const contents: Record<string, ExplorerItem[]> = {
  'Este equipo': [
    { name: 'Escritorio', kind: 'folder', icon: '🖥️', path: 'Escritorio' },
    { name: 'Mis documentos', kind: 'folder', icon: '📂', path: 'Mis documentos' },
    { name: 'Proyectos', kind: 'folder', icon: '🗂️', path: 'Proyectos' },
  ],
  Escritorio: [
    { name: 'About Me', kind: 'application', icon: '👤', action: 'about' },
    { name: 'Mis documentos', kind: 'folder', icon: '📂', path: 'Mis documentos' },
  ],
  'Mis documentos': [
    { name: 'Fernando_Lopez_Trejo_CV_ES.pdf', kind: 'file', icon: '📄', action: 'cv-es' },
    { name: 'Fernando_Lopez_Trejo_CV_EN.pdf', kind: 'file', icon: '📄', action: 'cv-en' },
    { name: 'README.txt', kind: 'file', icon: '📝', action: 'roadmap' },
    { name: 'Proyectos', kind: 'folder', icon: '🗂️', path: 'Proyectos' },
  ],
  Proyectos: [
    { name: 'NandOS', kind: 'folder', icon: '💾', path: 'NandOS' },
    { name: 'Portfolio web', kind: 'file', icon: '🌐', action: 'roadmap' },
  ],
  NandOS: [
    { name: 'ROADMAP.md', kind: 'file', icon: '📋', action: 'roadmap' },
    { name: 'About Me', kind: 'application', icon: '👤', action: 'about' },
  ],
}

const Explorer = styled.div`
  display: grid;
  grid-template-rows: auto auto 1fr;
  min-height: 100%;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-surface);
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--os-border);
  background: var(--os-toolbar);
  font-size: 13px;
`

const ToolbarButton = styled.button`
  padding: 3px 8px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  cursor: pointer;

  &:disabled {
    color: var(--os-disabled);
    cursor: not-allowed;
  }
`

const Address = styled.div`
  overflow: hidden;
  padding: 7px 10px;
  border-bottom: 1px solid var(--os-border);
  color: var(--os-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  align-content: start;
  gap: 8px;
  padding: 12px;
`

const FileItem = styled.button<{ $selected: boolean }>`
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 7px;
  min-height: 88px;
  padding: 8px 5px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--os-accent)' : 'transparent')};
  border-radius: var(--os-control-radius);
  color: ${({ $selected }) => ($selected ? 'var(--os-selected-text)' : 'var(--os-window-text)')};
  background: ${({ $selected }) => ($selected ? 'var(--os-selected)' : 'transparent')};
  cursor: default;
  touch-action: pan-y;
  user-select: none;

  &:hover,
  &:focus-visible {
    border-color: var(--os-accent);
    background: var(--os-selected);
    outline: none;
  }

  span:first-of-type {
    font-size: 30px;
  }

  span:last-of-type {
    max-width: 100%;
    font-size: 12px;
    text-align: center;
    overflow-wrap: anywhere;
  }
`

const ItemContextMenu = styled.div`
  position: fixed;
  z-index: 1400;
  min-width: 150px;
  padding: 3px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-menu);
  box-shadow: 3px 3px var(--os-shadow);
`

const ItemContextMenuAction = styled.button`
  width: 100%;
  padding: 7px 24px 7px 10px;
  border: 0;
  background: transparent;
  color: var(--os-menu-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: var(--os-menu-hover-text);
    background: var(--os-menu-hover);
    outline: none;
  }
`

const EmptyFolder = styled.p`
  padding: 14px;
  color: var(--os-muted);
  font-size: 13px;
`

type FileExplorerProps = {
  onOpenAbout: () => void
  onDownloadCv: (language: 'es' | 'en') => void
  onNotify: (message: string) => void
}

export function FileExplorer({ onOpenAbout, onDownloadCv, onNotify }: FileExplorerProps) {
  const touchPress = useTouchPress()
  const { data = DEFAULT_PORTFOLIO_CONTENT } = usePortfolioContent()
  const [currentPath, setCurrentPath] = useState('Este equipo')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    item: ExplorerItem
  } | null>(null)
  const pathParts = currentPath.split(' / ')
  const items = (contents[pathParts.at(-1) ?? 'Este equipo'] ?? []).map((item) => {
    if (item.action === 'cv-es') return { ...item, name: data.cvDocuments.es?.filename ?? item.name }
    if (item.action === 'cv-en') return { ...item, name: data.cvDocuments.en?.filename ?? item.name }
    return item
  })

  const goBack = () => {
    if (pathParts.length > 1) {
      setCurrentPath(pathParts.slice(0, -1).join(' / '))
      setSelectedItem(null)
    } else {
      setCurrentPath('Este equipo')
    }
  }

  const openItem = (item: ExplorerItem) => {
    setContextMenu(null)
    if (item.kind === 'folder' && item.path) {
      setCurrentPath(`${currentPath} / ${item.path}`)
      setSelectedItem(null)
      return
    }

    if (item.action === 'about') onOpenAbout()
    if (item.action === 'cv-es') onDownloadCv('es')
    if (item.action === 'cv-en') onDownloadCv('en')
    if (item.action === 'roadmap') onNotify('Este documento se abrirá en una próxima iteración.')
  }

  const showItemContextMenu = (event: Pick<ReactMouseEvent, 'preventDefault' | 'stopPropagation' | 'clientX' | 'clientY'>, item: ExplorerItem) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedItem(item.name)
    setContextMenu({
      x: Math.max(4, Math.min(event.clientX, window.innerWidth - 160)),
      y: Math.max(4, Math.min(event.clientY, window.innerHeight - 48)),
      item,
    })
  }

  return (
    <Explorer aria-label="Explorador de archivos" onClick={() => setContextMenu(null)}>
      <Toolbar>
        <ToolbarButton type="button" onClick={goBack} disabled={pathParts.length === 1} aria-label="Volver">
          ← Atrás
        </ToolbarButton>
        <span>Doble clic para abrir · un toque en pantallas táctiles</span>
      </Toolbar>
      <Address aria-label="Ruta actual">📍 {pathParts.join('  ›  ')}</Address>
      {items.length > 0 ? (
        <FileGrid>
          {items.map((item) => (
            <FileItem
              id={`explorer-item-${encodeURIComponent(item.name)}`}
              key={item.name}
              type="button"
              $selected={selectedItem === item.name}
              aria-pressed={selectedItem === item.name}
              aria-label={`${item.kind === 'folder' ? 'Carpeta' : 'Abrir'} ${item.name}`}
              onPointerDown={(event) => touchPress.start(event, () => showItemContextMenu(event, item))}
              onPointerMove={touchPress.move}
              onPointerUp={touchPress.cancel}
              onPointerCancel={touchPress.cancel}
              onClick={(event) => {
                event.stopPropagation()
                if (touchPress.consumeHold()) return
                setSelectedItem(item.name)
                setContextMenu(null)
                if (touchPress.isTouch()) openItem(item)
              }}
              onDoubleClick={() => { if (!touchPress.isTouch()) openItem(item) }}
              onContextMenu={(event) => showItemContextMenu(event, item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.preventDefault(); openItem(item) }
                if (event.key === 'Escape' && contextMenu) {
                  event.preventDefault()
                  event.stopPropagation()
                  setContextMenu(null)
                }
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </FileItem>
          ))}
        </FileGrid>
      ) : (
        <EmptyFolder>Esta carpeta está vacía.</EmptyFolder>
      )}
      {contextMenu && (
        <ItemContextMenu
          role="menu"
          aria-label={`Acciones para ${contextMenu.item.name}`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            setContextMenu(null)
            document.getElementById(`explorer-item-${encodeURIComponent(contextMenu.item.name)}`)?.focus()
          }}
        >
          <ItemContextMenuAction
            role="menuitem"
            type="button"
            autoFocus
            onClick={() => openItem(contextMenu.item)}
          >
            Abrir
          </ItemContextMenuAction>
        </ItemContextMenu>
      )}
    </Explorer>
  )
}
