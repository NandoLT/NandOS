import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/proxy.js'

function createResponse() {
  const response = {
    statusCode: 200,
    headers: new Map(),
    setHeader: vi.fn((name, value) => response.headers.set(name, value)),
    end: vi.fn(),
    status: vi.fn((status) => { response.statusCode = status; return response }),
    json: vi.fn(),
  }
  return response
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Vercel API proxy', () => {
  it.each([
    ['/api/proxy?__nandos_path=health', undefined, '/api/health'],
    ['/api/proxy?__nandos_path=auth%2Fbootstrap-status&lang=es', undefined, '/api/auth/bootstrap-status?lang=es'],
    ['/api/auth/session?lang=es', { __nandos_path: 'auth/session' }, '/api/auth/session?lang=es'],
    ['/api/proxy?__nandos_path=admin%2Fcontent%2Fdraft', undefined, '/api/admin/content/draft'],
  ])('forwards the complete nested API path for %s', async (url, query, expected) => {
    vi.stubEnv('NANDOS_API_ORIGIN', 'https://nandos-api.vercel.app')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const response = createResponse()

    await handler({ url, query, method: 'GET', headers: {} }, response)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0].href).toBe(`https://nandos-api.vercel.app${expected}`)
    expect(response.statusCode).toBe(200)
    expect(response.end).toHaveBeenCalledOnce()
  })

  it('preserves authentication request bodies, origins and session cookies', async () => {
    vi.stubEnv('NANDOS_API_ORIGIN', 'https://nandos-api.vercel.app')
    const cookie = 'nandos_admin_session=test-session; Path=/; HttpOnly; Secure; SameSite=None'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"authenticated":true}', {
      headers: { 'set-cookie': cookie },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const request = {
      url: '/api/proxy?__nandos_path=auth%2Flogin',
      method: 'POST',
      headers: { origin: 'https://nand-os.vercel.app', 'content-type': 'application/json' },
    }
    const response = createResponse()

    await handler(request, response)

    const options = fetchMock.mock.calls[0][1]
    expect(options.method).toBe('POST')
    expect(options.body).toBe(request)
    expect(options.headers.get('origin')).toBe('https://nand-os.vercel.app')
    expect(response.headers.get('set-cookie')).toEqual([cookie])
  })

  it('rejects rewritten paths that escape the API prefix', async () => {
    vi.stubEnv('NANDOS_API_ORIGIN', 'https://nandos-api.vercel.app')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = createResponse()

    await handler({ url: '/api/proxy?__nandos_path=..%2Fprivate', headers: {} }, response)

    expect(response.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
