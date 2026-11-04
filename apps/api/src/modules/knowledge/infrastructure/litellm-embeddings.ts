import type { Embeddings } from '../application/ports.js'
import { embeddingProfile, KnowledgeError } from '../domain/corpus.js'
import { validateVectors, type LocalAiHttp } from './local-ai-http.js'

export function createLiteLlmEmbeddings(http: LocalAiHttp): Embeddings {
  return { async embed(texts) {
    if (!texts.length) return []
    if (texts.some((text) => !text.trim() || Buffer.byteLength(text) > 6000))
      throw new KnowledgeError('El fragmento supera el límite seguro de contexto del modelo local.')
    const result = await http('litellm', '/v1/embeddings', 'POST', {
      model: embeddingProfile.model, input: texts, encoding_format: 'float',
    }) as { data?: { index: number; embedding: unknown }[] } | null
    if (!Array.isArray(result?.data) || result.data.length !== texts.length)
      throw new KnowledgeError('LiteLLM devolvió una respuesta de embeddings incompleta.')
    const vectors: unknown[] = Array.from({ length: texts.length })
    for (const item of result.data) {
      if (!item || !Number.isInteger(item.index) || item.index < 0 || item.index >= texts.length || vectors[item.index] !== undefined)
        throw new KnowledgeError('LiteLLM devolvió índices de embeddings no válidos.')
      vectors[item.index] = item.embedding
    }
    validateVectors(vectors, texts.length)
    return vectors
  } }
}
