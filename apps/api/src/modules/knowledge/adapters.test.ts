import assert from 'node:assert/strict'
import { test } from 'node:test'
import { embeddingProfile, KnowledgeError } from './domain/corpus.js'
import { createLiteLlmEmbeddings } from './infrastructure/litellm-embeddings.js'
import { createLocalAiHttp } from './infrastructure/local-ai-http.js'
import { createQdrantIndex, wikiAlias } from './infrastructure/qdrant-index.js'
import type { LocalAiHttp } from './infrastructure/local-ai-http.js'
import { validateDevelopmentConnection } from './infrastructure/local-config.js'

const vector = [1, ...Array.from({ length: 1023 }, () => 0)]
const snapshot = { fingerprint: 'a'.repeat(64), profile: embeddingProfile.id, articles: 0, chunks: 0 }
const uuid = '10000000-0000-4000-8000-000000000001'
const collection = 'nandos_wiki_dev_' + uuid.replaceAll('-', '')

test('LiteLLM validates dimensions, finite nonzero values and unique indices, preserving response order', async () => {
  const good = createLiteLlmEmbeddings(async () => ({ data: [{ index: 1, embedding: vector }, { index: 0, embedding: vector }] }))
  assert.deepEqual(await good.embed(['CV', 'Contacto']), [vector, vector])
  for (const data of [[{ index: 0, embedding: [1] }], [{ index: 0, embedding: vector.map(() => 0) }],
    [{ index: 0, embedding: vector.map(() => Infinity) }], [{ index: -1, embedding: vector }],
    [{ index: 0, embedding: vector }, { index: 0, embedding: vector }]]) {
    const provider = createLiteLlmEmbeddings(async () => ({ data }))
    await assert.rejects(provider.embed(Array.from({ length: data.length }, () => 'test')), KnowledgeError)
  }
  await assert.rejects(good.embed(['x'.repeat(6001)]), KnowledgeError)
})

test('local HTTP never redirects credentials or exposes provider response bodies', async () => {
  const requests: { url: string; options: RequestInit | undefined }[] = []
  const http = createLocalAiHttp({ qdrantKey: 'private-qdrant', litellmKey: 'private-litellm' }, async (url, options) => {
    requests.push({ url: String(url), options })
    return new Response('PRIVATE PROVIDER BODY', { status: 500 })
  })
  await assert.rejects(http('litellm', '/v1/embeddings', 'POST', {}), (error: unknown) =>
    error instanceof KnowledgeError && error.message.includes('500') && !error.message.includes('PRIVATE'))
  assert.equal(requests[0].url, 'http://127.0.0.1:4000/v1/embeddings')
  assert.equal(requests[0].options?.redirect, 'error')
  assert.deepEqual(requests[0].options?.headers, { 'content-type': 'application/json', authorization: 'Bearer private-litellm' })
  await assert.rejects(http('qdrant', '//other.test/'), KnowledgeError)
  assert.equal(requests.length, 1)
})

test('development guard rejects production/other hosts and missing TLS without leaking URLs', () => {
  const valid = 'postgresql://test:test@ep-silent-shape-b9eucpov-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  assert.equal(validateDevelopmentConnection(valid), valid)
  for (const value of [undefined, 'invalid-SECRET', valid.replace('ep-silent-shape-b9eucpov', 'ep-other'), valid.replace('require', 'disable')]) {
    assert.throws(() => validateDevelopmentConnection(value), (error: unknown) => error instanceof KnowledgeError && !error.message.includes('SECRET'))
  }
})

test('Qdrant activates only complete candidates with an atomic alias request', async () => {
  const calls: { path: string; method: string | undefined; body: unknown }[] = []
  const http: LocalAiHttp = async (_service, path, method, body) => {
    calls.push({ path, method, body })
    if (path === '/aliases') return { result: { aliases: [] } }
    if (path.endsWith('/points/count')) return { result: { count: 0 } }
    if (path.includes('/points?')) return { result: { status: 'completed' } }
    return { result: true }
  }
  const index = createQdrantIndex(http, () => uuid)
  assert.equal(await index.create(snapshot), collection)
  await index.activate(collection, null)
  assert.deepEqual(calls.at(-1)?.body, { actions: [{ create_alias: { collection_name: collection, alias_name: wikiAlias } }] })
  assert.ok(!calls.some((call) => call.method === 'DELETE'))
  await assert.rejects(index.discard(collection), KnowledgeError)
})

test('Qdrant never deletes an existing collection after failed creation or an unknown collection', async () => {
  const calls: string[] = []
  const index = createQdrantIndex(async (_s, _p, method) => { calls.push(method ?? 'GET'); throw new KnowledgeError('Conflict') }, () => uuid)
  await assert.rejects(index.create(snapshot), KnowledgeError)
  await assert.rejects(index.discard(collection), KnowledgeError)
  await assert.rejects(index.discard('other-collection'), KnowledgeError)
  assert.deepEqual(calls, ['PUT'])
})

test('ambiguous activation is never followed by deletion of an aliased collection', async () => {
  let promoted = false
  const deleted: string[] = []
  const index = createQdrantIndex(async (_s, path, method) => {
    if (method === 'DELETE') deleted.push(path)
    if (path === '/aliases') return { result: { aliases: promoted ? [{ alias_name: wikiAlias, collection_name: collection }] : [] } }
    if (path.endsWith('/points/count')) return { result: { count: 0 } }
    if (path.includes('/points?')) return { result: { status: 'completed' } }
    if (path === '/collections/aliases') { promoted = true; throw new KnowledgeError('Timeout') }
    return { result: true }
  }, () => uuid)
  await index.create(snapshot)
  await assert.rejects(index.activate(collection, null), KnowledgeError)
  await index.discard(collection)
  assert.deepEqual(deleted, [])
})

test('partial or concurrently superseded candidates cannot replace the current index', async () => {
  for (const changed of [false, true]) {
    const calls: string[] = []
    const index = createQdrantIndex(async (_s, path) => {
      calls.push(path)
      if (path === '/aliases') return { result: { aliases: changed ? [{ alias_name: wikiAlias, collection_name: 'another' }] : [] } }
      if (path.endsWith('/points/count')) return { result: { count: 99 } }
      return { result: true }
    }, () => uuid)
    await index.create(snapshot)
    await assert.rejects(index.activate(collection, null), KnowledgeError)
    assert.ok(!calls.includes('/collections/aliases'))
  }
})

test('Qdrant retrieval filters out manifest points and other embedding profiles', async () => {
  let body: unknown
  const index = createQdrantIndex(async (_s, _p, _m, value) => { body = value; return { result: { points: [] } } })
  assert.deepEqual(await index.search(collection, vector, 5), [])
  assert.deepEqual((body as { filter: unknown }).filter, { must: [
    { key: 'kind', match: { value: 'chunk' } }, { key: 'profile', match: { value: embeddingProfile.id } },
  ] })
})
