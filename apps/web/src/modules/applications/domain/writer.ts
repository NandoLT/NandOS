import { DOCUMENTS_DIRECTORY } from './explorer'
import type { WriterDocument } from './explorer'

export type WriterDraft = { document: WriterDocument | null; parentId: string; markdown: string }
export const emptyWriterDraft: WriterDraft = { document: null, parentId: DOCUMENTS_DIRECTORY, markdown: '' }
