import { closeSync, lstatSync, openSync, readFileSync, unlinkSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { KnowledgeError, KnowledgeBusyError } from '../domain/corpus.js'

const developmentHost = 'ep-silent-shape-b9eucpov-pooler.c-7.eu-central-1.aws.neon.tech'

export function validateDevelopmentConnection(value: string | undefined): string {
  let valid = false
  try {
    const url = new URL(value ?? '')
    valid = url.protocol === 'postgresql:' && url.hostname === developmentHost && url.pathname === '/neondb' &&
      Boolean(url.username && url.password) && ['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
  } catch { /* Never echo connection strings, including malformed ones. */ }
  if (!valid) throw new KnowledgeError('La conexión no corresponde a Neon development con TLS. Revisa apps/api/.env sin compartir su contenido.')
  return value!
}

function readPrivateEnv(file: string) {
  try {
    const stat = lstatSync(file)
    if (!stat.isFile() || (stat.mode & 0o777) !== 0o600) throw new Error('permissions')
    return parseEnv(readFileSync(file, 'utf8'))
  } catch { throw new KnowledgeError('Falta un archivo de configuración local privado con permisos 600. Revisa apps/api/.env e infra/ai/.env.') }
}

export function loadLocalKnowledgeConfig(apiFile: string, aiFile: string) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new KnowledgeError('Estos comandos solo pueden ejecutarse en desarrollo local.')
  const databaseUrl = validateDevelopmentConnection(readPrivateEnv(apiFile).DATABASE_URL)
  const ai = readPrivateEnv(aiFile)
  const qdrantKey = ai.QDRANT_API_KEY, litellmKey = ai.LITELLM_MASTER_KEY
  if (typeof qdrantKey !== 'string' || typeof litellmKey !== 'string' ||
    !/^[A-Za-z0-9_-]{32,}$/.test(qdrantKey) || !/^[A-Za-z0-9_-]{32,}$/.test(litellmKey) || qdrantKey === litellmKey)
    throw new KnowledgeError('Claves de IA locales ausentes o no válidas. Usa pnpm ai:init; no compartas sus valores.')
  return { databaseUrl, secrets: { qdrantKey, litellmKey } }
}

// Local-only serialization. A future hosted/admin worker will need a distributed
// lock; do not reuse this filesystem lock for Vercel instances.
export async function withIngestionLock<T>(file: string, action: () => Promise<T>): Promise<T> {
  let descriptor: number
  try { descriptor = openSync(file, 'wx', 0o600) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new KnowledgeBusyError('Ya hay una ingesta local en curso o un bloqueo pendiente. No lo retires mientras otro proceso esté trabajando.')
    throw new KnowledgeError('No se pudo crear el bloqueo de ingesta local. Revisa sus permisos sin cambiar los de otros archivos.')
  }
  try { return await action() } finally { closeSync(descriptor); unlinkSync(file) }
}
