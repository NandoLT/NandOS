import { MAX_PAINT_SIDE } from './paint-raster'
import { COMPUTER_DIRECTORY, createExplorerTree, DESKTOP_DIRECTORY, DOCUMENTS_DIRECTORY, MAX_MARKDOWN_LENGTH, virtualName } from './explorer'
import type { VirtualNode } from './explorer'
import type { UserDesktopItem } from '../../shell/domain/types'

const systemTree = createExplorerTree([])
const sources = systemTree.listTree().map(({ directory }) => directory.id).filter((id) => id !== COMPUTER_DIRECTORY)
const sourceIds = new Set(sources)
const MAX_ENTRIES = 2000
const MAX_DEPTH = 64
export const MAX_BACKUP_BYTES = 12 * 1024 * 1024

type BackupEntry = { parent: number | string; name: string } &
  ({ kind: 'folder' } | { kind: 'document'; markdown: string } | { kind: 'image'; png: string; width: number; height: number })
export type FileBackup = { format: 'nandos-files'; version: 1 | 2; entries: BackupEntry[] }

export async function exportFileBackup(folders: readonly UserDesktopItem[], nodes: readonly VirtualNode[],
  readImage: (id: string) => Promise<Blob | undefined>) {
  const tree = createExplorerTree(folders, nodes)
  const rootFolders: VirtualNode[] = folders.map(({ id, name }) => ({ id, name, kind: 'folder', parentId: DESKTOP_DIRECTORY }))
  const siblings = new Map<string, VirtualNode[]>()
  for (const node of [...rootFolders, ...nodes]) {
    const children = siblings.get(node.parentId) ?? []
    children.push(node)
    siblings.set(node.parentId, children)
  }

  const entries: BackupEntry[] = []
  let imageBytes = 0
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
      } else if (node.kind === 'image') {
        const blob = await readImage(node.blobId)
        if (!blob) throw new Error('No se encuentra el PNG de ' + node.name + '.')
        imageBytes += Math.ceil(blob.size / 3) * 4
        if (imageBytes > MAX_BACKUP_BYTES) throw new Error('La copia supera el límite de 12 MB.')
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
        entries.push({ ...base, kind: 'image', png: btoa(binary), width: node.width, height: node.height })
      }
      if (entries.length > MAX_ENTRIES) throw new Error('La copia admite hasta 2.000 archivos y carpetas.')
    }
  }
  const backup: FileBackup = { format: 'nandos-files', version: imageBytes ? 2 : 1, entries }
  const json = JSON.stringify(backup)
  // Export only a copy that this version can import again.
  parseFileBackup(json)
  return json
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseFileBackup(text: string): FileBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('La copia supera el límite de 12 MB.')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('El archivo no contiene una copia JSON válida.') }
  if (!isRecord(raw) || raw.format !== 'nandos-files' || (raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.entries)) {
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
    } else if (raw.version === 2 && kind === 'image' && /\.png$/iu.test(name) && typeof value.png === 'string' &&
      /^[A-Za-z0-9+/]+={0,2}$/u.test(value.png) && value.png.length % 4 === 0 &&
      validDimension(value.width) && validDimension(value.height)) {
      entries.push({ parent, name, kind, png: value.png, width: value.width, height: value.height })
    } else {
      throw new Error('La copia contiene un archivo inválido o demasiado grande.')
    }
    depths.push(depth)
  }
  return { format: 'nandos-files', version: raw.version, entries }
}

const validDimension = (size: unknown): size is number =>
  typeof size === 'number' && Number.isInteger(size) && size > 0 && size <= MAX_PAINT_SIDE

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

export const fileImportName = (destinationNames: readonly string[]) =>
  reserveName('Copia importada', new Set(destinationNames.map((item) => item.normalize('NFC').toLocaleLowerCase('es'))))

export function prepareFileImport(backup: FileBackup) {
  const images: { id: string; png: string; width: number; height: number }[] = []
  const root = { id: crypto.randomUUID(), parentId: DOCUMENTS_DIRECTORY, name: 'Copia importada', kind: 'folder' } as const
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
    const extension = entry.kind === 'folder' ? '' : entry.name.slice(-4)
    const base = { id: crypto.randomUUID(), parentId, name: reserveName(entry.name, siblings, extension) }
    let node: VirtualNode
    if (entry.kind === 'folder') node = { ...base, kind: 'folder' }
    else if (entry.kind === 'document') node = { ...base, kind: 'document', markdown: entry.markdown }
    else {
      const blobId = crypto.randomUUID()
      node = { ...base, kind: 'image', blobId, width: entry.width, height: entry.height }
      images.push({ id: blobId, png: entry.png, width: entry.width, height: entry.height })
    }
    nodes.push(node)
    importsByIndex.push(node)
  }
  return { root, nodes, images }
}
