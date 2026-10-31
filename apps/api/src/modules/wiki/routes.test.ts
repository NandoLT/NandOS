import assert from 'node:assert/strict'
import { test } from 'node:test'
import Fastify from 'fastify'
import type { WikiArticle } from '@nandoos/contracts'
import type { WikiRepository } from './application/wiki-repository.js'
import { registerWikiRoutes } from './routes.js'

function fixture() {
  const articles = new Map<string, WikiArticle>()
  const repository: WikiRepository = {
    async list() { return structuredClone([...articles.values()]) },
    async find(id) { return structuredClone(articles.get(id) ?? null) },
    async insert(article) { if (articles.has(article.id)) return false; articles.set(article.id, structuredClone(article)); return true },
    async replace(article, revision) { if (articles.get(article.id)?.revision !== revision) return false; articles.set(article.id, structuredClone(article)); return true },
    async published() { return [...articles.values()].flatMap((a) => a.published && a.publishedAt && a.publishedRevision
      ? [{ id: a.id, content: a.published, revision: a.publishedRevision, publishedAt: a.publishedAt }] : []) },
  }
  const app = Fastify()
  // Test-only guards. Production always injects the real session/origin checks.
  void registerWikiRoutes(app, {
    async requireAdmin(request, reply) { if (request.headers.authorization === 'test') return true; reply.code(401).send({ error: 'Unauthorized' }); return null },
    rejectUntrustedOrigin(request, reply) { if (request.headers.origin === 'http://test.local') return false; reply.code(403).send({ error: 'Origin' }); return true },
  }, repository)
  return app
}
const headers = { authorization: 'test', origin: 'http://test.local' }
const content = { title: 'Documento', category: 'Ayuda', markdown: '# Versión pública' }

test('wiki writes require both a session and trusted origin', async () => {
  const app = fixture()
  try {
    assert.equal((await app.inject('/api/admin/wiki/articles')).statusCode, 401)
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/wiki/articles', headers: { authorization: 'test' }, payload: content })).statusCode, 403)
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/wiki/articles', headers: { origin: 'http://test.local' }, payload: content })).statusCode, 401)
  } finally { await app.close() }
})
test('only published snapshots are public, stale edits conflict and withdrawal keeps drafts', async () => {
  const app = fixture()
  try {
    const created = await app.inject({ method: 'POST', url: '/api/admin/wiki/articles', headers, payload: content })
    assert.equal(created.statusCode, 201)
    const article = created.json().article as WikiArticle
    assert.deepEqual((await app.inject('/api/wiki/articles')).json().articles, [])
    const base = `/api/admin/wiki/articles/${article.id}`
    assert.equal((await app.inject({ method: 'POST', url: `${base}/publish`, headers, payload: { expectedRevision: 1 } })).statusCode, 200)
    assert.equal((await app.inject({ method: 'PUT', url: base, headers, payload: { expectedRevision: 2, content: { ...content, markdown: 'PRIVATE DRAFT' } } })).statusCode, 200)
    const publicResult = (await app.inject('/api/wiki/articles')).json()
    assert.equal(publicResult.articles[0].content.markdown, content.markdown)
    assert.ok(!JSON.stringify(publicResult).includes('PRIVATE DRAFT'))
    assert.ok(!('draft' in publicResult.articles[0]))
    assert.equal((await app.inject({ method: 'PUT', url: base, headers, payload: { expectedRevision: 2, content } })).statusCode, 409)
    assert.equal((await app.inject({ method: 'POST', url: `${base}/withdraw`, headers, payload: { expectedRevision: 3 } })).statusCode, 200)
    assert.deepEqual((await app.inject('/api/wiki/articles')).json().articles, [])
    assert.equal((await app.inject({ url: '/api/admin/wiki/articles', headers })).json().articles[0].draft.markdown, 'PRIVATE DRAFT')
  } finally { await app.close() }
})
test('initial documentation import is draft-only and idempotent', async () => {
  const app = fixture()
  try {
    const first = await app.inject({ method: 'POST', url: '/api/admin/wiki/seed', headers })
    assert.ok(first.json().created >= 30)
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/wiki/seed', headers })).json().created, 0)
    assert.deepEqual((await app.inject('/api/wiki/articles')).json().articles, [])
  } finally { await app.close() }
})
test('invalid content and identifiers never reach persistence', async () => {
  const app = fixture()
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/wiki/articles', headers, payload: { ...content, title: '' } })).statusCode, 400)
    assert.equal((await app.inject({ method: 'PUT', url: '/api/admin/wiki/articles/invalid', headers, payload: { expectedRevision: 1, content } })).statusCode, 400)
  } finally { await app.close() }
})
