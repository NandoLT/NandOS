import { useId, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import styled from '@emotion/styled'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { usePortfolioContent } from '../../portfolio/application/usePortfolioContent'
import { useTouchPress } from '../../../shared/lib/useTouchPress'
import { AppIcon } from '../../../shared/lib/AppIcon'
import type { UserDesktopItem } from '../../shell/domain/types'
import { COMPUTER_DIRECTORY, DESKTOP_DIRECTORY, DOCUMENTS_DIRECTORY, createExplorerTree } from '../domain/explorer'
import type { ExplorerItem } from '../domain/explorer'

const noFolders: readonly UserDesktopItem[] = []
const itemKey = (item: ExplorerItem) => item.kind === 'folder' ? item.directoryId : item.action

const Explorer = styled.div`
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  height: 100%;
  color: var(--os-window-text);
  background: var(--os-window);
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border-bottom: var(--os-raised-border);
  background: var(--os-toolbar);
  font-size: 13px;
`

const MenuBar = styled.nav`
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  padding: 1px 4px;
  border-bottom: var(--os-raised-border);
  background: var(--os-toolbar);
  font-size: 12px;
`

const MenuTrigger = styled.button`
  padding: 4px 7px;
  border: 1px solid transparent;
  color: var(--os-window-text);
  background: transparent;
  font: inherit;
  cursor: pointer;
  &:hover, &[aria-expanded='true'] {
    color: var(--os-menu-hover-text);
    background: var(--os-menu-hover);
  }
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -2px; }
`

const ToolbarButton = styled.button`
  width: 36px;
  height: 27px;
  padding: 0;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  svg { display: block; margin: auto; }
  cursor: pointer;

  &:active:not(:disabled) { border: var(--os-inset-border); }
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -4px; }
  @media (pointer: coarse) { width: 44px; height: 44px; }

  &:disabled {
    color: var(--os-disabled);
    cursor: not-allowed;
  }
`

const Address = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 5px;
  border-bottom: var(--os-raised-border);
  background: var(--os-toolbar);
  font-size: 12px;
`

const AddressField = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding-left: 4px;
  border: var(--os-inset-border);
  color: var(--os-input-text);
  background: var(--os-input);

  &:focus-within { outline: 1px dotted var(--os-accent); outline-offset: -2px; }
  select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    font: inherit;
  }
`

const Route = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DropArrow = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  min-height: 22px;
  border: var(--os-raised-border);
  color: var(--os-window-text);
  background: var(--os-window);
  font-size: 10px;
  @media (pointer: coarse) { width: 44px; min-height: 44px; }
`

const FolderPane = styled.div`
  min-height: 0;
  overflow: auto;
  border: var(--os-inset-border);
  color: var(--os-input-text);
  background: var(--os-input);
  &:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -3px; }
