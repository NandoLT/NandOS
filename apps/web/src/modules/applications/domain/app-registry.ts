import type { AppDefinition } from '@nandoos/contracts'
import { ABOUT_ME_ICON } from '../../../shared/lib/app-icons'

export type RegisteredApp = AppDefinition & {
  icon: string
  windowTitle: string
}

export const appRegistry: RegisteredApp[] = [
  {
    id: 'about',
    name: 'About Me',
    windowTitle: 'Fernando.exe',
    icon: ABOUT_ME_ICON,
    status: 'available',
  },
  {
    id: 'file-explorer',
    name: 'File Explorer',
    windowTitle: 'Explorador de archivos',
    icon: '📁',
    status: 'available',
  },
  {
    id: 'recycle-bin',
    name: 'Papelera de reciclaje',
    windowTitle: 'Papelera de reciclaje',
    icon: '🗑️',
    status: 'available',
  },
  { id: 'experience', name: 'Experiencia', windowTitle: 'Experiencia', icon: '🧰', status: 'available' },
  { id: 'projects', name: 'Proyectos', windowTitle: 'Proyectos', icon: '🗂️', status: 'available' },
  { id: 'skills', name: 'Habilidades', windowTitle: 'Habilidades', icon: '🧠', status: 'available' },
  { id: 'cv-viewer', name: 'CV', windowTitle: 'CV.pdf', icon: '📄', status: 'available' },
  { id: 'contact', name: 'Contacto', windowTitle: 'Contacto', icon: '✉️', status: 'available' },
  { id: 'settings', name: 'Configuración', windowTitle: 'Configuración', icon: '⚙️', status: 'available' },
  { id: 'terminal', name: 'Terminal', windowTitle: 'Terminal', icon: '⌨️', status: 'available' },
  { id: 'writer', name: 'Writer', windowTitle: 'Writer', icon: '📝', status: 'available' },
  { id: 'paint', name: 'Paint', windowTitle: 'Paint', icon: '🎨', status: 'available' },
  { id: 'task-manager', name: 'Administrador de tareas', windowTitle: 'Administrador de tareas', icon: '📊', status: 'available' },
  { id: 'calculator', name: 'Calculadora', windowTitle: 'Calculadora', icon: '🧮', status: 'coming-soon' },
  { id: 'browser', name: 'Nando Browser', windowTitle: 'Nando Browser', icon: '🌐', status: 'coming-soon' },
  { id: 'mail', name: 'Mail', windowTitle: 'Correo', icon: '✉️', status: 'coming-soon' },
  { id: 'media-player', name: 'Media Player', windowTitle: 'Reproductor multimedia', icon: '🎵', status: 'coming-soon' },
  { id: 'calendar', name: 'Calendar', windowTitle: 'Calendario', icon: '📅', status: 'coming-soon' },
  { id: 'code-editor', name: 'Code Editor', windowTitle: 'Editor de código', icon: '🧑‍💻', status: 'coming-soon' },
  { id: 'minesweeper', name: 'Buscaminas', windowTitle: 'Buscaminas', icon: '💣', status: 'coming-soon' },
]
