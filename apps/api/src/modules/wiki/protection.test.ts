import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from '../../app-factory.js'

test('real application protects wiki administration before accessing Neon', async () => {
  const app = await createApp()
  try {
    const response = await app.inject('/api/admin/wiki/articles')
    assert.equal(response.statusCode, 401)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    const denied = await app.inject({ method: 'POST', url: '/api/admin/wiki/seed', headers: { origin: 'https://untrusted.test' } })
    assert.equal(denied.statusCode, 403)
  } finally { await app.close() }
})
