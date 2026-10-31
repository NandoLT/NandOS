import type { WikiArticle, WikiContent } from '@nandoos/contracts'
import { apiRequest } from '../../portfolio/infrastructure/http-client'

export interface WikiEditorRepository {
  scope: string
  list(): Promise<WikiArticle[]>
  create(content: WikiContent): Promise<WikiArticle>
  save(id: string, content: WikiContent, expectedRevision: number): Promise<WikiArticle>
  publish(id: string, expectedRevision: number): Promise<WikiArticle>
  withdraw(id: string, expectedRevision: number): Promise<WikiArticle>
  seed(): Promise<number>
}
const base = 'admin/wiki/articles'
async function change(id: string, action: string, expectedRevision: number) {
  return (await apiRequest<{ article: WikiArticle }>(`${base}/${id}/${action}`, {
    method: 'POST', body: JSON.stringify({ expectedRevision }),
  })).article
}
export const wikiApi: WikiEditorRepository = {
  scope: 'neon',
  async list() { return (await apiRequest<{ articles: WikiArticle[] }>(base)).articles },
  async create(content) { return (await apiRequest<{ article: WikiArticle }>(base, { method: 'POST', body: JSON.stringify(content) })).article },
  async save(id, content, expectedRevision) { return (await apiRequest<{ article: WikiArticle }>(`${base}/${id}`, {
    method: 'PUT', body: JSON.stringify({ content, expectedRevision }),
  })).article },
  publish: (id, revision) => change(id, 'publish', revision),
  withdraw: (id, revision) => change(id, 'withdraw', revision),
  async seed() { return (await apiRequest<{ created: number }>('admin/wiki/seed', { method: 'POST' })).created },
}
