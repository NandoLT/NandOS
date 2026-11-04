import { randomBytes } from 'node:crypto'
import { lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

export const envFile = fileURLToPath(new URL('../../infra/ai/.env', import.meta.url))
export const composeFile = fileURLToPath(new URL('../../infra/ai/compose.yaml', import.meta.url))
export const model = Object.freeze({ alias: 'nandos-embeddings', ollama: 'qwen3-embedding:0.6b', dimensions: 1024 })
export const services = Object.freeze({ qdrant: 'http://127.0.0.1:6333', litellm: 'http://127.0.0.1:4000' })

export function readLocalSecrets(file = envFile) {
  let values
  try {
    const stat = lstatSync(file)
    if (!stat.isFile() || (stat.mode & 0o777) !== 0o600) throw new Error('permissions')
    values = parseEnv(readFileSync(file, 'utf8'))
  } catch {
    throw new Error('Configura infra/ai/.env con pnpm ai:init; debe ser un archivo privado con permisos 600.')
  }
  const qdrantKey = values.QDRANT_API_KEY
  const litellmKey = values.LITELLM_MASTER_KEY
  if (![qdrantKey, litellmKey].every((value) => typeof value === 'string' && /^[A-Za-z0-9_-]{32,}$/.test(value)) || qdrantKey === litellmKey) {
    throw new Error('Faltan claves locales válidas y distintas en infra/ai/.env. No pegues sus valores en el chat.')
  }
  return { qdrantKey, litellmKey }
}

export function initLocalEnvironment(file = envFile) {
  try {
    writeFileSync(file, `# Claves exclusivas del laboratorio local; no compartir ni versionar.\nQDRANT_API_KEY=${randomBytes(32).toString('hex')}\nLITELLM_MASTER_KEY=sk-${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 })
    return true
  } catch (error) {
    if (error.code !== 'EEXIST') throw new Error('No se pudo crear la configuración local de IA.')
    readLocalSecrets(file)
    return false
  }
}

export function requireLocalUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('Solo se permiten los servicios locales de IA.') }
  if (!Object.values(services).includes(url.origin) || url.username || url.password) {
    throw new Error('Solo se permiten los servicios locales de IA.')
  }
  return url
}

export function buildDockerCommand(action, useSudo = false) {
  const operations = {
    check: ['config', '--quiet'],
    up: ['up', '-d', '--wait', '--wait-timeout', '180'],
    down: ['down'],
    ps: ['ps'],
    'pull-model': ['exec', '-T', 'ollama', 'ollama', 'pull', model.ollama],
  }
  if (!Object.hasOwn(operations, action)) throw new Error('Acción de infraestructura no admitida.')
  const args = ['--host', 'unix:///var/run/docker.sock', 'compose', '--project-name', 'nandos-ai-local', '--env-file', envFile, '--file', composeFile, ...operations[action]]
  return { command: useSudo ? 'sudo' : 'docker', args: useSudo ? ['docker', ...args] : args }
}
