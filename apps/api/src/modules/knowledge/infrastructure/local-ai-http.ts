import { embeddingProfile, KnowledgeError } from '../domain/corpus.js'

export interface LocalAiSecrets { qdrantKey: string; litellmKey: string }
const origins = { qdrant: 'http://127.0.0.1:6333', litellm: 'http://127.0.0.1:4000' } as const

interface LocalAiResponse { ok: boolean; status: number; json(): Promise<unknown> }

function isLocalAiResponse(value: unknown): value is LocalAiResponse {
  return typeof value === 'object' && value !== null &&
    'ok' in value && typeof value.ok === 'boolean' &&
    'status' in value && typeof value.status === 'number' &&
    'json' in value && typeof value.json === 'function'
}

export function createLocalAiHttp(secrets: LocalAiSecrets, fetchImpl: typeof fetch = fetch) {
  return async (service: keyof typeof origins, path: string, method = 'GET', body?: unknown) => {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new KnowledgeError('Ruta de IA local no válida.')
    const url = new URL(path, origins[service])
    if (url.origin !== origins[service]) throw new KnowledgeError('Solo se permite la IA local.')
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (service === 'qdrant') headers['api-key'] = secrets.qdrantKey
    else headers.authorization = `Bearer ${secrets.litellmKey}`
    let response: unknown
    try {
      response = await fetchImpl(url, { method, headers, redirect: 'error', signal: AbortSignal.timeout(180_000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    } catch { throw new KnowledgeError(`No se pudo conectar con ${service} local; comprueba los contenedores.`) }
    if (!isLocalAiResponse(response)) throw new KnowledgeError(`${service} local devolvió una respuesta HTTP no válida.`)
    if (!response.ok) throw new KnowledgeError(`${service} local devolvió HTTP ${response.status}. No compartas claves ni registros privados.`)
    try { return await response.json() } catch { throw new KnowledgeError(`${service} local devolvió JSON no válido.`) }
  }
}
export type LocalAiHttp = ReturnType<typeof createLocalAiHttp>

export function validateVectors(vectors: unknown, expected: number): asserts vectors is number[][] {
  if (!Array.isArray(vectors) || vectors.length !== expected || vectors.some((vector) => !Array.isArray(vector) ||
    vector.length !== embeddingProfile.dimensions || !vector.every(Number.isFinite) || !vector.some((value) => value !== 0)))
    throw new KnowledgeError('Embeddings incompletos o incompatibles con las 1024 dimensiones del índice.')
}
