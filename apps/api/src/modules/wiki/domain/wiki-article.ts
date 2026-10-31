import type { WikiArticle, WikiContent } from '@nandoos/contracts'

export function parseWikiContent(value: unknown): WikiContent | null {
  if (!value || typeof value !== 'object') return null
  const { title, category, markdown } = value as Record<string, unknown>
  if (typeof title !== 'string' || typeof category !== 'string' || typeof markdown !== 'string') return null
  if (!title.trim() || title.trim().length > 160 || !category.trim() || category.trim().length > 80 ||
      !markdown.trim() || markdown.length > 120_000) return null
  return { title: title.trim(), category: category.trim(), markdown }
}

export function saveArticleDraft(article: WikiArticle, draft: WikiContent, now: string): WikiArticle {
  return { ...article, draft: { ...draft }, revision: article.revision + 1, updatedAt: now }
}

export function publishArticle(article: WikiArticle, now: string): WikiArticle {
  return { ...article, published: { ...article.draft }, revision: article.revision + 1,
    publishedRevision: article.revision + 1, updatedAt: now, publishedAt: now }
}

export function withdrawArticle(article: WikiArticle, now: string): WikiArticle {
  return { ...article, published: null, publishedRevision: null, publishedAt: null,
    revision: article.revision + 1, updatedAt: now }
}
