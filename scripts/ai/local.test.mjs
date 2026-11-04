import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildDockerCommand, initLocalEnvironment, readLocalSecrets, requireLocalUrl } from './local.mjs'

test('creates private, independent local keys and never replaces them on repeated setup', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nandos-ai-test-'))
  const file = join(directory, '.env')
  try {
    assert.equal(initLocalEnvironment(file), true)
    const original = readFileSync(file, 'utf8')
    const secrets = readLocalSecrets(file)
    assert.notEqual(secrets.qdrantKey, secrets.litellmKey)
    assert.ok(secrets.qdrantKey.length >= 32)
    assert.ok(secrets.litellmKey.startsWith('sk-'))
    assert.equal(statSync(file).mode & 0o777, 0o600)
    assert.equal(initLocalEnvironment(file), false)
    assert.equal(readFileSync(file, 'utf8'), original)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('refuses missing keys without echoing credentials', () => {
  assert.throws(() => readLocalSecrets('/nonexistent/nandos-ai-test.env'), /ai:init/)
})

test('the verifier only accepts the fixed loopback service origins', () => {
  assert.equal(requireLocalUrl('http://127.0.0.1:4000/v1/models').hostname, '127.0.0.1')
  for (const url of ['https://nandos-api.vercel.app', 'http://127.0.0.1:3001', 'http://127.0.0.1:4000@evil.example', 'http://localhost:4000']) {
    assert.throws(() => requireLocalUrl(url), /local/)
  }
})

test('Docker commands target only the local socket and preserve volumes on shutdown', () => {
  const { command, args } = buildDockerCommand('down', true)
  assert.equal(command, 'sudo')
  assert.deepEqual(args.slice(0, 4), ['docker', '--host', 'unix:///var/run/docker.sock', 'compose'])
  assert.ok(args.includes('down'))
  assert.ok(!args.includes('--volumes'))
  assert.throws(() => buildDockerCommand('reset'), /Acción/)
})

test('sudo is opt-in and used only for Docker, never Node or pnpm', () => {
  const normal = buildDockerCommand('up')
  assert.equal(normal.command, 'docker')
  assert.ok(normal.args.includes('--wait'))
  const model = buildDockerCommand('pull-model', true)
  assert.deepEqual(model.args.slice(-6), ['exec', '-T', 'ollama', 'ollama', 'pull', 'qwen3-embedding:0.6b'])
})
