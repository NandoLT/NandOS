import 'dotenv/config'
import Fastify from 'fastify'
import { configureApp, fastifyOptions } from './app-factory.js'

const app = await configureApp(Fastify(fastifyOptions))
const port = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
