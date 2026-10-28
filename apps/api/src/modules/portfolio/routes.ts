import type { FastifyInstance } from 'fastify'
import { getPublishedPortfolio } from './infrastructure/portfolio-repository.js'

export async function registerPortfolioRoutes(app: FastifyInstance) {
  app.get('/api/portfolio', async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=120')
    return { content: await getPublishedPortfolio() }
  })
}
