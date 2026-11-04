import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('.', import.meta.url))
const root = fileURLToPath(new URL('../../', import.meta.url))
const result = spawnSync('pnpm', ['--filter', '@nandoos/api', 'exec', 'oxlint', '--deny-warnings', directory], { cwd: root, stdio: 'inherit' })
if (result.error) console.error('No se pudo ejecutar el control de calidad de la infraestructura de IA.')
process.exitCode = result.status ?? 1
