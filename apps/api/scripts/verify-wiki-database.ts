import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../src/infrastructure/db/client.js'
import { wikiArticles } from '../src/infrastructure/db/schema.js'
import { createWikiService, WikiError } from '../src/modules/wiki/application/wiki-service.js'
import { postgresWikiRepository } from '../src/modules/wiki/infrastructure/wiki-repository.js'

config({ quiet: true })

// This is opt-in, never part of the normal unit test run. It requires an exact
// allow-listed development hostname and never prints the connection string.
const expectedHost = process.env.WIKI_TEST_DATABASE_HOST
const connection = process.env.DATABASE_URL
let matchesTarget = false
try { matchesTarget = Boolean(expectedHost && connection && new URL(connection).hostname === expectedHost) } catch { /* Do not log an invalid URL containing credentials. */ }
if (!matchesTarget) {
  console.error('Verificación cancelada: configura DATABASE_URL y el hostname de desarrollo exacto en WIKI_TEST_DATABASE_HOST.')
  process.exitCode = 1
} else {
  let testId: string | undefined
  try {
    const service = createWikiService(postgresWikiRepository)
    const source = { title: '[Prueba temporal] Persistencia de wiki', category: 'Verificación técnica', markdown: '# Prueba pública\n\nArtículo temporal de verificación.' }
    const created = await service.create(source)
    testId = created.id
    const read = await postgresWikiRepository.find(testId)
    assert.deepEqual(read?.draft, source)
    assert.equal(read?.published, null)
    assert.ok(!(await service.published()).some((article) => article.id === testId))
    const published = await service.change(testId, { expectedRevision: created.revision }, 'publish')
    const edited = await service.change(testId, { expectedRevision: published.revision,
      content: { ...source, markdown: '# BORRADOR PRIVADO DE PRUEBA' } }, 'save')
    assert.equal((await postgresWikiRepository.find(testId))?.draft.markdown, '# BORRADOR PRIVADO DE PRUEBA')
    const publicVersion = (await service.published()).find((article) => article.id === testId)
    assert.deepEqual(publicVersion?.content, source)
    assert.ok(publicVersion && !('draft' in publicVersion))
    await assert.rejects(() => service.change(testId!, { expectedRevision: published.revision, content: source }, 'save'),
      (error) => error instanceof WikiError && error.statusCode === 409)
    await service.change(testId, { expectedRevision: edited.revision }, 'withdraw')
    assert.ok(!(await service.published()).some((article) => article.id === testId))
    assert.equal((await postgresWikiRepository.find(testId))?.draft.markdown, '# BORRADOR PRIVADO DE PRUEBA')
    console.info('Neon: creación, lectura persistente, publicación, borrador independiente, conflicto y retirada verificados.')
  } catch (error) {
    console.error('No se ha completado la verificación de wiki.', { type: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined })
    process.exitCode = 1
  } finally {
    if (testId) {
      try {
        // The only deletion is our freshly generated UUID, not user articles.
        await getDatabase().delete(wikiArticles).where(eq(wikiArticles.id, testId))
        assert.equal(await postgresWikiRepository.find(testId), null)
        console.info('Artículo temporal de verificación eliminado. Los artículos existentes se conservan.')
      } catch {
        console.error(`No se pudo limpiar el artículo temporal ${testId}. Retíralo manualmente antes de repetir la prueba.`)
        process.exitCode = 1
      }
    }
  }
}
