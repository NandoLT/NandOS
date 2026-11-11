import { useId, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TableKit } from '@tiptap/extension-table'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import Image from '@tiptap/extension-image'
import { WriterHeader } from './WriterHeader'
import styled from '@emotion/styled'
import { useShellStore } from '../../shell/application/shell.store'
import { createExplorerTree, DOCUMENTS_DIRECTORY } from '../domain/explorer'
import type { WriterDocument } from '../domain/explorer'
import type { WriterDraft } from '../domain/writer'

const extensions = [
  StarterKit.configure({ underline: false, trailingNode: false, link: { openOnClick: false } }),
  TableKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({ inline: true }).extend({
    renderHTML({ node }) {
      return ['span', { 'data-writer-image': '' }, '[Imagen: ' + (node.attrs.alt || 'sin descripción') + ']']
    },
  }),
  Markdown.configure({ markedOptions: { gfm: true } }),
]

const Writer = styled.section`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  color: var(--os-window-text);
  font-size: 13px;
`

const Body = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 0 clamp(8px, 3vw, 32px) 16px;
  background: var(--os-surface-alt);
`

const Ruler = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  width: min(100%, 700px);
  margin: 0 auto 12px;
  padding: 2px 16px 5px;
  display: flex;
  justify-content: space-around;
  background: repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 8px) bottom / 100% 4px no-repeat,
    var(--os-toolbar);
  border: var(--os-inset-border);
  color: var(--os-window-text);
  font: 10px/1.2 Arial, sans-serif;
  user-select: none;
`

const Paper = styled(EditorContent)`
  width: min(100%, 700px);
  min-height: max(240px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  border: 1px solid #777;
  box-shadow: 2px 2px 0 #0005;
  color: #181818;
  background: #fff;
  .tiptap {
    min-width: 0;
    padding: clamp(16px, 5vw, 52px);
    outline: none;
    font: 16px/1.45 'Times New Roman', serif;
    overflow-wrap: anywhere;
  }
  .tiptap > * { margin-block-start: 0; }
  .tiptap > * + * { margin-block-start: 1em; }
  .tiptap > p:only-child:has(> br.ProseMirror-trailingBreak)::before {
    content: 'Empieza a escribir…';
    color: #626262;
    float: left;
    height: 0;
    pointer-events: none;
  }
  h1, h2, h3 { line-height: 1.2; }
  a { color: #064fa0; text-decoration: underline; }
  blockquote { margin-inline: 0; padding-inline-start: 14px; border-inline-start: 3px solid #929faa; }
  pre { white-space: pre-wrap; padding: 8px; background: #f0f2f4; }
  li > p { margin-block: .25em; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { border: 1px solid #929faa; padding: 3px 6px; }
  td p, th p { margin: 0; }
  ul[data-type='taskList'] { padding-left: 0; list-style: none; }
  li[data-type='taskItem'] { display: flex; gap: 8px; }
  li[data-type='taskItem'] > div { flex: 1; }
  li[data-type='taskItem'] p { margin: 0; }
  [data-writer-image] { color: #555; font-style: italic; }
`

const Feedback = styled.p`
  width: min(100%, 700px);
  margin: 0 auto 8px;
  padding: 5px 8px;
  background: var(--os-window);
  &[role='alert'] { color: var(--os-danger); }
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
  > div { display: flex; flex-wrap: wrap; gap: 6px; }
  input, select {
    min-width: 0;
    padding: 5px;
    border: var(--os-inset-border);
    color: var(--os-input-text);
    background: var(--os-input);
  }
`

export function WriterWindow({ draft, onChange, onNew, onOpen, onSaved }: {
  draft: WriterDraft
  onChange: (markdown: string) => void
  onNew: () => void
  onOpen: () => void
  onSaved: (document: WriterDocument) => void
}) {
  const folders = useShellStore((state) => state.userDesktopItems)
  const nodes = useShellStore((state) => state.fileNodes)
  const saveDocument = useShellStore((state) => state.saveWriterDocument)
  const tree = useMemo(() => createExplorerTree(folders, nodes), [folders, nodes])
  const [saveForm, setSaveForm] = useState<{ name: string; parentId: string } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const uid = useId()
  const [initialMarkdown] = useState(draft.markdown)
  const editor = useEditor({
    extensions,
    content: initialMarkdown,
    contentType: 'markdown',
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Contenido del documento', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor }) => {
      setError('')
      setMessage('')
      onChange(editor.getMarkdown())
    },
  })
  const dirty = draft.markdown !== (draft.document?.markdown ?? '')

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
      editor?.commands.focus(undefined, { scrollIntoView: false })
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

  const closeSaveForm = () => {
    setSaveForm(null)
    setError('')
    editor?.commands.focus(undefined, { scrollIntoView: false })
  }

  return <Writer aria-label="Editor de documentos" onKeyDown={(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      save()
    }
    if (event.key === 'Escape' && saveForm) {
      event.stopPropagation()
      closeSaveForm()
    }
  }}>
    <WriterHeader editor={editor} name={draft.document?.name ?? 'Sin título'} dirty={dirty}
      onNew={onNew} onOpen={onOpen} onSave={save} onSaveAs={beginSaveAs} />
    <Body>
      <Ruler aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <span key={index}>{index + 1}</span>)}</Ruler>
      {error ? <Feedback role="alert">{error}</Feedback> : message && <Feedback role="status">{message}</Feedback>}
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
        <div>
          <button type="submit">Guardar documento</button>
          <button type="button" onClick={closeSaveForm}>Cancelar</button>
        </div>
      </SaveForm>}
      <Paper editor={editor} />
    </Body>
  </Writer>
}
