import { useEffect, useMemo, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { useShellStore } from '../../shell/application/shell.store'
import { COMPUTER_DIRECTORY, createExplorerTree } from '../domain/explorer'
import { completeTerminalInput, INITIAL_TERMINAL_DIRECTORY, MAX_TERMINAL_INPUT, runTerminalCommand, terminalPath } from '../domain/terminal'

const Console = styled.section`
  box-sizing: border-box;
  height: 100%;
  background: #070707;
  color: #ddd;
  font: 14px/1.5 'Lucida Console', Consolas, monospace;
  font-variant-ligatures: none;
  overflow: auto;
  scrollbar-color: #777 #222;
  padding: 10px;
`

const Output = styled.div`
  pre { margin: 0; font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; }
  article { margin-top: 10px; }
  strong { color: #a9dfae; overflow-wrap: anywhere; }
  [data-error='true'] { color: #ffb4ad; }
`

const Prompt = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 1ch;
  div:not(:empty) + & { margin-top: 10px; }
  label { color: #a9dfae; font-weight: bold; overflow-wrap: anywhere; }
  input {
    flex: 1 1 8rem;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    color: #fff;
    background: transparent;
    font: inherit;
  }
`

const Hint = styled.div`
  color: #b5b5b5;
  font-size: 11px;
  overflow-wrap: anywhere;
`

type Entry = { id: number; prompt: string; command: string; output?: string; error?: boolean }
const MAX_OUTPUT = 16_000
const MAX_HISTORY = 100

export function TerminalWindow({ isActive, onOpenFolder, onOpenDocument, onAbout, onProjects, onCv, onExit }: {
  isActive: boolean
  onOpenFolder: (id: string) => void
  onOpenDocument: (id: string) => void
  onAbout: () => void
  onProjects: () => void
  onCv: (language: 'es' | 'en') => void
  onExit: () => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const nodes = useShellStore((state) => state.fileNodes)
  const tree = useMemo(() => createExplorerTree(folders, nodes), [folders, nodes])
  const [directory, setDirectory] = useState(INITIAL_TERMINAL_DIRECTORY)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [hint, setHint] = useState('')
  const nextId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const consoleRef = useRef<HTMLElement>(null)
  const current = tree.has(directory) ? directory : COMPUTER_DIRECTORY
  const path = terminalPath(tree, current)

  useEffect(() => {
    if (!isActive) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
    const panel = consoleRef.current
    if (panel) panel.scrollTop = panel.scrollHeight
  }, [entries, hint, isActive])

  const execute = () => {
    const command = input.trim()
    if (!command) return
    const result = runTerminalCommand(command, tree, current)
    setInput('')
    setHistory((previous) => [...previous.slice(1 - MAX_HISTORY), command])
    setHistoryIndex(null)
    setDraft('')
    setHint('')
    if (result.directoryId) setDirectory(result.directoryId)
    let output = result.output
    let error = result.error
    const effect = result.effect
    if (effect?.kind === 'clear') { setEntries([]); setShowWelcome(false); return }
    if (effect?.kind === 'exit') { onExit(); return }
    if (effect?.kind === 'mkdir') {
      try {
        useShellStore.getState().createVirtualFolder(effect.parentId, effect.name)
        output = 'Carpeta creada: ' + effect.name
      } catch (reason) {
        output = reason instanceof Error ? reason.message : 'No se pudo crear la carpeta.'
        error = true
      }
    }
    if (effect?.kind === 'folder') onOpenFolder(effect.id)
    if (effect?.kind === 'document') onOpenDocument(effect.id)
    if (effect?.kind === 'about') onAbout()
    if (effect?.kind === 'projects') onProjects()
    if (effect?.kind === 'cv') onCv(effect.language)
    if (output && output.length > MAX_OUTPUT) output = output.slice(0, MAX_OUTPUT) + '\n… salida recortada.'
    const entry = { id: nextId.current++, command, prompt: path, output, error }
    setEntries((previous) => [...previous.slice(1 - MAX_HISTORY), entry])
  }

  return (
    <Console ref={consoleRef} aria-label="Consola virtual de NandOS">
      <Output role="log" aria-label="Salida de la terminal" tabIndex={showWelcome || entries.length ? 0 : undefined}>
        {showWelcome && <pre>{'NandOS · Terminal\nEscribe help para ver los comandos.\n↑/↓ Historial · Tab Completar\nEsta consola solo accede al sistema de archivos virtual.'}</pre>}
        {entries.map((entry) => <article key={entry.id}>
          <pre><strong>{entry.prompt}&gt;</strong> {entry.command}</pre>
          {entry.output !== undefined && <pre data-error={entry.error || undefined}>{entry.output}</pre>}
        </article>)}
      </Output>
      <Prompt onSubmit={(event) => { event.preventDefault(); execute() }}>
        <label htmlFor="terminal-command">{path}&gt;</label>
        <input id="terminal-command" ref={inputRef} aria-label="Comando" autoComplete="off"
          autoCapitalize="off" spellCheck={false} maxLength={MAX_TERMINAL_INPUT} value={input}
          onChange={(event) => { setInput(event.target.value); setHistoryIndex(null); setHint('') }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Tab' && !event.shiftKey && input.trim()) {
              const completion = completeTerminalInput(input, tree, current)
              if (completion.value === undefined && !completion.matches.length) return
              // A fully completed line lets Tab leave the field.
              if (completion.value === input || (hint && completion.value === undefined)) return
              event.preventDefault()
              if (completion.value !== undefined) { setInput(completion.value); setHint(''); setHistoryIndex(null) }
              else setHint(completion.matches.slice(0, 12).join(' · '))
            }
            if (event.key === 'ArrowUp' && history.length) {
              event.preventDefault()
              const index = Math.max(0, (historyIndex ?? history.length) - 1)
              if (historyIndex === null) setDraft(input)
              setHistoryIndex(index)
              setInput(history[index])
              setHint('')
            }
            if (event.key === 'ArrowDown' && historyIndex !== null) {
              event.preventDefault()
              const index = historyIndex + 1
              setHistoryIndex(index < history.length ? index : null)
              setInput(history[index] ?? draft)
              setHint('')
            }
          }} />
      </Prompt>
      {hint && <Hint role="status">{hint}</Hint>}
    </Console>
  )
}
