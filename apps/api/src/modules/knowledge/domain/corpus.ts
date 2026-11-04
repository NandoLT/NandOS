import { createHash } from 'node:crypto'
import type { PublishedWikiArticle } from '@nandoos/contracts'
import { parseWikiContent } from '../../wiki/domain/wiki-article.js'

export class KnowledgeError extends Error {}
export class KnowledgeBusyError extends KnowledgeError {}

export const embeddingProfile = Object.freeze({
  id: 'qwen3-embedding-0.6b-q8_0-1024-cosine-markdown-v1',
  model: 'nandos-embeddings', dimensions: 1024,
  queryInstruction: 'Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ',
})

export interface WikiChunk {
  id: string
  articleId: string
  revision: number
  publishedAt: string
  title: string
  category: string
  headingPath: string[]
  ordinal: number
  markdown: string
  embeddingText: string
}

export function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function pointId(value: unknown): string {
  const bytes = Buffer.from(digest(value).slice(0, 32), 'hex')
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function splitUtf8(text: string, maxBytes: number): string[] {
  const pieces: string[] = []
  let piece = '', bytes = 0
  for (const char of text) {
    const size = Buffer.byteLength(char)
    if (bytes + size > maxBytes) { pieces.push(piece); piece = ''; bytes = 0 }
    piece += char; bytes += size
  }
  if (piece) pieces.push(piece)
  return pieces
}

// Small, deterministic Markdown section scanner, not an HTML renderer. Fenced
// examples stay in their parent section; never fetch links or execute content.
function sections(markdown: string): { path: string[]; text: string }[] {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const result: { path: string[]; text: string }[] = []
  let headings: { level: number; title: string }[] = [], text: string[] = [], fence: { char: string; length: number } | null = null
  function flush() {
    const value = text.join('\n').trim()
    if (value) result.push({ path: headings.map(({ title }) => title), text: value })
    text = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      text.push(line)
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = null
      continue
    }
    if (marker) { fence = { char: marker[1][0], length: marker[1].length }; text.push(line); continue }
    const atx = /^ {0,3}(#{1,6})(?:[\t ]+|$)(.*)$/.exec(line)
    const setext = line.trim() && !/^\s/.test(line) && /^ {0,3}(=+|-+)[\t ]*$/.exec(lines[i + 1] ?? '')
    if (atx || setext) {
      flush()
      const level = atx ? atx[1].length : setext && setext[1][0] === '=' ? 1 : 2
      const title = (atx ? atx[2].replace(/[\t ]+#+[\t ]*$/, '') : line).trim()
      headings = headings.filter((heading) => heading.level < level); headings.push({ level, title })
      text.push(line)
      if (!atx) text.push(lines[++i])
    } else text.push(line)
  }
  flush()
  return result
}

export function buildCorpus(input: PublishedWikiArticle[]) {
  if (!Array.isArray(input)) throw new KnowledgeError('La fuente no devolvió artículos publicados válidos.')
  const seen = new Set<string>()
  const articles = input.map((article) => {
    const content = article && parseWikiContent(article.content)
    if (!article || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(article.id) || seen.has(article.id) || !content ||
        !Number.isSafeInteger(article.revision) || article.revision < 1 || typeof article.publishedAt !== 'string' || !Number.isFinite(Date.parse(article.publishedAt))) {
      throw new KnowledgeError('La fuente contiene artículos o revisiones no válidos; ingesta cancelada.')
    }
    seen.add(article.id)
    // Explicit projection: draft/admin fields can never enter hashes or payloads.
    return { id: article.id, revision: article.revision, publishedAt: article.publishedAt, content }
  }).sort((a, b) => a.id.localeCompare(b.id))
  const chunks: WikiChunk[] = []
  for (const article of articles) {
    let ordinal = 0
    for (const section of sections(article.content.markdown)) {
      const context = splitUtf8(`${article.content.title}\nCategoría: ${article.content.category}\nSección: ${section.path.join(' > ')}\n\n`, 2000)[0]
      for (const markdown of splitUtf8(section.text, 3200)) {
        chunks.push({ id: pointId([embeddingProfile.id, article, ordinal, markdown]), articleId: article.id,
          revision: article.revision, publishedAt: article.publishedAt, title: article.content.title,
          category: article.content.category, headingPath: [...section.path], ordinal: ordinal++,
          markdown, embeddingText: context + markdown })
      }
    }
  }
  return { fingerprint: digest([embeddingProfile.id, articles]), articles: articles.length, chunks }
}
