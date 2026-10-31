import { randomUUID } from 'node:crypto'
import { INITIAL_WIKI_ARTICLES } from '@nandoos/contracts'
import type { WikiArticle } from '@nandoos/contracts'
import type { WikiRepository } from './wiki-repository.js'
import { parseWikiContent, publishArticle, saveArticleDraft, withdrawArticle } from '../domain/wiki-article.js'

export class WikiError extends Error {
  readonly statusCode: number
  constructor(statusCode: number, message: string) { super(message); this.statusCode = statusCode }
}
type WikiAction = 'save' | 'publish' | 'withdraw'

// Application use cases depend on a repository port, never on Fastify or Neon.
export function createWikiService(repository: WikiRepository, clock = () => new Date().toISOString(), newId = randomUUID) {
  return {
    list: () => repository.list(),
    published: () => repository.published(),
    async create(value: unknown) {
      const content = parseWikiContent(value)
      if (!content) throw new WikiError(400, 'Título, categoría y Markdown son obligatorios (máximos: 160, 80 y 120.000 caracteres).')
      const date = clock()
      const article: WikiArticle = { id: newId(), draft: content, published: null, revision: 1,
        publishedRevision: null, createdAt: date, updatedAt: date, publishedAt: null }
      if (!(await repository.insert(article))) throw new WikiError(409, 'No se pudo crear el artículo. Inténtalo de nuevo.')
      return article
    },
    async seed() {
      let created = 0
      for (const seed of INITIAL_WIKI_ARTICLES) {
        const date = clock()
        if (await repository.insert({ ...seed, published: null, revision: 1, publishedRevision: null,
          createdAt: date, updatedAt: date, publishedAt: null })) created++
      }
      return created
    },
    async change(id: string, value: unknown, action: WikiAction) {
      const body = value as Record<string, unknown> | null
      if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id) ||
          !body || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1)
        throw new WikiError(400, 'Identificador o revisión no válidos.')
      const content = action === 'save' ? parseWikiContent(body.content) : null
      if (action === 'save' && !content) throw new WikiError(400, 'Revisa el título, la categoría y el contenido Markdown.')
      const article = await repository.find(id)
      if (!article) throw new WikiError(404, 'Artículo no encontrado.')
      if (article.revision !== body.expectedRevision)
        throw new WikiError(409, 'Otra edición ha cambiado este artículo. Recarga la lista antes de volver a guardar; tu texto sigue en el editor.')
      const updated = action === 'save' && content ? saveArticleDraft(article, content, clock())
        : action === 'publish' ? publishArticle(article, clock()) : withdrawArticle(article, clock())
      if (!(await repository.replace(updated, article.revision)))
        throw new WikiError(409, 'El artículo cambió durante la operación. Recarga antes de continuar.')
      return updated
    },
  }
}
