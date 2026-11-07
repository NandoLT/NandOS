import { ABOUT_ME_ICON } from '../../../shared/lib/app-icons'
import type { UserDesktopItem } from '../../shell/domain/types'

export const COMPUTER_DIRECTORY = 'computer'
export const DESKTOP_DIRECTORY = 'desktop'
export const DOCUMENTS_DIRECTORY = 'documents'

export type ExplorerItem =
  | { name: string; icon: string; kind: 'folder'; directoryId: string }
  | { name: string; icon: string; kind: 'document'; documentId: string }
  | { name: string; icon: string; kind: 'file' | 'application'; action: 'about' | 'cv-es' | 'cv-en' | 'roadmap' }

type VirtualEntry = { id: string; parentId: string; name: string }
export type WriterDocument = VirtualEntry & { kind: 'document'; markdown: string }
export type VirtualNode = (VirtualEntry & { kind: 'folder' }) | WriterDocument
export const MAX_MARKDOWN_LENGTH = 200_000

export function virtualName(value: string) {
  const name = value.trim().normalize('NFC')
  if (!name || name === '.' || name === '..' || name.length > 80 ||
    /[<>:"/\\|?*]/u.test(name) || [...name].some((character) => character.charCodeAt(0) < 32)) {
    throw new Error('Escribe un nombre válido de hasta 80 caracteres.')
  }
  return name
}

export function excludeSubtrees(nodes: VirtualNode[], roots: string[]) {
  const removed = new Set(roots)
  let count = 0
  while (count !== removed.size) {
    count = removed.size
    for (const node of nodes) if (removed.has(node.parentId)) removed.add(node.id)
  }
  return nodes.filter((node) => !removed.has(node.id))
}

type Directory = { id: string; parentId: string | null; name: string; icon: string; items: ExplorerItem[] }

const about: ExplorerItem = { name: 'About Me', kind: 'application', icon: ABOUT_ME_ICON, action: 'about' }
const systemDirectories: Directory[] = [
  { id: COMPUTER_DIRECTORY, parentId: null, name: 'Este equipo', icon: '🖥️', items: [] },
  { id: DESKTOP_DIRECTORY, parentId: COMPUTER_DIRECTORY, name: 'Escritorio', icon: '🖥️', items: [
    about, { name: 'Mis documentos', kind: 'folder', icon: '📂', directoryId: DOCUMENTS_DIRECTORY },
  ] },
  { id: DOCUMENTS_DIRECTORY, parentId: COMPUTER_DIRECTORY, name: 'Mis documentos', icon: '📂', items: [
    { name: 'Fernando_Lopez_Trejo_CV_ES.pdf', kind: 'file', icon: '📄', action: 'cv-es' },
    { name: 'Fernando_Lopez_Trejo_CV_EN.pdf', kind: 'file', icon: '📄', action: 'cv-en' },
    { name: 'README.txt', kind: 'file', icon: '📝', action: 'roadmap' },
    { name: 'Proyectos', kind: 'folder', icon: '🗂️', directoryId: 'projects' },
  ] },
  { id: 'projects', parentId: COMPUTER_DIRECTORY, name: 'Proyectos', icon: '🗂️', items: [
    { name: 'Portfolio web', kind: 'file', icon: '🌐', action: 'roadmap' },
  ] },
  { id: 'nandos', parentId: 'projects', name: 'NandOS', icon: '💾', items: [
    { name: 'ROADMAP.md', kind: 'file', icon: '📋', action: 'roadmap' }, about,
  ] },
]

export function createExplorerTree(folders: readonly UserDesktopItem[], nodes: readonly VirtualNode[] = []) {
  const directories: Directory[] = [...systemDirectories, ...folders.map((folder) => ({
    id: folder.id, parentId: DESKTOP_DIRECTORY, name: folder.name, icon: folder.icon, items: [],
  }))]
  const pendingByParent = new Map<string, VirtualNode[]>()
  for (const node of nodes) {
    const siblings = pendingByParent.get(node.parentId) ?? []
    siblings.push(node)
    pendingByParent.set(node.parentId, siblings)
  }
  const documentsByParent = new Map<string, WriterDocument[]>()
  const known = new Set(directories.map(({ id }) => id))
  // Traverse only attached folders; descendants of recycled folders stay hidden.
  for (const parent of directories) {
    for (const node of pendingByParent.get(parent.id) ?? []) {
      if (known.has(node.id)) continue
      known.add(node.id)
      if (node.kind === 'folder') {
        directories.push({ ...node, icon: '📁', items: [] })
      } else {
        const documents = documentsByParent.get(parent.id) ?? []
        documents.push(node)
        documentsByParent.set(parent.id, documents)
      }
    }
  }
  const byId = new Map(directories.map((directory) => [directory.id, directory]))
  const byParent = new Map<string, Directory[]>()
  for (const directory of directories) {
    if (directory.parentId === null) continue
    const siblings = byParent.get(directory.parentId) ?? []
    siblings.push(directory)
    byParent.set(directory.parentId, siblings)
  }

  const root = systemDirectories[0]
  const getDirectory = (id: string) => byId.get(id) ?? root
  const pathTo = (id: string) => {
    const path = [getDirectory(id)]
    let parentId = path[0].parentId
    while (parentId !== null) {
      const parent = getDirectory(parentId)
      path.unshift(parent)
      parentId = parent.parentId
    }
    return path
  }
  const listTree = (id = COMPUTER_DIRECTORY, depth = 0): Array<{ directory: Directory; depth: number }> => [
    { directory: getDirectory(id), depth },
    ...(byParent.get(id) ?? []).flatMap((child) => listTree(child.id, depth + 1)),
  ]
  const contentsOf = (id: string): ExplorerItem[] => [
    ...(byParent.get(id) ?? []).map((child): ExplorerItem => ({
      name: child.name, icon: child.icon, kind: 'folder', directoryId: child.id,
    })),
    ...(documentsByParent.get(id) ?? []).map((doc): ExplorerItem => ({
      name: doc.name, icon: '📝', kind: 'document', documentId: doc.id,
    })),
    ...getDirectory(id).items,
  ]
  return { getDirectory, pathTo, listTree, contentsOf, has: (id: string) => byId.has(id),
    writable: (id: string) => id !== COMPUTER_DIRECTORY && byId.has(id),
    getDocument: (id: string) => {
      const node = nodes.find((candidate) => candidate.id === id)
      return node?.kind === 'document' && documentsByParent.get(node.parentId)?.includes(node) ? node : undefined
    },
  }
}
