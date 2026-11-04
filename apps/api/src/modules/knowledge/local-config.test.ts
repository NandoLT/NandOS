import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, chmodSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadLocalKnowledgeConfig, withIngestionLock } from './infrastructure/local-config.js'
import { KnowledgeError } from './domain/corpus.js'

test('private config refuses public permissions and symlinks, without rewriting credentials', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nandos-knowledge-config-'))
  try {
    const api = join(dir, 'api'), ai = join(dir, 'ai')
    writeFileSync(api, 'DATABASE_URL=postgresql://test:test@ep-silent-shape-b9eucpov-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require\n', { mode: 0o600 })
    writeFileSync(ai, `QDRANT_API_KEY=${'a'.repeat(64)}\nLITELLM_MASTER_KEY=${'b'.repeat(64)}\n`, { mode: 0o600 })
    assert.equal(loadLocalKnowledgeConfig(api, ai).secrets.qdrantKey.length, 64)
    chmodSync(ai, 0o644)
    assert.throws(() => loadLocalKnowledgeConfig(api, ai), KnowledgeError)
    chmodSync(ai, 0o600)
    symlinkSync(api, join(dir, 'link'))
    assert.throws(() => loadLocalKnowledgeConfig(join(dir, 'link'), ai), KnowledgeError)
  } finally { rmSync(dir, { recursive: true }) }
})

test('ingestion lock prevents overlapping writers and cleans up its own file on failure', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nandos-knowledge-lock-'))
  const file = join(dir, 'lock')
  try {
    await withIngestionLock(file, async () => {
      await assert.rejects(withIngestionLock(file, async () => 0), KnowledgeError)
      assert.ok(existsSync(file))
    })
    assert.equal(existsSync(file), false)
    await assert.rejects(withIngestionLock(file, async () => { throw new Error('test') }))
    assert.equal(existsSync(file), false)
  } finally { rmSync(dir, { recursive: true }) }
})
