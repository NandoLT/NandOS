import { describe, expect, it } from 'vitest'
import { createExplorerTree } from './explorer'
import { completeTerminalInput, runTerminalCommand } from './terminal'

const tree = createExplorerTree([], [
  { id: 'notes', parentId: 'documents', kind: 'folder', name: 'Cuaderno de prueba' },
  { id: 'doc', parentId: 'notes', kind: 'document', name: 'Ideas.doc', markdown: '# Ideas' },
])
const run = (line: string, directory = 'documents') => runTerminalCommand(line, tree, directory)

describe('terminal commands', () => {
  it('lists all commands and provides individual help without executing them', () => {
    const help = run('help').output
    for (const command of ['help', 'dir', 'cd', 'tree', 'mkdir', 'type', 'open', 'about', 'projects', 'cv', 'cls', 'exit']) {
      expect(help).toMatch(new RegExp('^' + command + ' ', 'm'))
      expect(run(command + ' --help')).toEqual({ output: expect.stringContaining('Ejemplo:') })
    }
    expect(run('dir --help')).toEqual(run('help DIR'))
  })

  it('uses virtual absolute and relative paths with spaces and ignores case', () => {
    expect(run('cd "C:\\Mis documentos\\CUADERNO DE PRUEBA"')).toEqual({ directoryId: 'notes' })
    expect(run('cd ..', 'notes')).toEqual({ directoryId: 'documents' })
    expect(run('open /')).toEqual({ effect: { kind: 'folder', id: 'computer' } })
    expect(run('dir "./Cuaderno de prueba"').output).toContain('Ideas.doc')
    expect(run('tree "Cuaderno de prueba"').output).toContain('\n└── Ideas.doc')
    expect(run('mkdir "Cuaderno de prueba/Ideas nuevas"')).toEqual({
      effect: { kind: 'mkdir', parentId: 'notes', name: 'Ideas nuevas' },
    })
    expect(run('type ideas.DOC', 'notes')).toEqual({ output: '# Ideas' })
    expect(run('open "C:\\Mis documentos\\Cuaderno de prueba\\Ideas.doc"')).toEqual({
      effect: { kind: 'document', id: 'doc' },
    })
  })

  it('rejects malformed input, other drives and unknown commands', () => {
    for (const command of ['dir "ruta', 'cd D:\\', 'mkdir', 'exit now', 'constructor', 'dir /home']) {
      expect(run(command)).toMatchObject({ error: true })
    }
    expect(run('cv en')).toEqual({ effect: { kind: 'cv', language: 'en' } })
  })

  it('completes commands and quotes paths with spaces', () => {
    expect(completeTerminalInput('mkd', tree, 'documents').value).toBe('mkdir ')
    expect(completeTerminalInput('cd cua', tree, 'documents').value).toBe('cd "Cuaderno de prueba"')
  })
})
