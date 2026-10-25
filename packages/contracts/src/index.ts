export type AppStatus = 'available' | 'coming-soon'

export type AppId =
  | 'file-explorer'
  | 'recycle-bin'
  | 'about'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'cv-viewer'
  | 'settings'
  | 'contact'
  | 'terminal'
  | 'writer'
  | 'paint'
  | 'task-manager'
  | 'calculator'
  | 'browser'
  | 'mail'
  | 'media-player'
  | 'calendar'
  | 'code-editor'
  | 'minesweeper'

export type AppDefinition = {
  id: AppId
  name: string
  status: AppStatus
  description?: string
}
