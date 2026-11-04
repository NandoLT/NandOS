import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { model, readLocalSecrets, requireLocalUrl, services } from './local.mjs'

const documents = [
  { id: 'cv', text: 'Para descargar el currículum de Fernando, abre el documento CV_Fernando_Lopez del escritorio. El CV también está disponible desde Documentos en el menú Start.' },
  { id: 'contact', text: 'Para contactar con Fernando, abre Contacto desde el escritorio o el menú Start. Allí encontrarás su correo electrónico, teléfono y enlaces profesionales.' },
  { id: 'themes', text: 'Para cambiar los colores y el tema del escritorio, abre Start, Configuración y Apariencia. Puedes elegir Classic 95 o Modern Desktop.' },
]
const questions = ['¿Dónde puedo descargar el currículum?', '¿Cómo puedo ponerme en contacto con Fernando?', '¿Cómo cambio el tema y los colores del escritorio?']

export async function verifyLocalAi({ secrets, fetchImpl = fetch, createId = randomUUID }) {
  const id = createId()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Identificador de prueba no válido.')
  const collection = `nandos_smoke_${id.replaceAll('-', '').toLowerCase()}`
  const collectionUrl = `${services.qdrant}/collections/${collection}`
  const qdrantHeaders = { 'api-key': secrets.qdrantKey, 'content-type': 'application/json' }
  const litellmHeaders = { authorization: `Bearer ${secrets.litellmKey}`, 'content-type': 'application/json' }

  async function request(url, options = {}) {
    requireLocalUrl(url)
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(180_000), ...options })
    if (!response.ok) throw new Error(`El servicio local devolvió HTTP ${response.status}; revisa su estado sin compartir claves ni logs privados.`)
    try { return await response.json() } catch { throw new Error('El servicio local devolvió una respuesta JSON no válida.') }
  }

  for (const url of [`${services.qdrant}/collections`, `${services.litellm}/v1/models`]) {
    requireLocalUrl(url)
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) })
    if (![401, 403].includes(response.status)) throw new Error('Verificación cancelada: el servicio local no exige autenticación.')
  }
  await request(`${services.qdrant}/collections`, { headers: qdrantHeaders })
  const available = await request(`${services.litellm}/v1/models`, { headers: litellmHeaders })
  if (!available.data?.some((entry) => entry.id === model.alias)) throw new Error('El gateway local no ofrece nandos-embeddings.')

  const input = [...documents.map((document) => document.text), ...questions.map((question) => `Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ${question}`)]
  const result = await request(`${services.litellm}/v1/embeddings`, {
    method: 'POST', headers: litellmHeaders, body: JSON.stringify({ model: model.alias, input, encoding_format: 'float' }),
  })
  const embeddings = Array.from({ length: input.length })
  if (!Array.isArray(result.data) || result.data.length !== input.length) throw new Error('Respuesta de embeddings incompleta.')
  for (const item of result.data) {
    const vector = item.embedding
    if (!Number.isInteger(item.index) || item.index < 0 || item.index >= input.length || embeddings[item.index] ||
      !Array.isArray(vector) || vector.length !== model.dimensions || !vector.every(Number.isFinite) || !vector.some((number) => number !== 0)) {
      throw new Error('El vector recibido no cumple el contrato de 1024 dimensiones finitas.')
    }
    embeddings[item.index] = vector
  }

  let created = false
  let failure
  let cleanupFailure
  try {
    const creation = await request(collectionUrl, { method: 'PUT', headers: qdrantHeaders, body: JSON.stringify({ vectors: { size: model.dimensions, distance: 'Cosine' } }) })
    if (creation.result !== true) throw new Error('Qdrant no confirmó la creación de la colección temporal.')
    created = true
    await request(`${collectionUrl}/points?wait=true`, { method: 'PUT', headers: qdrantHeaders, body: JSON.stringify({
      points: documents.map((document, index) => ({ id: index + 1, vector: embeddings[index], payload: { documentId: document.id, source: 'local-smoke-fixture', text: document.text } })),
    }) })
    for (let index = 0; index < questions.length; index++) {
      const answer = await request(`${collectionUrl}/points/query`, { method: 'POST', headers: qdrantHeaders,
        body: JSON.stringify({ query: embeddings[documents.length + index], limit: 1, with_payload: true }),
      })
      if (answer.result?.points?.[0]?.payload?.documentId !== documents[index].id) throw new Error('La recuperación semántica no encontró el documento esperado.')
    }
  } catch (error) { failure = error } finally {
    if (created) {
      try { await request(collectionUrl, { method: 'DELETE', headers: qdrantHeaders }) } catch {
        cleanupFailure = new Error(`No se pudo limpiar la colección temporal ${collection}. Revisa solo esa colección antes de repetir la prueba.`)
      }
    }
  }
  if (cleanupFailure) throw cleanupFailure
  if (failure) throw failure
  return { dimensions: model.dimensions, searches: questions.length, collectionCleaned: true }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyLocalAi({ secrets: readLocalSecrets() })
    console.info(`IA local verificada: autenticación, vectores de ${result.dimensions} dimensiones y ${result.searches} búsquedas en español. Colección temporal eliminada; wiki y Neon no se han tocado.`)
  } catch (error) {
    // Provider errors can contain prompts or credentials. Never print their body or cause.
    const message = error instanceof TypeError ? 'No se pudo conectar con la IA local. Arranca los servicios y descarga el modelo primero.' : error.message
    console.error(message)
    process.exitCode = 1
  }
}
