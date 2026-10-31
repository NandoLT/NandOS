import { and, eq, isNotNull } from 'drizzle-orm'
import type { PublishedWikiArticle, WikiArticle } from '@nandoos/contracts'
import { getDatabase } from '../../../infrastructure/db/client.js'
import { wikiArticles } from '../../../infrastructure/db/schema.js'
import type { WikiRepository } from '../application/wiki-repository.js'

function toArticle(row: typeof wikiArticles.$inferSelect): WikiArticle {
  return { id: row.id, draft: row.draftContent, published: row.publishedContent,
    revision: row.revision, publishedRevision: row.publishedRevision,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null }
}
function toRow(article: WikiArticle) {
  return { id: article.id, draftContent: article.draft, publishedContent: article.published,
    revision: article.revision, publishedRevision: article.publishedRevision,
    createdAt: new Date(article.createdAt), updatedAt: new Date(article.updatedAt),
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : null }
}

export const postgresWikiRepository: WikiRepository = {
  async list() {
    return (await getDatabase().select().from(wikiArticles).orderBy(wikiArticles.createdAt)).map(toArticle)
  },
  async published() {
    // Never select drafts on the public read path.
    const rows = await getDatabase().select({ id: wikiArticles.id, content: wikiArticles.publishedContent,
      revision: wikiArticles.publishedRevision, publishedAt: wikiArticles.publishedAt })
      .from(wikiArticles).where(isNotNull(wikiArticles.publishedContent)).orderBy(wikiArticles.createdAt)
    return rows.flatMap((row): PublishedWikiArticle[] => row.content && row.revision !== null && row.publishedAt
      ? [{ id: row.id, content: row.content, revision: row.revision, publishedAt: row.publishedAt.toISOString() }] : [])
  },
  async find(id) {
    const [row] = await getDatabase().select().from(wikiArticles).where(eq(wikiArticles.id, id)).limit(1)
    return row ? toArticle(row) : null
  },
  async insert(article) {
    return (await getDatabase().insert(wikiArticles).values(toRow(article)).onConflictDoNothing()
      .returning({ id: wikiArticles.id })).length === 1
  },
  async replace(article, expectedRevision) {
    return (await getDatabase().update(wikiArticles).set(toRow(article))
      .where(and(eq(wikiArticles.id, article.id), eq(wikiArticles.revision, expectedRevision)))
      .returning({ id: wikiArticles.id })).length === 1
  },
}
