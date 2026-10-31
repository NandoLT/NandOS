import { INITIAL_WIKI_ARTICLES } from '@nandoos/contracts'
import type { WikiArticle, WikiContent } from '@nandoos/contracts'
import type { WikiEditorRepository } from '../application/wiki-api'

// Isolated demonstration adapter. Never used by the authenticated admin panel.
// Deliberately in memory: editorial content belongs in Neon, not localStorage.
export function createPreviewWikiRepository(initial: WikiArticle[] = []): WikiEditorRepository {
  const records = new Map(initial.map((article) => [article.id, structuredClone(article)]))
  const clone = <T,>(value: T): T => structuredClone(value)
  function update(id: string, revision: number, transform: (article: WikiArticle) => WikiArticle) {
    const article = records.get(id)
    if (!article || article.revision !== revision) throw new Error('Otra edición ha cambiado este artículo. Recarga la lista; tu texto sigue en el editor.')
    const next = transform(clone(article))
    next.revision++
    next.updatedAt = new Date().toISOString()
    records.set(id, next)
    return clone(next)
  }
  function insert(id: string, draft: WikiContent) {
    const now = new Date().toISOString()
    const article: WikiArticle = { id, draft: clone(draft), published: null, revision: 1, publishedRevision: null,
      createdAt: now, updatedAt: now, publishedAt: null }
    records.set(id, article)
    return clone(article)
  }
  return {
    scope: `local-${crypto.randomUUID()}`,
    async list() { return clone([...records.values()]) },
    async create(content) { return insert(crypto.randomUUID(), content) },
    async save(id, content, revision) { return update(id, revision, (article) => ({ ...article, draft: clone(content) })) },
    async publish(id, revision) { return update(id, revision, (article) => ({ ...article, published: clone(article.draft),
      publishedRevision: article.revision + 1, publishedAt: new Date().toISOString() })) },
    async withdraw(id, revision) { return update(id, revision, (article) => ({ ...article, published: null, publishedRevision: null, publishedAt: null })) },
    async seed() {
      let created = 0
      for (const seed of INITIAL_WIKI_ARTICLES) if (!records.has(seed.id)) { insert(seed.id, seed.draft); created++ }
      return created
    },
  }
}
