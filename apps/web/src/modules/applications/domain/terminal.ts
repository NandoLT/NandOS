import { COMPUTER_DIRECTORY, DESKTOP_DIRECTORY } from './explorer'
import type { createExplorerTree } from './explorer'

type Tree = ReturnType<typeof createExplorerTree>

const commands = {
  help: ['help [comando]', 'Lista los comandos o muestra la ayuda de uno.', 'help dir'],
  dir: ['dir [ruta]', 'Lista los archivos y carpetas de una ubicación.', 'dir "C:\\Mis documentos"'],
  cd: ['cd [ruta]', 'Cambia de carpeta. Sin ruta, muestra la ubicación actual.', 'cd ..'],
  tree: ['tree [ruta]', 'Muestra las subcarpetas y los archivos en forma de árbol.', 'tree "C:\\Mis documentos"'],
  mkdir: ['mkdir <ruta>', 'Crea una carpeta en una ubicación escribible de NandOS.', 'mkdir "Mis notas"'],
  type: ['type <ruta>', 'Muestra el Markdown original de un documento .doc de Writer.', 'type "Mis notas.doc"'],
  open: ['open <ruta>', 'Abre una carpeta, un documento de Writer o un acceso del portfolio.', 'open "Mis notas.doc"'],
  about: ['about', 'Abre la presentación personal del portfolio.', 'about'],
  projects: ['projects', 'Abre la ventana de proyectos del portfolio.', 'projects'],
  cv: ['cv [es|en]', 'Abre el CV. Sin idioma, usa el español.', 'cv en'],
  cls: ['cls', 'Limpia la salida de la terminal sin borrar el historial.', 'cls'],
  exit: ['exit', 'Cierra la terminal.', 'exit'],
} as const

type Command = keyof typeof commands
const commandNames = Object.keys(commands) as Command[]
const isCommand = (name: string): name is Command => Object.hasOwn(commands, name)
const normalise = (value: string) => value.normalize('NFC').toLocaleLowerCase('es')

export const INITIAL_TERMINAL_DIRECTORY = DESKTOP_DIRECTORY
export const MAX_TERMINAL_INPUT = 2048

type Effect =
  | { kind: 'folder' | 'document' | 'image'; id: string }
  | { kind: 'about' | 'projects' | 'clear' | 'exit' }
  | { kind: 'cv'; language: 'es' | 'en' }
  | { kind: 'mkdir'; parentId: string; name: string }

type Result = { output?: string; directoryId?: string; effect?: Effect; error?: boolean }

function tokenize(line: string) {
  const tokens: string[] = []
  let value = ''
  let quoted = false
  let started = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
      started = true
    } else if (!quoted && /\s/u.test(char)) {
      if (started) tokens.push(value)
      value = ''
      started = false
    } else {
      value += char
      started = true
    }
  }
  if (quoted) throw new Error('Falta cerrar las comillas de la ruta.')
  if (started) tokens.push(value)
  return tokens
}

export function terminalPath(tree: Tree, directoryId: string) {
  return 'C:\\' + tree.pathTo(directoryId).slice(1).map(({ name }) => name).join('\\')
}

function splitPath(path: string, current: string) {
  if (/^[a-z]:/iu.test(path) && !/^c:/iu.test(path)) throw new Error('Solo existe la unidad virtual C:.')
  const absolute = /^(?:c:|[\\/])/iu.test(path)
  const parts = path.replace(/^c:/iu, '').split(/[\\/]+/u).filter(Boolean)
  return { parts, start: absolute ? COMPUTER_DIRECTORY : current }
}

function directoryFromParts(tree: Tree, start: string, parts: string[]) {
  let id = start
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') { id = tree.getDirectory(id).parentId ?? COMPUTER_DIRECTORY; continue }
    const folder = tree.contentsOf(id).find((item) => item.kind === 'folder' && normalise(item.name) === normalise(part))
    if (folder?.kind !== 'folder') throw new Error('No se encuentra la carpeta: ' + part)
    id = folder.directoryId
  }
  return id
}

function resolveParent(tree: Tree, current: string, path: string) {
  const { start, parts } = splitPath(path, current)
  const name = parts.pop()
  if (!name) throw new Error('Indica un nombre de archivo o carpeta.')
  return { parentId: directoryFromParts(tree, start, parts), name }
}

function helpFor(name: string) {
  if (!isCommand(name)) throw new Error('Comando desconocido: ' + name + '. Usa help.')
  const [usage, description, example] = commands[name]
  return usage + '\n' + description + '\nEjemplo: ' + example
}

function printTree(tree: Tree, id: string) {
  const lines = [terminalPath(tree, id)]
  const visit = (directory: string, prefix: string, ancestors: Set<string>) => {
    if (lines.length >= 500) return
    const contents = tree.contentsOf(directory)
    for (const [index, item] of contents.entries()) {
      if (lines.length >= 500) break
      const last = index === contents.length - 1
      lines.push(prefix + (last ? '└── ' : '├── ') + item.name)
      if (item.kind === 'folder' && !ancestors.has(item.directoryId)) {
        visit(item.directoryId, prefix + (last ? '    ' : '│   '), new Set([...ancestors, item.directoryId]))
      }
    }
  }
  visit(id, '', new Set([id]))
  if (lines.length === 500) lines.push('… salida limitada a 500 líneas.')
  return lines.join('\n')
}

