import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import handler from './index.js'

test('the deployed entrypoint handles concurrent first requests after Fastify is ready', async () => {
  const previousOrigin = process.env.FRONTEND_ORIGIN
  process.env.FRONTEND_ORIGIN = 'https://nand-os.vercel.app'
  const server = createServer(handler)

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const origin = `http://127.0.0.1:${address.port}`
    const responses = await Promise.all([
      fetch(`${origin}/api/health`),
      fetch(`${origin}/api/health`),
    ])

    for (const response of responses) {
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { status: 'ok' })
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    }

    const missing = await fetch(`${origin}/api/does-not-exist`)
    assert.equal(missing.status, 404)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
    if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN
    else process.env.FRONTEND_ORIGIN = previousOrigin
  }
})
