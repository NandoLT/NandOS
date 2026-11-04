import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createKnowledgeService } from '../application/knowledge-service.js'
import { createWikiSynchronization } from '../application/wiki-synchronization.js'
import type { PublishedWikiSource } from '../application/ports.js'
import { KnowledgeError } from '../domain/corpus.js'
import { loadLocalKnowledgeConfig, withIngestionLock } from './local-config.js'
import { createLocalAiHttp } from './local-ai-http.js'
import { createLiteLlmEmbeddings } from './litellm-embeddings.js'
import { createQdrantIndex } from './qdrant-index.js'

export function isLocalWikiSyncEnabled(environment: Record<string, string | undefined>): boolean {
  return environment.WIKI_LOCAL_AI_ENABLED === 'true' && !environment.VERCEL && environment.NODE_ENV !== 'production'
}

export function createLocalWikiSynchronization(source: PublishedWikiSource) {
  // This gate is before any filesystem read or loopback request. A Vercel
  // deployment must never try to reach the developer's local AI services.
  if (!isLocalWikiSyncEnabled(process.env)) return null
  const config = loadLocalKnowledgeConfig(fileURLToPath(new URL('../../../../.env', import.meta.url)),
    fileURLToPath(new URL('../../../../../../infra/ai/.env', import.meta.url)))
  if (process.env.DATABASE_URL !== config.databaseUrl)
    throw new KnowledgeError('El API y la ingesta no apuntan a la misma conexión development. Reinicia el API con su configuración local.')
  const http = createLocalAiHttp(config.secrets)
  const service = createKnowledgeService(source, createLiteLlmEmbeddings(http), createQdrantIndex(http))
  const lockFile = fileURLToPath(new URL('../../../../../../infra/ai/wiki-ingestion.local', import.meta.url))
  return createWikiSynchronization(service, { runExclusive: (action) => withIngestionLock(lockFile, action), isLocked: () => existsSync(lockFile) })
}
