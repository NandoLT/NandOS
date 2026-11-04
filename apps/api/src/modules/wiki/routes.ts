import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { WikiRepository } from './application/wiki-repository.js'
import { createWikiService, WikiError } from './application/wiki-service.js'
import { postgresWikiRepository } from './infrastructure/wiki-repository.js'
import type { WikiSynchronizationStatus } from '@nandoos/contracts'
import type { WikiSynchronization } from '../knowledge/application/wiki-synchronization.js'
import { createLocalWikiSynchronization } from '../knowledge/infrastructure/local-synchronization.js'
import { KnowledgeBusyError } from '../knowledge/domain/corpus.js'

interface WikiGuards {
  requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<unknown>
  rejectUntrustedOrigin(request: FastifyRequest, reply: FastifyReply): boolean
}

export async function registerWikiRoutes(app: FastifyInstance, guards: WikiGuards, repository: WikiRepository = postgresWikiRepository,
  synchronizationFactory: () => WikiSynchronization | null = () => createLocalWikiSynchronization(repository)) {
  const service = createWikiService(repository)
  let synchronization: WikiSynchronization | null | undefined
  function getSynchronization() {
    if (synchronization === undefined) synchronization = synchronizationFactory()
    return synchronization
  }
  async function authorize(request: FastifyRequest, reply: FastifyReply, write = false) {
    reply.header('cache-control', 'private, no-store')
    if (write && guards.rejectUntrustedOrigin(request, reply)) return false
    return Boolean(await guards.requireAdmin(request, reply))
  }
  async function execute<T>(reply: FastifyReply, action: () => Promise<T>) {
    try { return await action() } catch (error) {
      if (error instanceof WikiError) return reply.code(error.statusCode).send({ error: error.message })
      throw error
    }
  }
  app.get('/api/admin/wiki/synchronization', async (request, reply): Promise<WikiSynchronizationStatus | undefined> => {
    if (!(await authorize(request, reply))) return
    try {
      const sync = getSynchronization()
      return sync ? await sync.status() : { state: 'not-configured', publishedArticles: null, indexedArticles: null, indexedChunks: null,
        message: 'La sincronización no está configurada en este entorno. La IA local solo se habilita en development.' }
    } catch {
      // Never pass Neon/provider errors to the global logger: they may contain
      // connection strings, SQL or credentials. An unknown state is not updated.
      return { state: 'error', publishedArticles: null, indexedArticles: null, indexedChunks: null,
        message: 'No se pudo comprobar el índice. Revisa la conexión de development y los servicios locales de IA.' }
    }
  })
  app.post('/api/admin/wiki/synchronization', async (request, reply) => {
    if (!(await authorize(request, reply, true))) return
    try {
      const sync = getSynchronization()
      if (!sync) return reply.code(503).send({ error: 'La sincronización no está configurada en este entorno.' })
      return await sync.synchronize()
    } catch (error) {
      if (error instanceof KnowledgeBusyError) return reply.code(409).send({ error: 'Ya hay una sincronización en curso o un bloqueo local pendiente.' })
      return reply.code(503).send({ error: 'No se pudo confirmar la sincronización. Comprueba su estado y la conexión de development con la IA local.' })
    }
  })
  app.get('/api/wiki/articles', async (_request, reply) => {
    reply.header('cache-control', 'no-store')
    return { articles: await service.published() }
  })
  app.get('/api/admin/wiki/articles', async (request, reply) => {
    if (!(await authorize(request, reply))) return
    return { articles: await service.list() }
  })
  app.post('/api/admin/wiki/articles', async (request, reply) => {
    if (!(await authorize(request, reply, true))) return
    return execute(reply, async () => reply.code(201).send({ article: await service.create(request.body) }))
  })
  app.post('/api/admin/wiki/seed', async (request, reply) => {
    if (!(await authorize(request, reply, true))) return
    return { created: await service.seed() }
  })
  for (const action of ['save', 'publish', 'withdraw'] as const) {
    const path = `/api/admin/wiki/articles/:id${action === 'save' ? '' : `/${action}`}`
    app.route<{ Params: { id: string }; Body: unknown }>({ method: action === 'save' ? 'PUT' : 'POST', url: path,
      handler: async (request, reply) => {
        if (!(await authorize(request, reply, true))) return
        return execute(reply, async () => ({ article: await service.change(request.params.id, request.body, action) }))
      },
    })
  }
}