`

const StatusBar = styled.footer`
  display: grid;
  grid-template-columns: minmax(77px, 1fr) minmax(0, 2fr);
  gap: 2px;
  padding: 2px;
  font-size: 12px;
  @media (min-width: 641px) { padding-right: 20px; }
  > span {
    overflow: hidden;
    padding: 2px 5px;
    border: var(--os-inset-border);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const FileGrid = styled.div<{ $list: boolean }>`
  display: grid;
  grid-template-columns: ${({ $list }) => $list ? '1fr' : 'repeat(auto-fill, minmax(88px, 1fr))'};
  align-content: start;
  gap: 8px;
  padding: 8px;
  &[data-view='list'] > button {
    display: flex;
    align-items: center;
    min-height: 30px;
    padding: 3px 5px;
  }
  &[data-view='list'] > button > span:first-of-type { width: 22px; height: 22px; }
  &[data-view='list'] > button > span:last-of-type { text-align: left; }
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
  color: ${({ $selected }) => ($selected ? 'var(--os-selected-text)' : 'var(--os-input-text)')};
  background: ${({ $selected }) => ($selected ? 'var(--os-selected)' : 'transparent')};
  cursor: default;
  touch-action: pan-y;
  user-select: none;

  &:hover,
  &:focus-visible {
    border-color: var(--os-accent);
    color: var(--os-selected-text);
    background: var(--os-selected);
    outline: none;
  }

  > span:first-of-type {
    display: grid;
    place-items: center;
    height: 32px;
  }

  > span:last-of-type {
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

const MenuDropdown = styled(ItemContextMenu)`
  position: absolute;
  top: 100%;
  width: 180px;
  max-width: 100%;
  min-width: 0;
  button:disabled { opacity: .55; cursor: default; }
`

const arrowPath = 'M8 2 1 9l7 7v-5h10V7H8Z'

function NavigationArrow({ direction }: { direction: 'left' | 'right' | 'up' }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d={arrowPath} transform={direction === 'left' ? undefined : `rotate(${direction === 'up' ? 90 : 180} 10 9)`} />
  </svg>
}

type ExplorerCommand = { label: string; run: () => void; disabled?: boolean }

type FileExplorerProps = {
  folders?: readonly UserDesktopItem[]
  initialDirectory?: string
  onOpenAbout: () => void
  onDownloadCv: (language: 'es' | 'en') => void
  onNotify: (message: string) => void
  onClose?: () => void
  onHelp?: () => void
}

export function FileExplorer({
  folders = noFolders, initialDirectory = COMPUTER_DIRECTORY, onOpenAbout, onDownloadCv, onNotify, onClose, onHelp,
}: FileExplorerProps) {
  const touchPress = useTouchPress()
  const { data = DEFAULT_PORTFOLIO_CONTENT } = usePortfolioContent()
  const addressId = useId()
  const paneId = `${addressId}-files`
  const [openMenu, setOpenMenu] = useState<{ name: string; left: number } | null>(null)
  const [view, setView] = useState<'icons' | 'list'>('icons')
  const tree = useMemo(() => createExplorerTree(folders), [folders])
  const [history, setHistory] = useState(() => {
    const entries = tree.pathTo(initialDirectory).map(({ id }) => id)
    return { entries, index: entries.length - 1 }
  })
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    item: ExplorerItem
  } | null>(null)
  const current = tree.getDirectory(history.entries[history.index])
  const route = tree.pathTo(current.id).map(({ name }) => name).join(' › ')
  const backIndex = history.entries.findLastIndex((id, index) => index < history.index && tree.has(id))
  const forwardIndex = history.entries.findIndex((id, index) => index > history.index && tree.has(id))
  const items = tree.contentsOf(current.id).map((item) => {
    if (item.kind === 'folder') return item
    if (item.action === 'cv-es') return { ...item, name: data.cvDocuments.es?.filename ?? item.name }
    if (item.action === 'cv-en') return { ...item, name: data.cvDocuments.en?.filename ?? item.name }
    return item
  })

  const clearSelection = () => {
    setSelectedItem(null)
    setContextMenu(null)
    const pane = document.getElementById(paneId)
    if (pane) pane.scrollTop = 0
  }

  const navigate = (id: string) => {
    if (!tree.has(id) || id === current.id) return
    setHistory(({ entries, index }) => ({ entries: [...entries.slice(0, index + 1), id], index: index + 1 }))
    clearSelection()
  }

  const goToHistory = (index: number) => {
    if (index < 0) return
    setHistory((previous) => ({ ...previous, index }))
    clearSelection()
  }

  const openItem = (item: ExplorerItem) => {
    setContextMenu(null)
    if (item.kind === 'folder') {
      navigate(item.directoryId)
      document.getElementById(paneId)?.focus({ preventScroll: true })
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
    setOpenMenu(null)
    setSelectedItem(itemKey(item))
    setContextMenu({
      x: Math.max(4, Math.min(event.clientX, window.innerWidth - 160)),
      y: Math.max(4, Math.min(event.clientY, window.innerHeight - 48)),
      item,
    })
  }

  const selected = items.find((item) => itemKey(item) === selectedItem)
  const up = () => { if (current.parentId) navigate(current.parentId) }
  const menus: { name: string; commands: ExplorerCommand[] }[] = [
    { name: 'Archivo', commands: [
      { label: 'Abrir', disabled: !selected, run: () => { if (selected) openItem(selected) } },
      ...(onClose ? [{ label: 'Cerrar ventana', run: onClose }] : []),
    ] },
    { name: 'Edición', commands: [
      { label: 'Seleccionar primer objeto', disabled: !items.length, run: () => setSelectedItem(itemKey(items[0])) },
      { label: 'Quitar selección', disabled: !selected, run: () => setSelectedItem(null) },
    ] },
    { name: 'Ver', commands: [
      { label: 'Iconos', disabled: view === 'icons', run: () => setView('icons') },
      { label: 'Lista', disabled: view === 'list', run: () => setView('list') },
    ] },
    { name: 'Ir', commands: [
      { label: 'Atrás', disabled: backIndex < 0, run: () => goToHistory(backIndex) },
      { label: 'Adelante', disabled: forwardIndex < 0, run: () => goToHistory(forwardIndex) },
      { label: 'Subir un nivel', disabled: !current.parentId, run: up },
    ] },
    { name: 'Favoritos', commands: [
      { label: 'Este equipo', run: () => navigate(COMPUTER_DIRECTORY) },
      { label: 'Escritorio', run: () => navigate(DESKTOP_DIRECTORY) },
      { label: 'Mis documentos', run: () => navigate(DOCUMENTS_DIRECTORY) },
    ] },
    { name: 'Ayuda', commands: [
      { label: 'Ayuda de NandOS', run: () => onHelp ? onHelp() : onNotify('Usa Dirección para saltar a una carpeta.') },
    ] },
  ]

  return (
    <Explorer aria-label="Explorador de archivos" onClick={() => { setContextMenu(null); setOpenMenu(null) }}>
      <MenuBar aria-label="Opciones del Explorador"
        onClick={(event) => event.stopPropagation()}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null) }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !openMenu) return
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
          setOpenMenu(null)
        }}>
        {menus.map(({ name, commands }) => (
          <div key={name}>
            <MenuTrigger type="button" aria-expanded={openMenu?.name === name} onClick={(event) => {
              const button = event.currentTarget
              setContextMenu(null)
              setOpenMenu((previous) => previous?.name === name ? null : {
                name, left: Math.max(0, Math.min(button.offsetLeft, (button.closest('nav')?.clientWidth ?? 180) - 180)),
              })
            }}>{name}</MenuTrigger>
            {openMenu?.name === name && (
              <MenuDropdown role="group" aria-label={`Opciones de ${name}`} style={{ left: openMenu.left }}>
                {commands.map(({ label, run, disabled }) => (
                  <ItemContextMenuAction key={label} type="button" disabled={disabled} onClick={(event) => {
                    event.currentTarget.closest('nav')?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
                    setOpenMenu(null)
                    run()
                  }}>{label}</ItemContextMenuAction>
                ))}
              </MenuDropdown>
            )}
          </div>
        ))}
      </MenuBar>
      <Toolbar role="group" aria-label="Navegación de carpetas">
        <ToolbarButton type="button" onClick={() => goToHistory(backIndex)}
          disabled={backIndex < 0} aria-label="Atrás" title="Atrás"><NavigationArrow direction="left" /></ToolbarButton>
        <ToolbarButton type="button" onClick={() => goToHistory(forwardIndex)}
          disabled={forwardIndex < 0} aria-label="Adelante" title="Adelante"><NavigationArrow direction="right" /></ToolbarButton>
        <ToolbarButton type="button" onClick={up}
          disabled={!current.parentId} aria-label="Subir un nivel" title="Subir un nivel"><NavigationArrow direction="up" /></ToolbarButton>
      </Toolbar>
      <Address>
        <label htmlFor={addressId}>Dirección</label>
        <AddressField>
          <AppIcon icon={current.icon} />
          <Route aria-label="Ruta actual" title={route}>{route}</Route>
          <DropArrow aria-hidden="true">▼</DropArrow>
          <select id={addressId} value={current.id} onChange={(event) => navigate(event.target.value)}>
            {tree.listTree().map(({ directory, depth }) => (
              <option key={directory.id} value={directory.id}>
                {`${'\u00a0\u00a0'.repeat(depth)}${depth ? '↳ ' : ''}${directory.name}`}
              </option>
            ))}
          </select>
        </AddressField>
      </Address>
      <FolderPane id={paneId} tabIndex={-1} aria-label={`Contenido de ${current.name}`}>
      {items.length > 0 ? (
        <FileGrid $list={view === 'list'} data-view={view}>
          {items.map((item) => (
            <FileItem
              id={`explorer-item-${encodeURIComponent(itemKey(item))}`}
              key={itemKey(item)}
              type="button"
              $selected={selectedItem === itemKey(item)}
              aria-pressed={selectedItem === itemKey(item)}
              aria-label={`${item.kind === 'folder' ? 'Carpeta' : 'Abrir'} ${item.name}`}
              onPointerDown={(event) => touchPress.start(event, () => showItemContextMenu(event, item))}
              onPointerMove={touchPress.move}
              onPointerUp={touchPress.cancel}
              onPointerCancel={touchPress.cancel}
              onClick={(event) => {
                event.stopPropagation()
                if (touchPress.consumeHold()) return
                setOpenMenu(null)
                setSelectedItem(itemKey(item))
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
              <span aria-hidden="true"><AppIcon icon={item.icon} size={view === 'list' ? 18 : 32} /></span>
              <span>{item.name}</span>
            </FileItem>
          ))}
        </FileGrid>
      ) : (
        <EmptyFolder>Esta carpeta está vacía.</EmptyFolder>
      )}
      </FolderPane>
      <StatusBar aria-label="Estado del Explorador">
        <span role="status">{items.length} {items.length === 1 ? 'objeto' : 'objetos'}</span>
        <span title={route}><AppIcon icon={current.icon} size={13} /> {current.name}</span>
      </StatusBar>
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
            document.getElementById(`explorer-item-${encodeURIComponent(itemKey(contextMenu.item))}`)?.focus()
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
