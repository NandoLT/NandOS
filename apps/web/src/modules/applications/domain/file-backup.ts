import { COMPUTER_DIRECTORY, createExplorerTree, DESKTOP_DIRECTORY, DOCUMENTS_DIRECTORY, MAX_MARKDOWN_LENGTH, virtualName } from './explorer'
import type { VirtualNode } from './explorer'
import type { UserDesktopItem } from '../../shell/domain/types'

const systemTree = createExplorerTree([])
const sources = systemTree.listTree().map(({ directory }) => directory.id).filter((id) => id !== COMPUTER_DIRECTORY)
const sourceIds = new Set(sources)
const MAX_ENTRIES = 2000
const MAX_DEPTH = 64
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024

type BackupEntry = { parent: number | string; name: string } &
  ({ kind: 'folder' } | { kind: 'document'; markdown: string })
export type FileBackup = { format: 'nandos-files'; version: 1; entries: BackupEntry[] }

export function exportFileBackup(folders: readonly UserDesktopItem[], nodes: readonly VirtualNode[]) {
  const tree = createExplorerTree(folders, nodes)
  const rootFolders: VirtualNode[] = folders.map(({ id, name }) => ({ id, name, kind: 'folder', parentId: DESKTOP_DIRECTORY }))
  const siblings = new Map<string, VirtualNode[]>()
  for (const node of [...rootFolders, ...nodes]) {
    const children = siblings.get(node.parentId) ?? []
    children.push(node)
    siblings.set(node.parentId, children)
  }

  const entries: BackupEntry[] = []
  const parents: { id: string; reference: string | number }[] = sources.map((id) => ({ id, reference: id }))
  const seen = new Set(sources)
  for (const parent of parents) {
    for (const node of siblings.get(parent.id) ?? []) {
      if (seen.has(node.id)) continue
      seen.add(node.id)
      const base = { parent: parent.reference, name: node.name }
      if (node.kind === 'folder' && tree.has(node.id)) {
        parents.push({ id: node.id, reference: entries.length })
        entries.push({ ...base, kind: 'folder' })
      } else if (node.kind === 'document') {
        entries.push({ ...base, kind: 'document', markdown: node.markdown })
      }
      if (entries.length > MAX_ENTRIES) throw new Error('La copia admite hasta 2.000 archivos y carpetas.')
    }
  }
  const backup: FileBackup = { format: 'nandos-files', version: 1, entries }
  const json = JSON.stringify(backup)
  // Export only a copy that this version can import again.
  parseFileBackup(json)
  return json
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseFileBackup(text: string): FileBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('La copia supera el límite de 2 MB.')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('El archivo no contiene una copia JSON válida.') }
  if (!isRecord(raw) || raw.format !== 'nandos-files' || raw.version !== 1 || !Array.isArray(raw.entries)) {
    throw new Error('El archivo no es una copia de archivos compatible con NandOS.')
  }
  if (raw.entries.length > MAX_ENTRIES) throw new Error('La copia admite hasta 2.000 archivos y carpetas.')

  const entries: BackupEntry[] = []
  const depths: number[] = []
  for (const value of raw.entries as unknown[]) {
    if (!isRecord(value) || typeof value.name !== 'string') throw new Error('La copia contiene una entrada inválida.')
    const { parent, kind, markdown } = value
    const name = virtualName(value.name)
    let depth = 1
    if (typeof parent === 'number' && Number.isInteger(parent) && entries[parent]?.kind === 'folder') {
      depth += depths[parent]
    } else if (typeof parent !== 'string' || !sourceIds.has(parent)) {
      throw new Error('La copia contiene una ruta de carpeta inválida.')
    }
    if (depth > MAX_DEPTH) throw new Error('La copia contiene demasiados niveles de carpetas.')
    if (kind === 'folder') entries.push({ parent, name, kind })
    else if (kind === 'document' && typeof markdown === 'string' && markdown.length <= MAX_MARKDOWN_LENGTH && /\.doc$/iu.test(name)) {
      entries.push({ parent, name, kind, markdown })
    } else {
      throw new Error('La copia contiene un documento .doc inválido o demasiado grande.')
    }
    depths.push(depth)
  }
  return { format: 'nandos-files', version: 1, entries }
}

function reserveName(name: string, used: Set<string>, extension = '') {
  let candidate = name
  let index = 2
  while (used.has(candidate.toLocaleLowerCase('es'))) {
    const suffix = ' (' + index++ + ')'
    const base = name.slice(0, name.length - extension.length)
    candidate = base.slice(0, 80 - suffix.length - extension.length) + suffix + extension
  }
  used.add(candidate.toLocaleLowerCase('es'))
  return candidate
}

export function prepareFileImport(backup: FileBackup, destinationNames: readonly string[]) {
  const name = reserveName('Copia importada', new Set(destinationNames.map((item) => item.normalize('NFC').toLocaleLowerCase('es'))))
  const root = { id: crypto.randomUUID(), parentId: DOCUMENTS_DIRECTORY, name, kind: 'folder' } as const
  const nodes: VirtualNode[] = [root]
  const importsByIndex: VirtualNode[] = []
  const sections = new Map<string, string>()
  const names = new Map<string, Set<string>>()
  for (const entry of backup.entries) {
    let parentId: string
    if (typeof entry.parent === 'number') {
      parentId = importsByIndex[entry.parent].id
    } else {
      const existing = sections.get(entry.parent)
      parentId = existing ?? crypto.randomUUID()
      if (!existing) {
        const label = systemTree.pathTo(entry.parent).slice(1).map((directory) => directory.name).join(' › ')
        sections.set(entry.parent, parentId)
        nodes.push({ id: parentId, parentId: root.id, name: label, kind: 'folder' })
      }
    }
    const siblings = names.get(parentId) ?? new Set<string>()
    names.set(parentId, siblings)
    const extension = entry.kind === 'document' ? entry.name.slice(-4) : ''
    const imported = { ...entry, name: reserveName(entry.name, siblings, extension), id: crypto.randomUUID(), parentId }
    const node = imported.kind === 'folder'
      ? { kind: imported.kind, id: imported.id, name: imported.name, parentId }
      : { kind: imported.kind, id: imported.id, name: imported.name, parentId, markdown: imported.markdown }
    nodes.push(node)
    importsByIndex.push(node)
  }
  return { name, nodes }
}
