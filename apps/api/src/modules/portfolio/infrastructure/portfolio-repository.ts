import { desc, eq, sql } from 'drizzle-orm'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import type { CvLanguage, PortfolioContent } from '@nandoos/contracts'
import { getDatabase } from '../../../infrastructure/db/client.js'
import { cvUploads, portfolioDocuments } from '../../../infrastructure/db/schema.js'

async function ensurePortfolioDocument() {
  const database = getDatabase()
  await database
    .insert(portfolioDocuments)
    .values({ id: 1, draftContent: DEFAULT_PORTFOLIO_CONTENT, publishedContent: DEFAULT_PORTFOLIO_CONTENT })
    .onConflictDoNothing()
}

export async function getPublishedPortfolio() {
  const [document] = await getDatabase()
    .select({ content: portfolioDocuments.publishedContent })
    .from(portfolioDocuments)
    .where(eq(portfolioDocuments.id, 1))
    .limit(1)
  if (!document) {
    await ensurePortfolioDocument()
    const [seededDocument] = await getDatabase()
      .select({ content: portfolioDocuments.publishedContent })
      .from(portfolioDocuments)
      .where(eq(portfolioDocuments.id, 1))
      .limit(1)
    if (!seededDocument) throw new Error('Portfolio content is unavailable.')
    return seededDocument.content
  }
  return document.content
}

export async function getPortfolioForAdmin() {
  await ensurePortfolioDocument()
  const [document] = await getDatabase()
    .select()
    .from(portfolioDocuments)
    .where(eq(portfolioDocuments.id, 1))
    .limit(1)
  if (!document) throw new Error('Portfolio content is unavailable.')
  return document
}

export async function savePortfolioDraft(content: PortfolioContent) {
  await ensurePortfolioDocument()
  await getDatabase()
    .update(portfolioDocuments)
    .set({ draftContent: content, updatedAt: new Date() })
    .where(eq(portfolioDocuments.id, 1))
}

export async function publishPortfolioDraft() {
  await ensurePortfolioDocument()
  await getDatabase().execute(sql`
    with promoted as (
      update portfolio_documents
      set published_content = draft_content,
          revision = revision + 1,
          published_at = now(),
          updated_at = now()
      where id = 1
      returning revision, published_content, published_at
    )
    insert into portfolio_revisions (revision, content, created_at)
    select revision, published_content, published_at from promoted
    returning revision
  `)
  return getPortfolioForAdmin()
}

export async function createCvUpload(upload: {
  language: CvLanguage
  filename: string
  url: string
  pathname: string
  fileSize: number
}) {
  const [saved] = await getDatabase().insert(cvUploads).values(upload).returning()
  return saved
}

export async function listCvUploads() {
  return getDatabase()
    .select()
    .from(cvUploads)
    .orderBy(desc(cvUploads.uploadedAt))
    .limit(40)
}

export async function selectCvUploadForDraft(uploadId: string) {
  const database = getDatabase()
  const [upload] = await database.select().from(cvUploads).where(eq(cvUploads.id, uploadId)).limit(1)
  if (!upload) return null

  await ensurePortfolioDocument()
  const [document] = await database
    .select({ draftContent: portfolioDocuments.draftContent })
    .from(portfolioDocuments)
    .where(eq(portfolioDocuments.id, 1))
    .limit(1)
  if (!document) return null

  const content = structuredClone(document.draftContent)
  content.cvDocuments[upload.language as CvLanguage] = {
    language: upload.language as CvLanguage,
    filename: upload.filename,
    url: upload.url,
    uploadedAt: upload.uploadedAt.toISOString(),
  }
  await database
    .update(portfolioDocuments)
    .set({ draftContent: content, updatedAt: new Date() })
    .where(eq(portfolioDocuments.id, 1))
  return content
}
