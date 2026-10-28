import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from './app-factory.js'

test('serves a health response without opening a database connection', async () => {
  const previousOrigin = process.env.FRONTEND_ORIGIN
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
  const app = await createApp()
  try {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { status: 'ok' })
    assert.equal(response.headers['x-content-type-options'], 'nosniff')
  } finally {
    await app.close()
    if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN
    else process.env.FRONTEND_ORIGIN = previousOrigin
  }
})

test('rejects cross-origin account setup before reading database state', async () => {
  const previousOrigin = process.env.FRONTEND_ORIGIN
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
  const app = await createApp()
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      headers: { origin: 'https://attacker.example' },
      payload: { username: 'admin', password: 'long-enough-password' },
    })
    assert.equal(response.statusCode, 403)
  } finally {
    await app.close()
    if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN
    else process.env.FRONTEND_ORIGIN = previousOrigin
  }
})
