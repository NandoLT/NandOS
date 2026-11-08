export const PROJECTS_PATH = '/proyectos'
export const NANDOS_CASE_PATH = '/proyectos/nandos'
export const CONTACT_PATH = '/contacto'

export function portfolioEntry(pathname: string) {
  const path = pathname.replace(/\/$/u, '')
  if (path === CONTACT_PATH) return { section: 'contact', showNandosCase: false } as const
  if (path === PROJECTS_PATH || path === NANDOS_CASE_PATH) {
    return { section: 'projects', showNandosCase: path === NANDOS_CASE_PATH } as const
  }
  return null
}
