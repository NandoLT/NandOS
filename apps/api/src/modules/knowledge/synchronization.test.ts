import assert from 'node:assert/strict'
import { test } from 'node:test'
import Fastify from 'fastify'
import type { WikiSynchronizationStatus } from '@nandoos/contracts'
import { createWikiSynchronization } from './application/wiki-synchronization.js'
import { isLocalWikiSyncEnabled } from './infrastructure/local-synchronization.js'
import { KnowledgeError, KnowledgeBusyError } from './domain/corpus.js'
import { registerWikiRoutes } from '../wiki/routes.js'
import type { WikiRepository } from '../wiki/application/wiki-repository.js'

const updated: WikiSynchronizationStatus = { state: 'updated', publishedArticles: 3, indexedArticles: 3, indexedChunks: 3 }
const baseStatus = { active: { collection: 'test', fingerprint: 'test', profile: 'test', articles: 3, chunks: 3 },
  publishedArticles: 3, expectedChunks: 3, synchronized: true }

test('synchronization reports updated/outdated from published snapshots, including an empty unindexed wiki', async () => {
  let status = baseStatus
  const sync = createWikiSynchronization({ async status() { return status }, async ingest() {} }, {
    async runExclusive(action) { return action() }, isLocked: () => false,
  })
  assert.deepEqual(await sync.status(), updated)
  status = { ...baseStatus, synchronized: false }
  assert.equal((await sync.status()).state, 'outdated')
  assert.equal((await sync.synchronize()).state, 'outdated')
  const empty = createWikiSynchronization({ async status() { return { ...baseStatus, active: null, publishedArticles: 0, synchronized: false } }, async ingest() {} }, {
    async runExclusive(action) { return action() }, isLocked: () => false,
  })
  assert.equal((await empty.status()).state, 'outdated')
})

test('only one synchronization runs, busy state survives panel reload and a failed run can be retried', async () => {
  let release!: () => void
  let started!: () => void
  const start = new Promise<void>((resolve) => { started = resolve })
  const pending = new Promise<void>((resolve) => { release = resolve })
  let fail = true
  const sync = createWikiSynchronization({ async status() { return baseStatus }, async ingest() {
    started(); await pending
    if (fail) throw new KnowledgeError('Provider failed')
  } }, { async runExclusive(action) { return action() }, isLocked: () => false })
  const first = sync.synchronize()
  await start
  assert.equal((await sync.status()).state, 'syncing')
  await assert.rejects(sync.synchronize(), KnowledgeError)
  release()
  await assert.rejects(first, KnowledgeError)
  fail = false
  assert.equal((await sync.synchronize()).state, 'updated')
})

test('a CLI ingestion lock is also reported as syncing and cannot be bypassed', async () => {
  let ingestions = 0
  const sync = createWikiSynchronization({ async status() { return baseStatus }, async ingest() { ingestions++ } }, {
    async runExclusive(action) { return action() }, isLocked: () => true,
  })
  assert.equal((await sync.status()).state, 'syncing')
  await assert.rejects(sync.synchronize(), KnowledgeError)
  assert.equal(ingestions, 0)
})

test('local AI synchronization is opt-in and always disabled in production and Vercel', () => {
  assert.equal(isLocalWikiSyncEnabled({}), false)
  assert.equal(isLocalWikiSyncEnabled({ WIKI_LOCAL_AI_ENABLED: 'true' }), true)
  assert.equal(isLocalWikiSyncEnabled({ WIKI_LOCAL_AI_ENABLED: 'true', NODE_ENV: 'production' }), false)
  for (const VERCEL of ['1', 'true', '0']) assert.equal(isLocalWikiSyncEnabled({ WIKI_LOCAL_AI_ENABLED: 'true', VERCEL }), false)
})

function fixture(sync: { status(): Promise<WikiSynchronizationStatus>; synchronize(): Promise<WikiSynchronizationStatus> } | null,
  onFactory = () => {}) {
  const repository: WikiRepository = {
    async list() { return [] }, async published() { return [] }, async find() { return null }, async insert() { return false }, async replace() { return false },
  }
  const app = Fastify()
  void registerWikiRoutes(app, {
    async requireAdmin(request, reply) { if (request.headers.authorization === 'test') return true; reply.code(401).send({ error: 'Unauthorized' }); return null },
    rejectUntrustedOrigin(request, reply) { if (request.headers.origin === 'http://test.local') return false; reply.code(403).send({ error: 'Origin' }); return true },
  }, repository, () => { onFactory(); return sync })
  return app
}
const url = '/api/admin/wiki/synchronization'
const headers = { authorization: 'test', origin: 'http://test.local' }

test('synchronization routes require admin and trusted origin before configuration or AI access', async () => {
  let factories = 0
  const app = fixture(null, () => { factories++ })
  try {
    assert.equal((await app.inject(url)).statusCode, 401)
    assert.equal((await app.inject({ method: 'POST', url, headers: { origin: headers.origin } })).statusCode, 401)
    assert.equal((await app.inject({ method: 'POST', url, headers: { authorization: 'test' } })).statusCode, 403)
    assert.equal(factories, 0)
  } finally { await app.close() }
})

test('unconfigured production returns an honest disabled state without attempting ingestion', async () => {
  const app = fixture(null)
  try {
    const response = await app.inject({ url, headers })
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    assert.equal(response.json().state, 'not-configured')
    assert.equal((await app.inject({ method: 'POST', url, headers })).statusCode, 503)
  } finally { await app.close() }
})

test('authenticated sync awaits ingestion and returns freshly verified state without internal metadata', async () => {
  let runs = 0
  const app = fixture({ async status() { return updated }, async synchronize() { runs++; return updated } })
  try {
    const response = await app.inject({ method: 'POST', url, headers, payload: { endpoint: 'https://untrusted.test', command: 'never execute' } })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), updated)
    assert.equal(runs, 1)
    assert.ok(!response.body.includes('fingerprint'))
  } finally { await app.close() }
})

test('AI/database errors are sanitized rather than logged or exposed as private error bodies', async () => {
  const app = fixture({ async status() { throw new Error('SECRET_DATABASE_URL') }, async synchronize() { throw new Error('SECRET_PROVIDER_KEY') } })
  try {
    const read = await app.inject({ url, headers })
    assert.equal(read.statusCode, 200)
    assert.equal(read.json().state, 'error')
    const write = await app.inject({ method: 'POST', url, headers })
    assert.equal(write.statusCode, 503)
    assert.ok(!read.body.includes('SECRET'))
    assert.ok(!write.body.includes('SECRET'))
  } finally { await app.close() }
})

test('a competing ingestion returns HTTP 409 without starting another operation', async () => {
  const app = fixture({ async status() { return { ...updated, state: 'syncing' } },
    async synchronize() { throw new KnowledgeBusyError('Busy') } })
  try {
    const result = await app.inject({ method: 'POST', url, headers })
    assert.equal(result.statusCode, 409)
    assert.equal(result.headers['cache-control'], 'private, no-store')
  } finally { await app.close() }
})
