import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseWikiContent, publishArticle, saveArticleDraft, withdrawArticle } from './wiki-article.js'
import type { WikiArticle } from '@nandoos/contracts'

const draft = { title: 'El escritorio', category: 'NandOS', markdown: '# Escritorio\n\nDoble clic para abrir.' }
function article(): WikiArticle {
  return { id: '10000000-0000-4000-8000-000000000001', draft, published: null, revision: 1, publishedRevision: null,
    createdAt: '2026-10-31T10:00:00.000Z', updatedAt: '2026-10-31T10:00:00.000Z', publishedAt: null }
}

test('validates title, category and Markdown without executing or modifying the source', () => {
  assert.deepEqual(parseWikiContent(draft), draft)
  assert.equal(parseWikiContent({ ...draft, title: '   ' }), null)
  assert.equal(parseWikiContent({ ...draft, markdown: 'x'.repeat(120001) }), null)
  assert.equal(parseWikiContent({ ...draft, category: 4 }), null)
})
test('published content stays unchanged while editing a draft', () => {
  const published = publishArticle(article(), '2026-10-31T11:00:00.000Z')
  const edited = saveArticleDraft(published, { ...draft, markdown: '# Versión nueva' }, '2026-10-31T12:00:00.000Z')
  assert.equal(edited.published?.markdown, draft.markdown)
  assert.equal(edited.draft.markdown, '# Versión nueva')
  assert.equal(edited.revision, 3)
  assert.equal(published.draft.markdown, draft.markdown)
})
test('withdrawal removes the public version but keeps the editable draft', () => {
  const withdrawn = withdrawArticle(publishArticle(article(), '2026-10-31T11:00:00.000Z'), '2026-10-31T12:00:00.000Z')
  assert.equal(withdrawn.published, null)
  assert.equal(withdrawn.publishedRevision, null)
  assert.deepEqual(withdrawn.draft, draft)
})
