import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyLocalAi } from './verify.mjs'

const secrets = { qdrantKey: 'q'.repeat(64), litellmKey: `sk-${'l'.repeat(64)}` }
const testId = '7d4f546f-0e7e-463e-b37b-53c8dd7b1509'
const vector = (position) => Array.from({ length: 1024 }, (_, index) => index === position ? 1 : 0)

function mockServices({ invalidVector = false, wrongResult = false, failCreation = false, openGateway = false,
  unconfirmedCreation = false, failCleanup = false, invalidJson = false } = {}) {
  const calls = []
  let queryCount = 0
  const fetchImpl = async (url, options = {}) => {
    url = String(url)
    calls.push({ url, options })
    const headers = new Headers(options.headers)
    if (url.endsWith('/collections') && !headers.has('api-key')) return Response.json({}, { status: 403 })
    if (url.endsWith('/v1/models')) {
      if (!headers.has('authorization') && !openGateway) return Response.json({}, { status: 401 })
      return Response.json({ data: [{ id: 'nandos-embeddings' }] })
    }
    if (url.endsWith('/v1/embeddings') && invalidJson) return new Response('PRIVATE_RESPONSE_MUST_NOT_BE_LOGGED')
    if (url.endsWith('/v1/embeddings')) return Response.json({ data: Array.from({ length: 6 }, (_, index) => ({
      index, embedding: invalidVector ? [1] : vector(index % 3),
    })) })
    if (url.includes('/points/query')) {
      const documentId = wrongResult ? 'unexpected' : ['cv', 'contact', 'themes'][queryCount++]
      return Response.json({ result: { points: [{ score: 1, payload: { documentId } }] } })
    }
    if (options.method === 'PUT' && /nandos_smoke_[a-f0-9]+$/.test(url) && failCreation) return Response.json({}, { status: 409 })
    if (options.method === 'PUT' && /nandos_smoke_[a-f0-9]+$/.test(url) && unconfirmedCreation) return Response.json({ result: false })
    if (options.method === 'DELETE' && failCleanup) return Response.json({}, { status: 500 })
    return Response.json({ result: true, status: 'ok' })
  }
  return { calls, fetchImpl }
}

test('generates real-shaped embeddings, checks three Spanish searches and cleans only its temporary collection', async () => {
  const { calls, fetchImpl } = mockServices()
  const result = await verifyLocalAi({ secrets, fetchImpl, createId: () => testId })
  assert.equal(result.dimensions, 1024)
  assert.equal(result.searches, 3)
  assert.ok(calls.every(({ url }) => url.startsWith('http://127.0.0.1:')))
  const request = JSON.parse(calls.find(({ url }) => url.endsWith('/v1/embeddings')).options.body)
  assert.equal(request.model, 'nandos-embeddings')
  assert.ok(request.input[3].startsWith('Instruct:'))
  assert.ok(!request.input[0].startsWith('Instruct:'))
  const deleted = calls.filter(({ options }) => options.method === 'DELETE')
  assert.equal(deleted.length, 1)
  assert.ok(deleted[0].url.endsWith('/collections/nandos_smoke_7d4f546f0e7e463eb37b53c8dd7b1509'))
})

test('rejects wrong dimensions before writing anything to Qdrant', async () => {
  const { calls, fetchImpl } = mockServices({ invalidVector: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /vector/)
  assert.ok(!calls.some(({ options }) => options.method === 'PUT' || options.method === 'DELETE'))
})

test('cleans its own collection even if semantic retrieval fails', async () => {
  const { calls, fetchImpl } = mockServices({ wrongResult: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /recuperación/)
  assert.equal(calls.filter(({ options }) => options.method === 'DELETE').length, 1)
})

test('never deletes a pre-existing or failed-to-create collection', async () => {
  const { calls, fetchImpl } = mockServices({ failCreation: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /409/)
  assert.ok(!calls.some(({ options }) => options.method === 'DELETE'))
})

test('fails closed if the local gateway accepts unauthenticated requests', async () => {
  const { calls, fetchImpl } = mockServices({ openGateway: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /autenticación/)
  assert.ok(!calls.some(({ url }) => url.endsWith('/v1/embeddings')))
})

test('does not clean a collection unless creation was explicitly confirmed', async () => {
  const { calls, fetchImpl } = mockServices({ unconfirmedCreation: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /no confirmó/)
  assert.ok(!calls.some(({ options }) => options.method === 'DELETE'))
})

test('reports failed cleanup without deleting anything else', async () => {
  const { calls, fetchImpl } = mockServices({ failCleanup: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), /No se pudo limpiar la colección temporal nandos_smoke_/)
  assert.equal(calls.filter(({ options }) => options.method === 'DELETE').length, 1)
})

test('does not disclose malformed upstream response bodies', async () => {
  const { fetchImpl } = mockServices({ invalidJson: true })
  await assert.rejects(verifyLocalAi({ secrets, fetchImpl, createId: () => testId }), (error) => {
    assert.match(error.message, /JSON no válida/)
    assert.ok(!error.message.includes('PRIVATE_RESPONSE'))
    return true
  })
})
