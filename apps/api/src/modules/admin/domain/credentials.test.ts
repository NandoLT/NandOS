import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  constantTimeSecretMatches,
  digestSessionToken,
  hashPassword,
  normalizeUsername,
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
  assert.match(hash, /^scrypt\$/)
  assert.equal(await verifyPassword(password, hash), true)
  assert.equal(await verifyPassword('another-password', hash), false)
})

test('uses a fixed-time comparison for the bootstrap key and hashes session tokens', () => {
  assert.equal(constantTimeSecretMatches('a-very-long-bootstrap-key', 'a-very-long-bootstrap-key'), true)
  assert.equal(constantTimeSecretMatches('wrong', 'a-very-long-bootstrap-key'), false)
  assert.equal(digestSessionToken('token').length, 64)
  assert.notEqual(digestSessionToken('token'), 'token')
})
