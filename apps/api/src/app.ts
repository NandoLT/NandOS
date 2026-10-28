import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { registerAdminRoutes } from './modules/admin/routes.js'
import { registerPortfolioRoutes } from './modules/portfolio/routes.js'

export async function createApp() {
  const production = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? (production ? undefined : 'http://localhost:5173')
  if (!frontendOrigin) throw new Error('FRONTEND_ORIGIN must be configured for production.')

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers.x-admin-bootstrap-key'],
    },
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024 + 64 * 1024,
  })

  await app.register(cookie)
  await app.register(cors, {
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-admin-bootstrap-key'],
    maxAge: 600,
  })
  await app.register(multipart, { limits: { fileSize: 4 * 1024 * 1024, files: 1 } })
  await app.register(rateLimit, { global: false })

  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'same-origin')
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'API request failed')
    const candidateStatus = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : undefined
    const statusCode = candidateStatus && candidateStatus >= 400 && candidateStatus < 500
      ? candidateStatus
      : 500
    const message = statusCode === 500
      ? 'Ha ocurrido un error interno.'
      : error instanceof Error ? error.message : 'Solicitud no válida.'
    return reply.code(statusCode).send({ error: message })
  })

  app.get('/api/health', async () => ({ status: 'ok' }))
  await registerPortfolioRoutes(app)
  await registerAdminRoutes(app)

  return app
}
