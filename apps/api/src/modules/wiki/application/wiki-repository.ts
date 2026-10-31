import type { PublishedWikiArticle, WikiArticle } from '@nandoos/contracts'

export interface WikiRepository {
  list(): Promise<WikiArticle[]>
  published(): Promise<PublishedWikiArticle[]>
  find(id: string): Promise<WikiArticle | null>
  insert(article: WikiArticle): Promise<boolean>
  replace(article: WikiArticle, expectedRevision: number): Promise<boolean>
}
