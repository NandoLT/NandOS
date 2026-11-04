import { spawnSync } from 'node:child_process'
import { buildDockerCommand, initLocalEnvironment, readLocalSecrets } from './local.mjs'

const [action, ...flags] = process.argv.slice(2)
try {
  if (process.getuid?.() === 0) throw new Error('No ejecutes pnpm o Node con sudo. Usa --sudo únicamente en los comandos Docker de este laboratorio.')
  if (flags.some((flag) => flag !== '--sudo')) throw new Error('Opción no admitida; solo se acepta --sudo para Docker.')
  if (action === 'init') {
    if (flags.length) throw new Error('ai:init no necesita sudo.')
    console.info(initLocalEnvironment() ? 'Claves locales creadas con permisos 600. No se han mostrado ni modificado otras credenciales.' : 'La configuración local ya existe y se conserva sin cambios.')
  } else {
    const secrets = readLocalSecrets()
    const { command, args } = buildDockerCommand(action, flags.includes('--sudo'))
    const env = { ...process.env, QDRANT_API_KEY: secrets.qdrantKey, LITELLM_MASTER_KEY: secrets.litellmKey }
    for (const name of ['DOCKER_CONTEXT', 'DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[name]
    const result = spawnSync(command, args, { stdio: 'inherit', env })
    if (result.error) throw new Error('No se pudo iniciar Docker. Comprueba la instalación y el acceso al servicio en tu terminal.')
    if (result.status !== 0) {
      console.error('La operación Docker no ha terminado correctamente. Si falta permiso, ejecuta este comando con --sudo en tu terminal; no cambies los permisos del socket.')
      process.exitCode = result.status ?? 1
    }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
