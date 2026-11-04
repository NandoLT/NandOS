import { fileURLToPath } from 'node:url'
import { createKnowledgeService } from '../src/modules/knowledge/application/knowledge-service.js'
import { KnowledgeError } from '../src/modules/knowledge/domain/corpus.js'
import { createLocalAiHttp } from '../src/modules/knowledge/infrastructure/local-ai-http.js'
import { loadLocalKnowledgeConfig, withIngestionLock } from '../src/modules/knowledge/infrastructure/local-config.js'
import { createLiteLlmEmbeddings } from '../src/modules/knowledge/infrastructure/litellm-embeddings.js'
import { createQdrantIndex } from '../src/modules/knowledge/infrastructure/qdrant-index.js'
import { postgresWikiRepository } from '../src/modules/wiki/infrastructure/wiki-repository.js'

async function main() {
  const [action, ...args] = process.argv.slice(2)
  if (!['ingest', 'status', 'search'].includes(action) ||
    (action === 'ingest' && args.some((arg) => arg !== '--dry-run')) || (action === 'status' && args.length) || (action === 'search' && !args.length))
    throw new KnowledgeError('Uso: pnpm ai:ingest [--dry-run], pnpm ai:index o pnpm ai:search "pregunta".')
  const config = loadLocalKnowledgeConfig(fileURLToPath(new URL('../.env', import.meta.url)),
    fileURLToPath(new URL('../../../infra/ai/.env', import.meta.url)))
  // Explicit private local file, not a pulled production environment or a shell override.
  process.env.DATABASE_URL = config.databaseUrl
  const http = createLocalAiHttp(config.secrets)
  const service = createKnowledgeService(postgresWikiRepository, createLiteLlmEmbeddings(http), createQdrantIndex(http),
    (done, total) => console.info(`Fragmentos indexados: ${done}/${total}`))
  if (action === 'ingest' && args.includes('--dry-run')) {
    console.info(JSON.stringify({ environment: 'development', dryRun: true, ...await service.plan() }, null, 2))
  } else if (action === 'ingest') {
    const result = await withIngestionLock(fileURLToPath(new URL('../../../infra/ai/wiki-ingestion.local', import.meta.url)), () => service.ingest())
    console.info(`${result.status === 'indexed' ? 'Wiki indexada' : 'Índice sin cambios'}: ${result.articles} artículos publicados, ${result.chunks} fragmentos. Solo Qdrant local; Neon en lectura.`)
  } else if (action === 'status') {
    console.info(JSON.stringify({ environment: 'development', ...await service.status() }, null, 2))
  } else {
    const results = await service.search(args.join(' '))
    console.info(JSON.stringify({ environment: 'development', results }, null, 2))
  }
}

try { await main() } catch (error) {
  // Never serialize errors from Neon/providers: they may embed SQL, URLs or keys.
  console.error(error instanceof KnowledgeError ? error.message : 'No se pudo completar la operación local. Comprueba Neon development y los servicios de IA sin compartir credenciales.')
  process.exitCode = 1
}
