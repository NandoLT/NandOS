import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PublishedWikiArticle } from '@nandoos/contracts'
import { buildCorpus, embeddingProfile, KnowledgeError } from './domain/corpus.js'
import type { KnowledgeIndex, Snapshot, VectorPoint } from './application/ports.js'
import { createKnowledgeService } from './application/knowledge-service.js'

const article: PublishedWikiArticle = { id: '10000000-0000-4000-8000-000000000001', revision: 2,
  publishedAt: '2026-11-04T10:00:00.000Z', content: { title: 'CV', category: 'Documentos', markdown: '# CV\n\nDescarga el currículum.\n\n## Idiomas\n\nEspañol e inglés.' } }

test('corpus is deterministic, heading-aware and projects only published fields', () => {
  const input = { ...article, draft: { markdown: 'PRIVATE DRAFT' } }
  const corpus = buildCorpus([input])
  assert.equal(corpus.chunks.length, 2)
  assert.deepEqual(corpus.chunks[1].headingPath, ['CV', 'Idiomas'])
  assert.equal(corpus.chunks[0].revision, 2)
  assert.equal(corpus.chunks[0].publishedAt, article.publishedAt)
  assert.equal(JSON.stringify(corpus).includes('PRIVATE DRAFT'), false)
  assert.deepEqual(corpus, buildCorpus([input]))
  assert.notEqual(corpus.fingerprint, buildCorpus([{ ...article, revision: 3 }]).fingerprint)
  assert.notEqual(corpus.chunks[0].id, buildCorpus([{ ...article, revision: 3 }]).chunks[0].id)
  assert.deepEqual(buildCorpus([article, { ...article, id: '20000000-0000-4000-8000-000000000002' }]),
    buildCorpus([{ ...article, id: '20000000-0000-4000-8000-000000000002' }, article]))
})

test('Markdown headings inside fenced code are not sections; setext headings are supported', () => {
  const markdown = 'Introducción\n===========\n\nTexto.\n\n```md\n# No es una sección\n```\n\nFinal\n-----\n\nFin.'
  const chunks = buildCorpus([{ ...article, content: { ...article.content, markdown } }]).chunks
  assert.equal(chunks.length, 2)
  assert.deepEqual(chunks[0].headingPath, ['Introducción'])
  assert.deepEqual(chunks[1].headingPath, ['Introducción', 'Final'])
  assert.ok(chunks[0].markdown.includes('# No es una sección'))
})

test('long Unicode sections are bounded without losing source text or splitting characters', () => {
  const markdown = '🖥️ Código áéíóú '.repeat(2000)
  const chunks = buildCorpus([{ ...article, content: { ...article.content, markdown } }]).chunks
  assert.ok(chunks.length > 1)
  assert.equal(chunks.map((chunk) => chunk.markdown).join(''), markdown.trim())
  for (const chunk of chunks) {
    assert.ok(Buffer.byteLength(chunk.embeddingText) <= 6000)
    assert.ok(!/[\uD800-\uDBFF]$/.test(chunk.markdown))
    assert.ok(chunk.embeddingText.includes('Documentos'))
  }
})

test('heading ancestry follows levels even when Markdown skips a level', () => {
  const chunks = buildCorpus([{ ...article, content: { ...article.content, markdown: '### Primero\n\nTexto\n\n## Segundo\n\nOtro' } }]).chunks
  assert.deepEqual(chunks[1].headingPath, ['Segundo'])
})

test('invalid, duplicate or private-shaped articles fail closed', () => {
  for (const input of [[{ ...article, revision: 0 }], [article, article], [{ ...article, id: '../secret' }],
    [{ ...article, content: { ...article.content, markdown: '' } }], [{ draft: article.content }]]) {
    assert.throws(() => buildCorpus(input as PublishedWikiArticle[]), KnowledgeError)
  }
  assert.equal(buildCorpus([]).chunks.length, 0)
})

