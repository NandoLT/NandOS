const excludedRequestHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'transfer-encoding',
])

const excludedResponseHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'transfer-encoding',
])

export default async function handler(request, response) {
  const configuredOrigin = process.env.NANDOS_API_ORIGIN
  if (!configuredOrigin) {
    response.status(503).json({ error: 'El servidor de administración aún no está conectado.' })
    return
  }

  let apiOrigin
  try {
    apiOrigin = new URL(configuredOrigin)
    if (apiOrigin.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      response.status(503).json({ error: 'El API debe usar una conexión HTTPS.' })
      return
    }
  } catch {
    response.status(503).json({ error: 'La dirección del API no es válida.' })
    return
  }

  const upstreamUrl = new URL(request.url ?? '/api', apiOrigin)
  if (upstreamUrl.origin !== apiOrigin.origin || !upstreamUrl.pathname.startsWith('/api/')) {
    response.status(400).json({ error: 'Ruta del API no válida.' })
    return
  }

  const headers = new Headers()
  for (const [name, rawValue] of Object.entries(request.headers)) {
    if (excludedRequestHeaders.has(name.toLowerCase()) || rawValue === undefined) continue
    headers.set(name, Array.isArray(rawValue) ? rawValue.join(', ') : rawValue)
  }
  headers.delete('accept-encoding')

  const method = request.method ?? 'GET'
  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : request,
      duplex: 'half',
      redirect: 'manual',
    })

    for (const [name, value] of upstream.headers) {
      const normalizedName = name.toLowerCase()
      if (normalizedName === 'set-cookie' || excludedResponseHeaders.has(normalizedName)) continue
      response.setHeader(name, value)
    }
    const cookies = upstream.headers.getSetCookie?.() ?? []
    if (cookies.length > 0) response.setHeader('set-cookie', cookies)

    response.statusCode = upstream.status
    if (method === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
      response.end()
      return
    }
    response.end(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    response.status(502).json({ error: 'No se pudo conectar con el servicio de administración.' })
  }
}
