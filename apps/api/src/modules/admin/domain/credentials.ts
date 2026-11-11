import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const PASSWORD_KEY_LENGTH = 64
const LEGACY_COST = 32_768
const CURRENT_COST = 131_072
const SCRYPT_OPTIONS = { r: 8, p: 1, maxmem: 192 * 1024 * 1024 }
export const MIN_NEW_PASSWORD_LENGTH = 15
export const MAX_PASSWORD_LENGTH = 256

function derivePasswordKey(password: string, salt: Buffer, cost: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, { ...SCRYPT_OPTIONS, N: cost }, (error, derivedKey) => {
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
  return password.length >= MIN_NEW_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derivePasswordKey(password, salt, CURRENT_COST)
  return `scrypt$${CURRENT_COST}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('hex')}$${key.toString('hex')}`
}

export function passwordHashNeedsUpgrade(encodedHash: string) {
  return encodedHash.startsWith(`scrypt$${LEGACY_COST}$`)
}

export async function verifyPassword(password: string, encodedHash: string) {
  if (password.length > MAX_PASSWORD_LENGTH) return false
  const parts = encodedHash.split('$')
  const [algorithm, cost, blockSize, parallelism, saltHex, keyHex] = parts
  if (parts.length !== 6 || algorithm !== 'scrypt' ||
    (cost !== String(LEGACY_COST) && cost !== String(CURRENT_COST)) ||
    blockSize !== String(SCRYPT_OPTIONS.r) || parallelism !== String(SCRYPT_OPTIONS.p) ||
    !/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(keyHex)) return false

  const actual = await derivePasswordKey(password, Buffer.from(saltHex, 'hex'), Number(cost))
  return timingSafeEqual(actual, Buffer.from(keyHex, 'hex'))
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
