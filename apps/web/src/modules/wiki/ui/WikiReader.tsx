import { useEffect, useState } from 'react'
import { usePublishedWikiArticles } from '../application/usePublishedWikiArticles'
import { MarkdownPreview } from './MarkdownPreview'
import * as S from './wiki-reader.styles'

export function WikiReader({ onReadingChange }: { onReadingChange?: (reading: boolean) => void }) {
  const query = usePublishedWikiArticles()
  const [section, setSection] = useState('')
  const [articleId, setArticleId] = useState('')
  const articles = query.data ?? []
  const sections = [...new Set(articles.map((article) => article.content.category))].sort((a, b) => a.localeCompare(b, 'es'))
  // Derived selection also handles articles withdrawn or moved to another category.
  const currentSection = sections.includes(section) ? section : ''
  const visible = articles.filter((article) => !currentSection || article.content.category === currentSection)
    .sort((a, b) => a.content.title.localeCompare(b.content.title, 'es'))
  const selected = visible.find((article) => article.id === articleId)
  const available = !query.isPending && !query.isError && articles.length > 0
  const reading = available && Boolean(selected)

  useEffect(() => { onReadingChange?.(reading) }, [onReadingChange, reading])

  return <S.Root $reading={reading} aria-label="Ayuda y documentación de NandOS">
    <S.Introduction>
      <span aria-hidden="true">📖</span>
      <div><small>Centro de ayuda · NandOS</small><h2>Wiki de NandOS</h2>
        <p>Tu guía para explorar el escritorio, conocer sus aplicaciones y encontrar lo que necesitas. Elige una sección y un artículo para empezar.</p>
      </div>
    </S.Introduction>
    <S.Navigation aria-label="Navegación de la wiki">
      <div>
        <S.Button type="button" aria-label="Inicio de la wiki" onClick={() => { setSection(''); setArticleId('') }}>⌂ Inicio</S.Button>
        <S.Button type="button" aria-label="Actualizar wiki" disabled={query.isFetching} onClick={() => void query.refetch()}>↻ {query.isFetching ? 'Actualizando…' : 'Actualizar'}</S.Button>
      </div>
      {available && <small>{articles.length} {articles.length === 1 ? 'artículo publicado' : 'artículos publicados'} · {sections.length} {sections.length === 1 ? 'sección' : 'secciones'}</small>}
    </S.Navigation>
    <S.Selectors>
      <label>Sección<select value={currentSection} disabled={!available} onChange={(event) => { setSection(event.target.value); setArticleId('') }}>
        <option value="">Todas las secciones</option>{sections.map((name) => <option key={name}>{name}</option>)}
      </select></label>
      <label>Artículo<select value={selected?.id ?? ''} disabled={!available} onChange={(event) => setArticleId(event.target.value)}>
        <option value="">Elige un artículo…</option>
        {sections.filter((name) => !currentSection || name === currentSection).map((name) => <optgroup key={name} label={name}>
          {visible.filter((article) => article.content.category === name).map((article) => <option key={article.id} value={article.id}>{article.content.title}</option>)}
        </optgroup>)}
      </select></label>
    </S.Selectors>
    {query.isPending ? <S.Notice role="status">Cargando documentación publicada…</S.Notice>
      : query.isError ? <S.Notice role="alert"><strong>No se pudo cargar la wiki.</strong>Comprueba tu conexión y pulsa Actualizar para volver a intentarlo.</S.Notice>
      : articles.length === 0 ? <S.Notice role="status"><strong>Todavía no hay artículos publicados.</strong>La documentación aparecerá aquí cuando esté lista. Mientras tanto puedes explorar el escritorio y consultar a nandBot.</S.Notice>
      : selected ? <S.Document aria-label={selected.content.title} tabIndex={0}>
        <S.Metadata><span>📂 {selected.content.category}</span><span>Versión publicada · revisión {selected.revision}</span>
          <time dateTime={selected.publishedAt}>Actualizado: {new Date(selected.publishedAt).toLocaleDateString('es-ES')}</time>
        </S.Metadata>
        <MarkdownPreview markdown={selected.content.markdown} />
      </S.Document>
      : null}
    <S.Footer>Ayuda de NandOS · Documentación de solo lectura. El contenido se gestiona desde administración.</S.Footer>
  </S.Root>
}
