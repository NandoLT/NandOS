import assert from 'node:assert/strict'
import { scryptSync } from 'node:crypto'
import { test } from 'node:test'
import {
  constantTimeSecretMatches,
  digestSessionToken,
  hashPassword,
  normalizeUsername,
  passwordHashNeedsUpgrade,
  validPassword,
  validUsername,
  verifyPassword,
} from './credentials.js'

test('normalizes and validates the single administrator username', () => {
  assert.equal(normalizeUsername('  Nando.LT '), 'nando.lt')
  assert.equal(validUsername('Nando.LT'), true)
  assert.equal(validUsername('ab'), false)
  assert.equal(validUsername('bad name'), false)
})

test('requires a long passphrase and verifies its scrypt hash', async () => {
  const password = 'portfolio-passphrase-2026'
  assert.equal(validPassword(password), true)
  assert.equal(validPassword('admin'), false)
  const hash = await hashPassword(password)
  assert.equal(validPassword('doceletrasxx'), false)
  assert.match(hash, /^scrypt\$131072\$8\$1\$/)
  assert.equal(passwordHashNeedsUpgrade(hash), false)
  assert.equal(await verifyPassword(password, hash), true)
  assert.equal(await verifyPassword('another-password', hash), false)
})

test('uses a fixed-time comparison for the bootstrap key and hashes session tokens', () => {
  assert.equal(constantTimeSecretMatches('a-very-long-bootstrap-key', 'a-very-long-bootstrap-key'), true)
  assert.equal(constantTimeSecretMatches('wrong', 'a-very-long-bootstrap-key'), false)
  assert.equal(digestSessionToken('token').length, 64)
  assert.notEqual(digestSessionToken('token'), 'token')
})

test('accepts the previous scrypt format and rejects hashes with unsupported parameters', async () => {
  const password = 'legacy-admin'
  const salt = Buffer.alloc(16, 42)
  const key = scryptSync(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  const legacy = `scrypt$32768$8$1$${salt.toString('hex')}$${key.toString('hex')}`
  assert.equal(passwordHashNeedsUpgrade(legacy), true)
  assert.equal(await verifyPassword(password, legacy), true)
  assert.equal(await verifyPassword(password, legacy.replace('$32768$', '$262144$')), false)
  assert.equal(await verifyPassword(password, legacy + '$extra'), false)
})
