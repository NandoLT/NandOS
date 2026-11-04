import { buildCorpus, embeddingProfile, KnowledgeError } from '../domain/corpus.js'
import type { Embeddings, KnowledgeIndex, PublishedWikiSource } from './ports.js'

export function createKnowledgeService(source: PublishedWikiSource, embeddings: Embeddings, index: KnowledgeIndex,
  progress: (completed: number, total: number) => void = () => {}) {
  return {
    async plan() {
      const corpus = buildCorpus(await source.published())
      return { articles: corpus.articles, chunks: corpus.chunks.length, profile: embeddingProfile.id, fingerprint: corpus.fingerprint }
    },
    async status() {
      const corpus = buildCorpus(await source.published())
      const active = await index.current()
      return { active, publishedArticles: corpus.articles, expectedChunks: corpus.chunks.length,
        synchronized: active?.fingerprint === corpus.fingerprint && active.profile === embeddingProfile.id }
    },
    async ingest() {
      const corpus = buildCorpus(await source.published())
      const metadata = { fingerprint: corpus.fingerprint, profile: embeddingProfile.id,
        articles: corpus.articles, chunks: corpus.chunks.length }
      const active = await index.current()
      if (active?.fingerprint === corpus.fingerprint && active.profile === embeddingProfile.id)
        return { status: 'unchanged' as const, ...metadata }
      const candidate = await index.create(metadata)
      try {
        for (let offset = 0; offset < corpus.chunks.length; offset += 4) {
          const batch = corpus.chunks.slice(offset, offset + 4)
          const vectors = await embeddings.embed(batch.map((chunk) => chunk.embeddingText))
          await index.write(candidate, batch.map((chunk, i) => ({ id: chunk.id, vector: vectors[i], chunk })))
          progress(Math.min(offset + batch.length, corpus.chunks.length), corpus.chunks.length)
        }
        // A publication/withdrawal while embeddings were running invalidates the
        // candidate. Never publish a known-obsolete snapshot.
        if (buildCorpus(await source.published()).fingerprint !== corpus.fingerprint)
          throw new KnowledgeError('La wiki publicada cambió durante la ingesta. Repite la operación.')
        await index.activate(candidate, active?.collection ?? null)
        return { status: 'indexed' as const, ...metadata }
      } catch (error) {
        try { await index.discard(candidate) } catch {
          throw new KnowledgeError('Ingesta interrumpida; no se confirmó la limpieza de su colección candidata. Revisa el índice local antes de repetir.')
        }
        throw error
      }
    },
    async search(question: string, limit = 5) {
      const query = question.trim()
      if (!query || query.length > 1000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 10)
        throw new KnowledgeError('Introduce una consulta de 1 a 1000 caracteres y un límite de 1 a 10 resultados.')
      const active = await index.current()
      if (!active || active.profile !== embeddingProfile.id) return []
      const [vector] = await embeddings.embed([embeddingProfile.queryInstruction + query])
      const matches = await index.search(active.collection, vector, limit)
      // Neon remains authoritative even before the next manual synchronization:
      // stale or withdrawn points are never returned. Return trusted source text,
      // not arbitrary Qdrant payloads, ready for future citations in the Help UI.
      const corpus = buildCorpus(await source.published())
      const chunks = new Map(corpus.chunks.map((chunk) => [chunk.id, chunk]))
      const used = new Set<string>()
      return matches.flatMap((match) => {
        const chunk = chunks.get(match.id)
        if (!chunk || used.has(match.id) || !Number.isFinite(match.score)) return []
        used.add(match.id)
        return [{ score: match.score, markdown: chunk.markdown, source: { articleId: chunk.articleId,
          revision: chunk.revision, publishedAt: chunk.publishedAt, title: chunk.title,
          category: chunk.category, headingPath: chunk.headingPath, chunk: chunk.ordinal } }]
      })
    },
  }
}
