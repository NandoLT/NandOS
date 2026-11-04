import { afterEach, expect, it, vi } from 'vitest'
import { wikiApi } from './wiki-api'

afterEach(() => { vi.unstubAllGlobals() })

it('uses the same-origin authenticated admin endpoint without client secrets or user-supplied destinations', async () => {
  const status = { state: 'updated', publishedArticles: 3, indexedArticles: 3, indexedChunks: 3 }
  const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(status), { status: 200 }))
  vi.stubGlobal('fetch', request)
  expect(await wikiApi.synchronization!.status()).toEqual(status)
  expect(await wikiApi.synchronization!.synchronize()).toEqual(status)
  expect(request).toHaveBeenNthCalledWith(1, '/api/admin/wiki/synchronization', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  expect(request).toHaveBeenNthCalledWith(2, '/api/admin/wiki/synchronization', expect.objectContaining({ credentials: 'include', method: 'POST' }))
  for (const [, init] of request.mock.calls) {
    expect(init?.body).toBeUndefined()
    expect(init?.headers).toEqual({})
  }
})
