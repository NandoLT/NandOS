import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

function createDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not configured.')
  return drizzle(neon(connectionString), { schema })
}

let cachedDatabase: ReturnType<typeof createDatabase> | undefined

export function getDatabase() {
  cachedDatabase ??= createDatabase()
  return cachedDatabase
}