export function runTerminalCommand(line: string, tree: Tree, directoryId: string): Result {
  const current = tree.has(directoryId) ? directoryId : COMPUTER_DIRECTORY
  try {
    const [rawCommand, ...args] = tokenize(line)
    if (!rawCommand) return {}
    const command = normalise(rawCommand)
    if (!isCommand(command)) throw new Error('Comando desconocido: ' + command + '. Usa help.')
    if (args.length === 1 && args[0] === '--help') return { output: helpFor(command) }
    const arg = args[0]
    const hasArgument = ['help', 'dir', 'cd', 'tree', 'mkdir', 'type', 'open', 'cv'].includes(command)
    if (args.length > (hasArgument ? 1 : 0) || (['mkdir', 'type', 'open'].includes(command) && !arg)) {
      throw new Error('Uso: ' + commands[command][0] + '. Consulta ' + command + ' --help.')
    }
    if (command === 'help') return { output: arg ? helpFor(normalise(arg)) :
      commandNames.map((name) => name.padEnd(9) + commands[name][1]).join('\n') +
      '\n\nUsa <comando> --help para ver su sintaxis y un ejemplo.\nPon entre comillas las rutas con espacios.' }
    if (command === 'dir' || command === 'cd' || command === 'tree') {
      const { start, parts } = splitPath(arg ?? '', current)
      const id = directoryFromParts(tree, start, parts)
      if (command === 'cd') return arg ? { directoryId: id } : { output: terminalPath(tree, id) }
      if (command === 'tree') return { output: printTree(tree, id) }
      const entries = tree.contentsOf(id)
      return { output: terminalPath(tree, id) + '\n\n' + (entries.length
        ? entries.map((entry) => (entry.kind === 'folder' ? '<DIR>  ' : '       ') + entry.name).join('\n') + '\n\n' + entries.length + ' objetos.'
        : '0 objetos.') }
    }
    if (command === 'mkdir') {
      const { parentId, name } = resolveParent(tree, current, arg)
      return { effect: { kind: 'mkdir', parentId, name } }
    }
    if (command === 'open' || command === 'type') {
      if (command === 'open' && /(?:^c:|[\\/]$|^\.\.?$)/iu.test(arg)) {
        const { start, parts } = splitPath(arg, current)
        try { return { effect: { kind: 'folder', id: directoryFromParts(tree, start, parts) } } }
        catch { /* The path may point to a file; try resolving it below. */ }
      }
      const { parentId, name } = resolveParent(tree, current, arg)
      const item = tree.contentsOf(parentId).find((entry) => normalise(entry.name) === normalise(name))
      if (!item) throw new Error('No se encuentra: ' + name)
      if (command === 'type') {
        const doc = item.kind === 'document' ? tree.getDocument(item.documentId) : undefined
        if (!doc) throw new Error('type solo admite documentos .doc de Writer.')
        return { output: doc.markdown || '(Documento vacío)' }
      }
      if (item.kind === 'folder') return { effect: { kind: 'folder', id: item.directoryId } }
      if (item.kind === 'document') return { effect: { kind: 'document', id: item.documentId } }
      if (item.kind === 'image') return { effect: { kind: 'image', id: item.imageId } }
      if (item.action === 'about') return { effect: { kind: 'about' } }
      if (item.action === 'cv-es' || item.action === 'cv-en') {
        return { effect: { kind: 'cv', language: item.action === 'cv-en' ? 'en' : 'es' } }
      }
      throw new Error('Este elemento no tiene una aplicación asociada.')
    }
    if (command === 'cv') {
      const language = normalise(arg ?? 'es')
      if (language !== 'es' && language !== 'en') throw new Error('Uso: cv [es|en].')
      return { effect: { kind: 'cv', language } }
    }
    return { effect: { kind: command === 'cls' ? 'clear' : command } }
  } catch (error) {
    return { output: error instanceof Error ? error.message : 'No se pudo ejecutar el comando.', error: true }
  }
}

export function completeTerminalInput(line: string, tree: Tree, directoryId: string) {
  const input = line.trimStart()
  const match = /^(\S+)\s+(.*)$/u.exec(input)
  if (!match) {
    const matches = commandNames.filter((name) => name.startsWith(normalise(input)))
    return { matches, value: matches.length === 1 ? matches[0] + ' ' : undefined }
  }
  const command = normalise(match[1])
  if (!['dir', 'cd', 'tree', 'type', 'open', 'mkdir'].includes(command)) return { matches: [] }
  const raw = match[2].replace(/^"|"$/gu, '')
  const boundary = Math.max(raw.lastIndexOf('\\'), raw.lastIndexOf('/'), /^c:/iu.test(raw) ? 1 : -1)
  const prefix = raw.slice(0, boundary + 1)
  const partial = normalise(raw.slice(boundary + 1))
  try {
    const { start, parts } = splitPath(prefix, tree.has(directoryId) ? directoryId : COMPUTER_DIRECTORY)
    const folder = directoryFromParts(tree, start, parts)
    const matches = tree.contentsOf(folder).filter((item) =>
      normalise(item.name).startsWith(partial) && (command === 'open' ||
        (command === 'type' ? item.kind === 'document' : item.kind === 'folder')))
    const path = matches.length === 1 ? prefix + matches[0].name : undefined
    return { matches: matches.map(({ name }) => name), value: path === undefined ? undefined :
      command + ' ' + (/\s/u.test(path) ? '"' + path + '"' : path) }
  } catch { return { matches: [] } }
}
