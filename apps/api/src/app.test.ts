import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Writable } from 'node:stream'
import Fastify from 'fastify'
import { configureApp, createApp, fastifyOptions } from './app-factory.js'

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

test('requires HTTPS for production administration and keeps credential data out of logs and errors', async () => {
  const original = { NODE_ENV: process.env.NODE_ENV, FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN }
  process.env.NODE_ENV = 'production'
  process.env.FRONTEND_ORIGIN = 'https://portfolio.example'
  const logs: string[] = []
  const stream = new Writable({ write(chunk, _encoding, next) { logs.push(String(chunk)); next() } })
  const options = typeof fastifyOptions.logger === 'object' ? fastifyOptions.logger : {}
  const app = Fastify({ ...fastifyOptions, trustProxy: (_address, hop) => hop === 0, logger: { ...options, stream, level: 'info' } })
  try {
    await configureApp(app)
    const insecure = await app.inject({
      method: 'POST', url: '/api/auth/login?token=probe-query-secret',
      headers: { origin: process.env.FRONTEND_ORIGIN, 'x-forwarded-proto': 'http' },
      payload: { username: 'demo', password: 'probe-body-secret' },
    })
    assert.equal(insecure.statusCode, 403)
    assert.equal(insecure.headers['cache-control'], 'private, no-store')
    const malformed = await app.inject({
      method: 'POST', url: '/api/auth/login',
      headers: {
        origin: process.env.FRONTEND_ORIGIN, 'x-forwarded-proto': 'https', 'content-type': 'application/json',
        cookie: 'nandos_admin_session=probe-cookie-secret', authorization: 'Bearer probe-header-secret',
      },
      payload: '{"password": "probe-parser-secret"',
    })
    assert.equal(malformed.statusCode, 400)
    assert.deepEqual(malformed.json(), { error: 'Solicitud no válida.' })
    assert.doesNotMatch(logs.join('') + malformed.body, /probe-.*-secret/)
  } finally {
    await app.close()
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
