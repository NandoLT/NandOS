import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { WikiRepository } from './application/wiki-repository.js'
import { createWikiService, WikiError } from './application/wiki-service.js'
import { postgresWikiRepository } from './infrastructure/wiki-repository.js'

interface WikiGuards {
  requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<unknown>
  rejectUntrustedOrigin(request: FastifyRequest, reply: FastifyReply): boolean
}

export async function registerWikiRoutes(app: FastifyInstance, guards: WikiGuards, repository: WikiRepository = postgresWikiRepository) {
  const service = createWikiService(repository)
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
