import type { CvLanguage, CvDocument, PortfolioContent } from '@nandoos/contracts'
import { apiRequest } from '../../portfolio/infrastructure/http-client'

export type AdminContentResponse = {
  draft: PortfolioContent
  published: PortfolioContent
  revision: number
  updatedAt: string
  publishedAt: string | null
}

export type CvUpload = {
  id: string
  language: CvLanguage
  filename: string
  url: string
  pathname: string
  fileSize: number
  uploadedAt: string
}

export function getAdminContent() {
  return apiRequest<AdminContentResponse>('admin/content')
}

export function saveAdminDraft(content: PortfolioContent) {
  return apiRequest<{ saved: boolean; draft: PortfolioContent }>('admin/content/draft', {
    method: 'PUT',
    body: JSON.stringify(content),
  })
}

export function publishAdminDraft() {
  return apiRequest<{ published: boolean; content: PortfolioContent; revision: number; publishedAt: string }>(
    'admin/content/publish', { method: 'POST' }
  )
}

export function getCvUploads() {
  return apiRequest<{ uploads: CvUpload[] }>('admin/cv')
}

export function uploadCv(language: CvLanguage, file: File) {
  const form = new FormData()
  form.set('file', file)
  return apiRequest<{ upload: CvUpload; draft: PortfolioContent }>(`admin/cv/${language}`, {
    method: 'POST',
    body: form,
  })
}

export function useCvUploadInDraft(id: string) {
  return apiRequest<{ draft: PortfolioContent }>(`admin/cv/${id}/use-in-draft`, { method: 'POST' })
}

export type { CvDocument }
