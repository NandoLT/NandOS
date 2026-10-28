import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const PASSWORD_KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function derivePasswordKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function validUsername(username: string) {
  return /^[a-z0-9._-]{3,48}$/.test(normalizeUsername(username))
}

export function validPassword(password: string) {
  return password.length >= 12 && password.length <= 256
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derivePasswordKey(password, salt)
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, cost, blockSize, parallelism, saltHex, keyHex] = encodedHash.split('$')
  if (
    algorithm !== 'scrypt' || cost !== String(SCRYPT_OPTIONS.N) || blockSize !== String(SCRYPT_OPTIONS.r) ||
    parallelism !== String(SCRYPT_OPTIONS.p) || !saltHex || !keyHex || !/^[\da-f]+$/i.test(saltHex) ||
    !/^[\da-f]+$/i.test(keyHex)
  ) return false

  const expected = Buffer.from(keyHex, 'hex')
  if (expected.length !== PASSWORD_KEY_LENGTH) return false
  const actual = await derivePasswordKey(password, Buffer.from(saltHex, 'hex'))
  return timingSafeEqual(actual, expected)
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function digestSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function constantTimeSecretMatches(candidate: string, expected: string | undefined) {
  if (!expected) return false
  const candidateBytes = Buffer.from(candidate)
  const expectedBytes = Buffer.from(expected)
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes)
}
