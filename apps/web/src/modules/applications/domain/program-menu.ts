import type { AppId } from '@nandoos/contracts'
import { appRegistry } from './app-registry'

export type ProgramMenuItem = {
  id: string
  label: string
  icon: string
  appId?: AppId
  disabled?: boolean
  children?: ProgramMenuItem[]
}
const app = (id: AppId): ProgramMenuItem => {
  const entry = appRegistry.find((item) => item.id === id)!
  return { id, appId: id, label: entry.name, icon: entry.icon, disabled: entry.status !== 'available' }
}
const folder = (id: string, label: string, children: ProgramMenuItem[]): ProgramMenuItem => ({ id, label, icon: '📁', children })

// Accessories and its Games/Multimedia/System Tools folders follow Windows 95.
// Portfolio, Internet and Development adapt that organization to NandOS.
export const programMenu: ProgramMenuItem[] = [
  folder('portfolio', 'Portfolio', ['about', 'experience', 'projects', 'skills', 'cv-viewer', 'contact'].map((id) => app(id as AppId))),
  folder('accessories', 'Accesorios', [
    folder('system-tools', 'Herramientas del sistema', [app('task-manager'), app('recycle-bin')]),
    folder('games', 'Juegos', [app('minesweeper'), app('solitaire'), app('pinball')]),
    folder('multimedia', 'Multimedia', [app('media-player')]),
    app('calculator'), app('calendar'), app('paint'), app('writer'),
  ]),
  folder('internet', 'Internet', [app('browser'), app('mail')]),
  folder('development', 'Desarrollo', [app('code-editor')]),
  app('file-explorer'), app('terminal'),
]
