import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerAdminRoutes } from './modules/admin/routes.js'
import { registerPortfolioRoutes } from './modules/portfolio/routes.js'

export const fastifyOptions: Fastify.FastifyServerOptions = {
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    serializers: {
      req: (request: Fastify.FastifyRequest) => ({ method: request.method, url: request.url.split('?')[0] }),
    },
    redact: {
      paths: [
        'req.headers.cookie', 'req.headers.authorization', 'req.headers["x-admin-bootstrap-key"]',
        'res.headers["set-cookie"]', 'headers.cookie', 'headers.authorization', 'headers["set-cookie"]',
        'headers["x-admin-bootstrap-key"]',
        ...['password', 'currentPassword', 'newPassword', 'passwordHash', 'token', 'tokenHash', 'bootstrapKey']
          .flatMap((key) => [key, 'body.' + key, 'req.body.' + key]),
      ],
      remove: true,
    },
  },
  trustProxy: process.env.VERCEL === '1' ? (_address, hop) => hop === 0 : false,
  bodyLimit: 4 * 1024 * 1024 + 64 * 1024,
}

function isAdminRequest(url: string) {
  const path = url.split('?')[0]
  return path.startsWith('/api/auth/') || path.startsWith('/api/admin/')
}

export async function configureApp(app: FastifyInstance) {
  const production = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? (production ? undefined : 'http://localhost:5173')
  if (!frontendOrigin || (production && new URL(frontendOrigin).protocol !== 'https:')) {
    throw new Error('FRONTEND_ORIGIN must be configured with HTTPS for production.')
  }

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

  app.addHook('onRequest', async (request, reply) => {
    if (!isAdminRequest(request.url)) return
    reply.header('cache-control', 'private, no-store')
    if (production && request.protocol !== 'https') {
      return reply.code(403).send({ error: 'La administración requiere una conexión HTTPS.' })
    }
  })

  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'same-origin')
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  })

  app.setErrorHandler((error, request, reply) => {
    const candidateStatus = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : undefined
    const statusCode = candidateStatus && candidateStatus >= 400 && candidateStatus < 500
      ? candidateStatus
      : 500
    const privateRoute = isAdminRequest(request.url)
    if (privateRoute) request.log.error({ statusCode }, 'Administration request failed')
    else request.log.error({ err: error }, 'API request failed')
    const message = statusCode === 500
      ? 'Ha ocurrido un error interno.'
      : !privateRoute && error instanceof Error ? error.message : 'Solicitud no válida.'
    return reply.code(statusCode).send({ error: message })
  })

  app.get('/api/health', async () => ({ status: 'ok' }))
  await registerPortfolioRoutes(app)
  await registerAdminRoutes(app)

  return app
}

export async function createApp() {
  return configureApp(Fastify(fastifyOptions))
}