function fixture() {
  let published = [structuredClone(article)]
  let current: Snapshot | null = null
  let candidate: Snapshot | null = null
  let points: VectorPoint[] = []
  const calls: string[] = []
  let failEmbeddings = false
  let changeDuringEmbedding = false
  let failActivation = false
  const index: KnowledgeIndex = {
    async current() { return current },
    async create(snapshot) { calls.push('create'); candidate = { ...snapshot, collection: 'candidate' }; points = []; return 'candidate' },
    async write(_collection, batch) { calls.push('write'); points.push(...batch) },
    async activate() { calls.push('activate'); if (failActivation) throw new KnowledgeError('Fallo de activación.'); current = candidate },
    async discard() { calls.push('discard') },
    async search() { calls.push('search'); return points.map((point) => ({ id: point.id, score: 0.9 })) },
  }
  const embeddings = { async embed(texts: string[]) {
    calls.push('embed')
    if (failEmbeddings) throw new KnowledgeError('Fallo de embeddings.')
    if (changeDuringEmbedding) published = []
    return texts.map(() => [1, ...Array.from({ length: 1023 }, () => 0)])
  } }
  const service = createKnowledgeService({ published: async () => structuredClone(published) }, embeddings, index)
  return { service, calls, get current() { return current },
    withdraw() { published = [] },
    revise() { published[0] = { ...article, revision: 3 } },
    failEmbedding() { failEmbeddings = true }, changeDuringEmbedding() { changeDuringEmbedding = true },
    failActivation() { failActivation = true } }
}

test('ingestion builds a complete snapshot and skips unchanged content without embeddings', async () => {
  const f = fixture()
  const first = await f.service.ingest()
  assert.equal(first.status, 'indexed')
  assert.equal(first.articles, 1)
  assert.equal(first.chunks, 2)
  assert.equal(f.current?.profile, embeddingProfile.id)
  assert.equal(f.calls.at(-1), 'activate')
  f.calls.length = 0
  assert.equal((await f.service.ingest()).status, 'unchanged')
  assert.deepEqual(f.calls, [])
})

test('withdrawal activates an empty index without embedding documents', async () => {
  const f = fixture()
  await f.service.ingest()
  f.withdraw(); f.calls.length = 0
  assert.equal((await f.service.ingest()).chunks, 0)
  assert.equal(f.current?.articles, 0)
  assert.ok(!f.calls.includes('embed'))
  assert.equal(f.calls.at(-1), 'activate')
})

test('failed embeddings or changed publication never replace the active snapshot', async () => {
  for (const fail of ['failEmbedding', 'changeDuringEmbedding', 'failActivation'] as const) {
    const f = fixture()
    await f.service.ingest()
    const original = f.current
    f.revise(); f.calls.length = 0; f[fail]()
    await assert.rejects(f.service.ingest(), KnowledgeError)
    assert.equal(f.current, original)
    assert.equal(f.calls.at(-1), 'discard')
    if (fail !== 'failActivation') assert.ok(!f.calls.includes('activate'))
  }
})

test('retrieval returns citable current sources and excludes withdrawn/stale revisions immediately', async () => {
  const f = fixture()
  assert.deepEqual(await f.service.search('¿Dónde está el CV?'), [])
  await f.service.ingest()
  const results = await f.service.search('¿Dónde está el CV?')
  assert.equal(results.length, 2)
  assert.equal(results[0].source.articleId, article.id)
  assert.equal(results[0].source.revision, 2)
  assert.equal(results[0].source.title, 'CV')
  assert.ok(results[0].markdown.includes('currículum'))
  f.revise()
  assert.deepEqual(await f.service.search('¿Dónde está el CV?'), [])
  f.withdraw()
  assert.deepEqual(await f.service.search('¿Dónde está el CV?'), [])
  await assert.rejects(f.service.search(' '), KnowledgeError)
})

test('dry-run reads only published content and does not access embeddings or Qdrant', async () => {
  const f = fixture()
  assert.deepEqual(await f.service.plan(), { articles: 1, chunks: 2, profile: embeddingProfile.id,
    fingerprint: buildCorpus([article]).fingerprint })
  assert.deepEqual(f.calls, [])
})
