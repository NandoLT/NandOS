import type { AppDefinition } from '@nandoos/contracts'

export type RegisteredApp = AppDefinition & {
  icon: string
  windowTitle: string
}

export const appRegistry: RegisteredApp[] = [
  {
    id: 'about',
    name: 'About Me',
    windowTitle: 'Fernando.exe',
    icon: '👤',
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
  { id: 'terminal', name: 'Terminal', windowTitle: 'Terminal', icon: '⌨️', status: 'coming-soon' },
  { id: 'writer', name: 'Writer', windowTitle: 'Writer', icon: '📝', status: 'coming-soon' },
  { id: 'paint', name: 'Paint', windowTitle: 'Paint', icon: '🎨', status: 'coming-soon' },
  { id: 'task-manager', name: 'Task Manager', windowTitle: 'Administrador de tareas', icon: '📊', status: 'coming-soon' },
  { id: 'calculator', name: 'Calculadora', windowTitle: 'Calculadora', icon: '🧮', status: 'coming-soon' },
  { id: 'browser', name: 'Nando Browser', windowTitle: 'Nando Browser', icon: '🌐', status: 'coming-soon' },
  { id: 'mail', name: 'Mail', windowTitle: 'Correo', icon: '✉️', status: 'coming-soon' },
  { id: 'media-player', name: 'Media Player', windowTitle: 'Reproductor multimedia', icon: '🎵', status: 'coming-soon' },
  { id: 'calendar', name: 'Calendar', windowTitle: 'Calendario', icon: '📅', status: 'coming-soon' },
  { id: 'code-editor', name: 'Code Editor', windowTitle: 'Editor de código', icon: '🧑‍💻', status: 'coming-soon' },
  { id: 'minesweeper', name: 'Buscaminas', windowTitle: 'Buscaminas', icon: '💣', status: 'coming-soon' },
]
