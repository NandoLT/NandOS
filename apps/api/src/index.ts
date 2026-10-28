import 'dotenv/config'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pathToFileURL } from 'node:url'
import Fastify from 'fastify'
import { configureApp, fastifyOptions } from './app-factory.js'

const app = Fastify(fastifyOptions)
let initialization: Promise<void> | undefined

function initialize() {
  initialization ??= configureApp(app).then(async () => {
    await app.ready()
    app.log.info('NandOS API ready.')
  })
  return initialization
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    await initialize()
    app.server.emit('request', request, response)
  } catch (error) {
    app.log.error({ err: error }, 'NandOS API initialization failed.')
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined)
      return
    }
    response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ error: 'Ha ocurrido un error interno.' }))
  }
}

const launchedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (process.env.VERCEL !== '1' && launchedDirectly) {
  const port = Number(process.env.PORT ?? 3001)
  void initialize()
    .then(() => app.listen({ port, host: '0.0.0.0' }))
    .catch((error: unknown) => {
      app.log.error({ err: error }, 'NandOS API startup failed.')
      process.exitCode = 1
    })
}
