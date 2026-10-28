import 'dotenv/config'
import { createApp } from './app-factory.js'

const app = await createApp()
const port = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
