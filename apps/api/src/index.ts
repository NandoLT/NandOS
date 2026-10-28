import 'dotenv/config'
import Fastify from 'fastify'
import { configureApp, fastifyOptions } from './app-factory.js'

const port = Number(process.env.PORT ?? 3001)
console.info('[NandOS API] Entrypoint loaded.')

try {
  const app = await configureApp(Fastify(fastifyOptions))
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info({ port }, 'NandOS API started.')
} catch (error) {
  console.error('[NandOS API] Startup failed.', error)
  throw error
}
