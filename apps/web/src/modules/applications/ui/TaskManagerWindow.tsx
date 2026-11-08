import { useState } from 'react'
import styled from '@emotion/styled'
import { AppIcon } from '../../../shared/lib/AppIcon'
import type { WindowId, WindowState } from '../../shell/domain/types'

const Panel = styled.section`
  display: grid;
  gap: 12px;
  color: var(--os-window-text);
  font-size: 13px;
  h2 { margin: 0; font-size: 15px; }
`

const Table = styled.table`
  width: 100%;
  border-spacing: 0;
  table-layout: fixed;
  border: var(--os-inset-border);
  color: var(--os-input-text);
  background: var(--os-input);
  th {
    padding: 5px 8px;
    border: var(--os-raised-border);
    color: var(--os-window-text);
    background: var(--os-toolbar);
    text-align: left;
  }
  th:last-child { width: 34%; }
  td { padding: 0; overflow-wrap: anywhere; }
  td + td, td[colspan] { padding: 6px 8px; }
  tr[data-selected='true'] td { color: var(--os-accent-text); background: var(--os-accent); }
  td button {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 6px;
    padding: 5px 8px;
    border: 0;
    color: inherit;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  td button:focus-visible { outline: 1px dashed currentColor; outline-offset: -2px; }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  button {
    padding: 6px 10px;
    border: var(--os-raised-border);
    color: var(--os-window-text);
    background: var(--os-window);
    cursor: pointer;
  }
  button:disabled { color: var(--os-disabled); cursor: default; }
  button:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -3px; }
`

export function TaskManagerWindow({ windows, activeWindowId, onSwitchTo, onCloseTask }: {
  windows: readonly WindowState[]
  activeWindowId: WindowId | null
  onSwitchTo: (id: WindowId) => void
  onCloseTask: (id: WindowId) => void
}) {
  const [selectedId, setSelectedId] = useState<WindowId | null>(null)
  const tasks = windows.filter(({ id }) => id !== 'task-manager')
  const selected = tasks.find(({ id }) => id === selectedId) ?? tasks[0]

  return <Panel aria-label="Gestión de aplicaciones abiertas">
    <h2>Aplicaciones</h2>
    <Table aria-label="Ventanas de esta sesión">
      <thead><tr><th scope="col">Aplicación</th><th scope="col">Estado</th></tr></thead>
      <tbody>
        {tasks.map((task) => <tr key={task.id} data-selected={selected?.id === task.id}>
          <td><button type="button" aria-pressed={selected?.id === task.id} onClick={() => setSelectedId(task.id)}>
            <AppIcon icon={task.icon} />{task.title}
          </button></td>
          <td>{task.isMinimized ? 'Minimizada' : task.id === activeWindowId ? 'Activa' : 'Abierta'}</td>
        </tr>)}
        {!tasks.length && <tr><td colSpan={2}>No hay otras aplicaciones abiertas.</td></tr>}
      </tbody>
    </Table>
    <Actions>
      <button type="button" disabled={!selected} onClick={() => { if (selected) onSwitchTo(selected.id) }}>Ir a la ventana</button>
      <button type="button" disabled={!selected} onClick={() => { if (selected) onCloseTask(selected.id) }}>Cerrar tarea</button>
    </Actions>
  </Panel>
}
