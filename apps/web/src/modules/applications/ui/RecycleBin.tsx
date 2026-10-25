import { useState } from 'react'
import styled from '@emotion/styled'
import type { RecycleBinItem } from '../../shell/domain/types'

const RecycleSurface = styled.section`
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100%;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface);
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--os-border);
  background: var(--os-toolbar);
  font-size: 12px;
`

const ClassicButton = styled.button`
  padding: 5px 9px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  cursor: pointer;

  &:active { border-style: inset; }
  &:disabled { color: var(--os-disabled); cursor: not-allowed; }
  &:focus-visible { outline: 1px dotted var(--os-window-text); outline-offset: -5px; }
`

const ItemList = styled.div`
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 10px;
`

const RecycledRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 5px 7px;
  border: 1px solid var(--os-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface-alt);

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) auto;
    button:last-of-type { grid-column: 2; }
  }
`

const ItemName = styled.div`
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ItemDate = styled.time`
  color: var(--os-muted);
  font-size: 11px;
`

const EmptyState = styled.div`
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--os-muted);
  font-size: 13px;

  span { font-size: 42px; }
`

const ConfirmOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 12px;
  background: var(--os-overlay);
`

const ConfirmDialog = styled.section`
  width: min(360px, 100%);
  padding: 2px;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);
`

const ConfirmTitle = styled.div`
  padding: 5px 8px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 12px;
  font-weight: 700;
`

const ConfirmContent = styled.div`
  padding: 14px;
  font-size: 13px;
  line-height: 1.45;
`

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 12px;
`

type PendingAction =
  | { kind: 'item'; id: string; name: string }
  | { kind: 'empty' }

type RecycleBinProps = {
  items: RecycleBinItem[]
  onRestore: (id: string) => void
  onPermanentlyDelete: (id: string) => void
  onEmpty: () => void
}

export function RecycleBin({ items, onRestore, onPermanentlyDelete, onEmpty }: RecycleBinProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const confirmDeletion = () => {
    if (pendingAction?.kind === 'item') onPermanentlyDelete(pendingAction.id)
    if (pendingAction?.kind === 'empty') onEmpty()
    setPendingAction(null)
  }

  return (
    <RecycleSurface aria-label="Papelera de reciclaje">
      <Toolbar>
        <span>{items.length} elemento{items.length === 1 ? '' : 's'}</span>
        <ClassicButton type="button" disabled={items.length === 0} onClick={() => setPendingAction({ kind: 'empty' })}>
          Vaciar papelera
        </ClassicButton>
      </Toolbar>

      {items.length > 0 ? (
        <ItemList aria-label="Elementos eliminados">
          {items.map((item) => (
            <RecycledRow key={item.id}>
              <ItemName title={item.name}>{item.icon} {item.name}</ItemName>
              <ItemDate dateTime={item.deletedAt}>
                {new Date(item.deletedAt).toLocaleDateString('es-ES')}
              </ItemDate>
              <div>
                <ClassicButton type="button" onClick={() => onRestore(item.id)}>Restaurar</ClassicButton>{' '}
                <ClassicButton
                  type="button"
                  onClick={() => setPendingAction({ kind: 'item', id: item.id, name: item.name })}
                >
                  Eliminar
                </ClassicButton>
              </div>
            </RecycledRow>
          ))}
        </ItemList>
      ) : (
        <EmptyState>
          <span aria-hidden="true">🗑️</span>
          <div>La papelera está vacía.</div>
        </EmptyState>
      )}

      {pendingAction && (
        <ConfirmOverlay>
          <ConfirmDialog role="alertdialog" aria-modal="true" aria-labelledby="recycle-confirm-title">
            <ConfirmTitle id="recycle-confirm-title">Confirmar eliminación</ConfirmTitle>
            <ConfirmContent>
              {pendingAction.kind === 'empty'
                ? '¿Quieres eliminar definitivamente todos los elementos creados por el usuario?'
                : `¿Quieres eliminar definitivamente «${pendingAction.name}»?`}
            </ConfirmContent>
            <ConfirmActions>
              <ClassicButton type="button" onClick={() => setPendingAction(null)}>Cancelar</ClassicButton>
              <ClassicButton type="button" onClick={confirmDeletion}>Eliminar</ClassicButton>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </RecycleSurface>
  )
}
