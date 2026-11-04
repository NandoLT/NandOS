import { randomUUID } from 'node:crypto'
import type { KnowledgeIndex, Snapshot, SnapshotMetadata } from '../application/ports.js'
import { embeddingProfile, KnowledgeError } from '../domain/corpus.js'
import { validateVectors, type LocalAiHttp } from './local-ai-http.js'

export const wikiAlias = 'nandos_wiki_development'
const manifestId = '00000000-0000-8000-8000-000000000000'
const ownedName = /^nandos_wiki_dev_[a-f0-9]{32}$/
type Alias = { alias_name: string; collection_name: string }

function metadata(value: unknown): SnapshotMetadata {
  const m = value as SnapshotMetadata | null
  if (!m || m.profile !== embeddingProfile.id || !/^[a-f0-9]{64}$/.test(m.fingerprint) ||
    !Number.isSafeInteger(m.articles) || m.articles < 0 || !Number.isSafeInteger(m.chunks) || m.chunks < 0)
    throw new KnowledgeError('El manifiesto del índice local no es compatible; no se modificó ninguna colección existente.')
  return { fingerprint: m.fingerprint, profile: m.profile, articles: m.articles, chunks: m.chunks }
}

export function createQdrantIndex(http: LocalAiHttp, newId: () => string = randomUUID): KnowledgeIndex {
  // Ownership is granted only after a confirmed creation in this invocation.
  const candidates = new Map<string, SnapshotMetadata>()
  async function aliases(): Promise<Alias[]> {
    const result = await http('qdrant', '/aliases') as { result?: { aliases?: Alias[] } } | null
    if (!Array.isArray(result?.result?.aliases) || result.result.aliases.some((entry) =>
      typeof entry?.alias_name !== 'string' || typeof entry.collection_name !== 'string')) throw new KnowledgeError('Lista de alias local no válida.')
    return result.result.aliases
  }
  function path(collection: string) {
    if (!ownedName.test(collection)) throw new KnowledgeError('Colección ajena al índice development; operación cancelada.')
    return `/collections/${collection}`
  }
  async function count(collection: string) {
    const value = await http('qdrant', `${path(collection)}/points/count`, 'POST', { exact: true }) as { result?: { count?: number } } | null
    return value?.result?.count
  }
  return {
    async current() {
      const target = (await aliases()).find((entry) => entry.alias_name === wikiAlias)?.collection_name
      if (!target) return null
      const base = path(target)
      const info = await http('qdrant', base) as { result?: { config?: { params?: { vectors?: { size?: number; distance?: string } } } } } | null
      const vectors = info?.result?.config?.params?.vectors
      if (vectors?.size !== embeddingProfile.dimensions || vectors.distance !== 'Cosine') throw new KnowledgeError('El índice local usa otro espacio vectorial.')
      const result = await http('qdrant', `${base}/points`, 'POST', { ids: [manifestId], with_payload: true, with_vector: false }) as
        { result?: { payload?: Record<string, unknown> }[] } | null
      const payload = result?.result?.[0]?.payload
      if (payload?.kind !== 'manifest' || payload.environment !== 'development' || payload.schema !== 1)
        throw new KnowledgeError('No se encontró un manifiesto propio de development.')
      const snapshot = metadata(payload)
      if (await count(target) !== snapshot.chunks + 1) throw new KnowledgeError('El índice local está incompleto; no se reutilizará automáticamente.')
      return { ...snapshot, collection: target } satisfies Snapshot
    },
    async create(value) {
      const snapshot = metadata(value)
      const id = newId().replaceAll('-', '').toLowerCase()
      const collection = `nandos_wiki_dev_${id}`
      const result = await http('qdrant', path(collection), 'PUT', { vectors: { size: embeddingProfile.dimensions, distance: 'Cosine' } }) as { result?: unknown } | null
      if (result?.result !== true) throw new KnowledgeError('No se confirmó la creación del índice candidato; no se eliminará una colección de origen incierto.')
      candidates.set(collection, snapshot)
      return collection
    },
    async write(collection, points) {
      if (!candidates.has(collection)) throw new KnowledgeError('Solo se puede escribir en un índice candidato propio.')
      validateVectors(points.map((point) => point.vector), points.length)
      const result = await http('qdrant', `${path(collection)}/points?wait=true`, 'PUT', { points: points.map(({ id, vector, chunk }) => ({
        id, vector, payload: { kind: 'chunk', environment: 'development', profile: embeddingProfile.id,
          articleId: chunk.articleId, revision: chunk.revision, publishedAt: chunk.publishedAt,
          title: chunk.title, category: chunk.category, headingPath: chunk.headingPath,
          ordinal: chunk.ordinal, markdown: chunk.markdown },
      })) }) as { result?: { status?: string } } | null
      if (result?.result?.status !== 'completed') throw new KnowledgeError('Qdrant no confirmó la escritura de los fragmentos.')
    },
    async activate(collection, previous) {
      const snapshot = candidates.get(collection)
      if (!snapshot) throw new KnowledgeError('El índice candidato no pertenece a esta ingesta.')
      const list = await aliases()
      if ((list.find((entry) => entry.alias_name === wikiAlias)?.collection_name ?? null) !== previous)
        throw new KnowledgeError('Otra ingesta cambió el índice activo; repite la operación.')
      if (await count(collection) !== snapshot.chunks) throw new KnowledgeError('El candidato no contiene todos los fragmentos esperados.')
      const vector = Array.from({ length: embeddingProfile.dimensions }, (_, i) => i === 0 ? 1 : 0)
      const written = await http('qdrant', `${path(collection)}/points?wait=true`, 'PUT', { points: [{ id: manifestId, vector,
        payload: { kind: 'manifest', schema: 1, environment: 'development', ...snapshot } }] }) as { result?: { status?: string } } | null
      if (written?.result?.status !== 'completed') throw new KnowledgeError('No se confirmó el manifiesto del candidato.')
      const actions: unknown[] = previous ? [{ delete_alias: { alias_name: wikiAlias } }] : []
      actions.push({ create_alias: { collection_name: collection, alias_name: wikiAlias } })
      const promoted = await http('qdrant', '/collections/aliases', 'POST', { actions }) as { result?: unknown } | null
      if (promoted?.result !== true) throw new KnowledgeError('Qdrant no confirmó la activación del índice.')
      candidates.delete(collection)
      // Previous complete snapshots are retained for manual recovery, not deleted.
    },
    async discard(collection) {
      if (!candidates.has(collection)) throw new KnowledgeError('No se permite eliminar colecciones ajenas.')
      // A timeout may hide a successful alias switch: never delete anything that
      // any alias references, including after an ambiguous activation response.
      if ((await aliases()).some((entry) => entry.collection_name === collection)) return
      const result = await http('qdrant', path(collection), 'DELETE') as { result?: unknown } | null
      if (result?.result !== true) throw new KnowledgeError('No se confirmó la limpieza de la colección candidata.')
      candidates.delete(collection)
    },
    async search(collection, vector, limit) {
      validateVectors([vector], 1)
      const result = await http('qdrant', `${path(collection)}/points/query`, 'POST', { query: vector, limit,
        filter: { must: [{ key: 'kind', match: { value: 'chunk' } }, { key: 'profile', match: { value: embeddingProfile.id } }] },
        with_payload: false, with_vector: false }) as { result?: { points?: { id: string; score: number }[] } } | null
      if (!Array.isArray(result?.result?.points) || result.result.points.some((p) => typeof p?.id !== 'string' || !Number.isFinite(p.score)))
        throw new KnowledgeError('Qdrant devolvió resultados de búsqueda no válidos.')
      return result.result.points.map(({ id, score }) => ({ id, score }))
    },
  }
}
