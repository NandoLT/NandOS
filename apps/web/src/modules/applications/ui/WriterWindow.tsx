import { lazy, Suspense, useDeferredValue, useId, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { useShellStore } from '../../shell/application/shell.store'
import { createExplorerTree, DOCUMENTS_DIRECTORY, MAX_MARKDOWN_LENGTH } from '../domain/explorer'
import type { WriterDocument } from '../domain/explorer'
import type { WriterDraft } from '../domain/writer'

const Preview = lazy(() => import('../../wiki/ui/MarkdownPreview').then((module) => ({ default: module.MarkdownPreview })))

const Writer = styled.section`
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  height: 100%;
  color: var(--os-window-text);
  font-size: 13px;
  > header, > footer {
    padding: 5px 8px;
    background: var(--os-toolbar);
  }
  > header { border-bottom: var(--os-raised-border); }
  > footer { border-top: var(--os-raised-border); overflow-wrap: anywhere; }
  [role='alert'] { color: var(--os-danger); }
`

const Toolbar = styled.div`
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding: 5px;
  background: var(--os-toolbar);
  border-bottom: var(--os-raised-border);
  button {
    padding: 4px 8px;
    border: var(--os-raised-border);
    background: var(--os-window);
    color: var(--os-window-text);
    cursor: pointer;
  }
  button[aria-pressed='true'] { border: var(--os-inset-border); }
  button:disabled { opacity: .55; cursor: default; }
  button:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -3px; }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding: clamp(7px, 2vw, 18px);
  background: var(--os-surface-alt);
`

const Paper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 130px;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 14px;
  border: var(--os-inset-border);
  color: var(--os-input-text);
  background: var(--os-input);
  textarea {
    flex: 1;
    min-height: 100px;
    width: 100%;
    resize: none;
    padding: 3px;
    border: 0;
    color: inherit;
    background: transparent;
    font: 14px/1.6 ui-monospace, monospace;
  }
`

const SaveForm = styled.form`
  display: grid;
  gap: 6px;
  width: min(100%, 680px);
  margin: 0 auto 8px;
  padding: 8px;
  border: var(--os-raised-border);
  background: var(--os-window);
  label { font-weight: bold; }
  input, select {
    min-width: 0;
    padding: 5px;
    border: var(--os-inset-border);
    color: var(--os-input-text);
    background: var(--os-input);
  }
`

export function WriterWindow({ draft, onChange, onNew, onSaved }: {
  draft: WriterDraft
  onChange: (markdown: string) => void
  onNew: () => boolean
  onSaved: (document: WriterDocument) => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const nodes = useShellStore((state) => state.fileNodes)
  const saveDocument = useShellStore((state) => state.saveWriterDocument)
  const tree = useMemo(() => createExplorerTree(folders, nodes), [folders, nodes])
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [saveForm, setSaveForm] = useState<{ name: string; parentId: string } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const uid = useId()
  const editorId = `${uid}-markdown`
  const markdown = useDeferredValue(draft.markdown)
  const dirty = draft.markdown !== (draft.document?.markdown ?? '')
  const path = draft.document && tree.writable(draft.document.parentId)
    ? tree.pathTo(draft.document.parentId).map(({ name }) => name).join(' › ')
    : null

  const beginSaveAs = () => {
    setError('')
    setMessage('')
    setSaveForm({ name: draft.document ? draft.document.name.replace(/\.doc$/iu, '') + ' - copia' : 'Sin título',
      parentId: tree.writable(draft.parentId) ? draft.parentId : DOCUMENTS_DIRECTORY })
  }

  const commit = (name: string, parentId: string, id?: string) => {
    try {
      const saved = saveDocument({ name, parentId, markdown: draft.markdown }, id)
      onSaved(saved)
      setSaveForm(null)
      setError('')
      setMessage('Documento guardado en este navegador.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el documento.')
    }
  }

  const save = () => {
    if (saveForm) {
      const form = document.getElementById(`${uid}-save`)
      if (form instanceof HTMLFormElement) form.requestSubmit()
    } else if (draft.document) {
      commit(draft.document.name, draft.document.parentId, draft.document.id)
    } else {
      beginSaveAs()
    }
  }

  const update = (value: string) => {
    if (value.length > MAX_MARKDOWN_LENGTH) { setError('El documento supera el tamaño permitido.'); return }
    setError('')
    setMessage('')
    onChange(value)
  }

  const format = (prefix: string, suffix = '') => {
    const editor = document.getElementById(editorId)
    if (!(editor instanceof HTMLTextAreaElement)) return
    const { selectionStart: start, selectionEnd: end } = editor
    const text = draft.markdown.slice(start, end) || 'Texto'
    const value = draft.markdown.slice(0, start) + prefix + text + suffix + draft.markdown.slice(end)
    update(value)
    if (value.length > MAX_MARKDOWN_LENGTH) return
    window.requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(start + prefix.length, start + prefix.length + text.length)
    })
  }

  return <Writer aria-label="Editor de documentos" onKeyDown={(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      save()
    }
    if (event.key === 'Escape' && saveForm) {
      event.stopPropagation()
      setSaveForm(null)
      setError('')
      document.getElementById(editorId)?.focus()
    }
  }}>
    <header><strong>{draft.document?.name ?? 'Sin título'}</strong>{dirty ? ' *' : ''} · Writer</header>
    <Toolbar role="group" aria-label="Herramientas de Writer">
      <button type="button" onClick={() => { if (onNew()) { setSaveForm(null); setView('edit'); setError(''); setMessage('') } }}>Nuevo</button>
      <button type="button" onClick={save}>Guardar</button>
      <button type="button" onClick={beginSaveAs}>Guardar como…</button>
      <button type="button" disabled={view !== 'edit'} aria-label="Negrita" onClick={() => format('**', '**')}><strong>B</strong></button>
      <button type="button" disabled={view !== 'edit'} aria-label="Cursiva" onClick={() => format('*', '*')}><em>I</em></button>
      <button type="button" disabled={view !== 'edit'} onClick={() => format('\n# ')}>Título</button>
      <button type="button" disabled={view !== 'edit'} onClick={() => format('\n- ')}>Viñeta</button>
      <button type="button" aria-pressed={view === 'edit'} onClick={() => setView('edit')}>Editar</button>
      <button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Vista previa</button>
    </Toolbar>
    <Body>
      {saveForm && <SaveForm id={`${uid}-save`} onSubmit={(event) => {
        event.preventDefault()
        commit(saveForm.name, saveForm.parentId)
      }}>
        <label htmlFor={`${uid}-name`}>Nombre del documento</label>
        <input id={`${uid}-name`} autoFocus required maxLength={80} value={saveForm.name}
          onChange={(event) => setSaveForm({ ...saveForm, name: event.target.value })} />
        <label htmlFor={`${uid}-folder`}>Guardar en</label>
        <select id={`${uid}-folder`} value={saveForm.parentId}
          onChange={(event) => setSaveForm({ ...saveForm, parentId: event.target.value })}>
          {tree.listTree().filter(({ directory }) => tree.writable(directory.id)).map(({ directory }) =>
            <option key={directory.id} value={directory.id}>{tree.pathTo(directory.id).slice(1).map(({ name }) => name).join(' › ')}</option>)}
        </select>
        <Toolbar>
          <button type="submit">Guardar documento</button>
          <button type="button" onClick={() => { setSaveForm(null); setError('') }}>Cancelar</button>
        </Toolbar>
      </SaveForm>}
      <Paper>
        {view === 'edit' ? <textarea id={editorId} aria-label="Contenido Markdown"
          placeholder="Empieza a escribir…" maxLength={MAX_MARKDOWN_LENGTH} value={draft.markdown}
          onChange={(event) => update(event.target.value)} /> :
          <Suspense fallback={<span>Cargando vista previa…</span>}><Preview markdown={markdown} /></Suspense>}
      </Paper>
    </Body>
    <footer>
      {error ? <span role="alert">{error}</span> :
        <span role="status">{message || (path ? `${path} › ${draft.document?.name}` : 'Documento Markdown · extensión virtual .doc')}</span>}
    </footer>
  </Writer>
}
