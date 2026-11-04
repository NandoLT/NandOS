import type { PublishedWikiArticle } from '@nandoos/contracts'
import type { WikiChunk } from '../domain/corpus.js'

export interface PublishedWikiSource { published(): Promise<PublishedWikiArticle[]> }
export interface Embeddings { embed(texts: string[]): Promise<number[][]> }
export interface SnapshotMetadata {
  fingerprint: string
  profile: string
  articles: number
  chunks: number
}
export interface Snapshot extends SnapshotMetadata { collection: string }
export interface VectorPoint { id: string; vector: number[]; chunk: WikiChunk }
export interface KnowledgeIndex {
  current(): Promise<Snapshot | null>
  create(snapshot: SnapshotMetadata): Promise<string>
  write(collection: string, points: VectorPoint[]): Promise<void>
  activate(collection: string, previous: string | null): Promise<void>
  discard(collection: string): Promise<void>
  search(collection: string, vector: number[], limit: number): Promise<{ id: string; score: number }[]>
}
