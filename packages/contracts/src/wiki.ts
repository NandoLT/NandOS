export interface WikiContent {
  title: string
  category: string
  markdown: string
}

export interface WikiArticle {
  id: string
  draft: WikiContent
  published: WikiContent | null
  revision: number
  publishedRevision: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PublishedWikiArticle {
  id: string
  content: WikiContent
  revision: number
  publishedAt: string
}
