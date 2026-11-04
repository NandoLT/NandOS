import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WikiArticle, WikiContent } from '@nandoos/contracts'
import { wikiApi, wikiSynchronizationKey } from '../application/wiki-api'
import type { WikiEditorRepository } from '../application/wiki-api'
import { MarkdownPreview } from './MarkdownPreview'
import { WikiCategoryField } from './WikiCategoryField'
import { WikiSynchronization } from './WikiSynchronization'
import * as S from './wiki.styles'

const empty = (): WikiContent => ({ title: '', category: 'General', markdown: '' })
const same = (a: WikiContent, b: WikiContent) => JSON.stringify(a) === JSON.stringify(b)
function status(article: WikiArticle) {
  return !article.published ? 'Borrador' : same(article.draft, article.published) ? 'Publicado' : 'Publicado · cambios en borrador'
}
type Action = 'save' | 'publish' | 'withdraw' | 'seed'

export function WikiPanel({ repository = wikiApi, onDirtyChange }: {
  repository?: WikiEditorRepository
  onDirtyChange?: (dirty: boolean) => void
}) {
  const client = useQueryClient()
  const queryKey = ['admin', 'wiki', repository.scope]
  const query = useQuery({ queryKey, queryFn: () => repository.list(), retry: false, refetchOnWindowFocus: false })
  const [selected, setSelected] = useState<WikiArticle | null>(null)
  const [draft, setDraft] = useState<WikiContent>(empty)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState('all')
  const [mode, setMode] = useState('split')
  const [notice, setNotice] = useState('')
  const [hasError, setHasError] = useState(false)
  const source = useRef<HTMLTextAreaElement>(null)
  const dirty = !same(draft, selected?.draft ?? empty())
  const articles = query.data ?? []
  const categories = [...new Set(articles.map((a) => a.draft.category))].sort((a, b) => a.localeCompare(b, 'es'))
  const visible = articles.filter((a) => (!category || a.draft.category === category) &&
    (filter === 'all' || (filter === 'published' ? Boolean(a.published) : !a.published)) &&
    `${a.draft.title} ${a.draft.category} ${a.draft.markdown}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
  const valid = draft.title.trim().length > 0 && draft.title.trim().length <= 160 && draft.category.trim().length > 0 &&
    draft.category.trim().length <= 80 && draft.markdown.trim().length > 0 && draft.markdown.length <= 120000
  const previewMarkdown = useDeferredValue(draft.markdown || '*La vista previa aparecerá aquí mientras escribes.*')

  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function select(article: WikiArticle | null, force = false) {
    if (!force && dirty && !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?')) return
    setSelected(article)
    setDraft(article ? { ...article.draft } : empty())
    setNotice('')
    setHasError(false)
  }
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action === 'seed') return { created: await repository.seed() }
      if (action === 'save') return { article: selected ? await repository.save(selected.id, draft, selected.revision) : await repository.create(draft) }
      if (!selected) throw new Error('Guarda el artículo primero.')
      if (action === 'publish') return { article: await repository.publish(selected.id, selected.revision) }
      return { article: await repository.withdraw(selected.id, selected.revision) }
    },
    onSuccess: (result, action) => {
      if ('article' in result && result.article) {
        select(result.article, true)
        client.setQueryData<WikiArticle[]>(queryKey, (previous = []) => {
          const article = result.article!
          return previous.some((a) => a.id === article.id) ? previous.map((a) => a.id === article.id ? article : a) : [...previous, article]
        })
      } else void client.invalidateQueries({ queryKey })
      if (action === 'publish' || action === 'withdraw')
        void client.invalidateQueries({ queryKey: wikiSynchronizationKey(repository.scope) })
      setHasError(false)
      setNotice(action === 'seed' ? `${result.created} artículos añadidos como borrador. No se han sobrescrito los existentes.`
        : action === 'save' ? 'Borrador guardado. La versión publicada no ha cambiado.'
        : action === 'publish' ? 'Artículo publicado. Sincroniza la wiki para actualizar el índice de nandBot.'
        : 'Publicación retirada. Se conserva el borrador; sincroniza la wiki para actualizar el índice.')
    },
    onError: (error: Error) => { setHasError(true); setNotice(error.message) },
  })
  const busy = mutation.isPending || query.isFetching
  async function reload() {
    if (dirty && !window.confirm('Recargar descarta tus cambios sin guardar. ¿Continuar?')) return
    const result = await query.refetch()
    void client.invalidateQueries({ queryKey: wikiSynchronizationKey(repository.scope) })
    if (result.data) select(result.data.find((a) => a.id === selected?.id) ?? null, true)
  }
  function insert(before: string, after = '') {
    const element = source.current
    if (!element) { setMode('split'); return }
    const start = element.selectionStart
    const end = element.selectionEnd
    const text = draft.markdown.slice(start, end)
    setDraft({ ...draft, markdown: draft.markdown.slice(0, start) + before + text + after + draft.markdown.slice(end) })
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, end + before.length) })
  }

  return <S.Root aria-label="Gestión de la wiki" onKeyDown={(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (!busy && valid && dirty) mutation.mutate('save')
    }
  }}>
    <S.Header>
      <div><h2>Wiki de NandOS</h2><p>La biblioteca de conocimiento de nandBot. Escribe, revisa y publica cada artículo de forma independiente al portfolio.</p></div>
      <S.Actions>
        <S.Button type="button" disabled={busy || query.isError} onClick={() => mutation.mutate('seed')}>Cargar documentación inicial</S.Button>
        <S.Button type="button" $primary disabled={busy || query.isError} onClick={() => select(null)}>+ Nuevo artículo</S.Button>
      </S.Actions>
    </S.Header>
    <S.Stats aria-label="Resumen de artículos">
      <div><strong>{articles.length}</strong><span>Artículos en la biblioteca</span></div>
      <div><strong>{articles.filter((a) => !a.published).length}</strong><span>Solo borrador · privados</span></div>
      <div><strong>{articles.filter((a) => a.published).length}</strong><span>Con versión publicada</span></div>
    </S.Stats>
    <WikiSynchronization scope={repository.scope} repository={repository.synchronization} />
    {query.isError && <S.Notice $error role="alert">No se pudo cargar la wiki: {query.error.message} Comprueba la sesión, el API y la migración de wiki.</S.Notice>}
    {notice && <S.Notice $error={hasError} role={hasError ? 'alert' : 'status'}>{notice}</S.Notice>}
    <S.Layout>
      <S.Library aria-label="Biblioteca de artículos">
        <h3>Artículos</h3>
        <label>Buscar artículo<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título o contenido…" /></label>
        <label>Categoría<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas las categorías</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Estado<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todos los estados</option><option value="draft">Solo borradores</option><option value="published">Con publicación</option></select></label>
        <S.ArticleList aria-label="Lista de artículos" aria-busy={query.isPending}>
          {query.isPending ? <small>Cargando artículos…</small> : visible.length === 0 ? <small>No hay artículos con estos filtros. Crea uno o carga la documentación inicial.</small> : visible.map((a) =>
            <S.ArticleButton type="button" key={a.id} $active={selected?.id === a.id} aria-pressed={selected?.id === a.id} disabled={busy} onClick={() => select(a)}>
              <strong>{a.draft.title}</strong><small>{a.draft.category}</small><small>{status(a)}</small>
            </S.ArticleButton>)}
        </S.ArticleList>
        <S.Button type="button" disabled={busy} onClick={() => void reload()}>↻ Recargar lista</S.Button>
      </S.Library>
      <S.Editor aria-label="Editor de artículo">
        <S.Meta><strong>{selected ? status(selected) : 'Nuevo borrador'}</strong>
          <span>{selected ? `Revisión ${selected.revision}` : 'Aún no guardado'}</span>
          {dirty && <span>• Cambios sin guardar</span>}
          {selected?.publishedAt && <span>Publicado: {new Date(selected.publishedAt).toLocaleString('es-ES')}</span>}
        </S.Meta>
        <S.Fields>
          <label>Título<input maxLength={160} value={draft.title} disabled={busy || query.isError} placeholder="¿Cómo puedo ayudarte?" onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <WikiCategoryField key={selected?.id ?? 'new'} value={draft.category} categories={categories}
            disabled={busy || query.isError} onChange={(category) => setDraft({ ...draft, category })} />
        </S.Fields>
        <S.Toolbar>
          <div aria-label="Formato Markdown">
            <S.Button type="button" disabled={busy} onClick={() => insert('## ')} aria-label="Insertar encabezado">H2</S.Button>
            <S.Button type="button" disabled={busy} onClick={() => insert('**', '**')} aria-label="Insertar negrita"><b>B</b></S.Button>
            <S.Button type="button" disabled={busy} onClick={() => insert('- ')} aria-label="Insertar lista">☷ Lista</S.Button>
            <S.Button type="button" disabled={busy} onClick={() => insert('[', '](https://)')} aria-label="Insertar enlace">↗ Enlace</S.Button>
            <S.Button type="button" disabled={busy} onClick={() => insert('`', '`')} aria-label="Insertar código">&lt;/&gt;</S.Button>
          </div>
          <div aria-label="Modo del editor">{[['edit', 'Editar'], ['split', 'Dividida'], ['preview', 'Vista previa']].map(([id, label]) =>
            <S.Button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id!)}>{label}</S.Button>)}</div>
        </S.Toolbar>
        <S.Panes $mode={mode}>
          {mode !== 'preview' && <S.Source ref={source} aria-label="Contenido Markdown" spellCheck={false} maxLength={120000} value={draft.markdown} disabled={busy || query.isError}
            placeholder={'# Título del artículo\n\nEscribe instrucciones claras, enlaces y respuestas útiles para nandBot.'} onChange={(e) => setDraft({ ...draft, markdown: e.target.value })} />}
          {mode !== 'edit' && <S.Preview aria-label="Vista previa del artículo"><small>Vista previa del borrador</small>
            <MarkdownPreview markdown={previewMarkdown} />
          </S.Preview>}
        </S.Panes>
        <S.Footer>
          <small>{draft.markdown.length.toLocaleString('es-ES')} / 120.000 caracteres · Markdown seguro, sin ejecutar HTML.<br />Guarda antes de publicar y sincroniza las publicaciones con el índice. El chat sigue en demostración.</small>
          <S.Actions>
            {selected?.published && <S.Button type="button" disabled={busy || dirty} onClick={() => {
              if (window.confirm('¿Retirar la versión pública? El borrador se conservará.')) mutation.mutate('withdraw')
            }}>Retirar publicación</S.Button>}
            <S.Button type="button" disabled={busy || !valid || !dirty || query.isError} onClick={() => mutation.mutate('save')}>{mutation.isPending && mutation.variables === 'save' ? 'Guardando…' : 'Guardar borrador'}</S.Button>
            <S.Button type="button" $primary disabled={busy || !selected || dirty || !valid || query.isError} onClick={() => mutation.mutate('publish')}>{mutation.isPending && mutation.variables === 'publish' ? 'Publicando…' : 'Publicar artículo'}</S.Button>
          </S.Actions>
        </S.Footer>
      </S.Editor>
    </S.Layout>
  </S.Root>
}
