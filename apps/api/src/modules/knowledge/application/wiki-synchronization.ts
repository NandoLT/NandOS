import type { WikiSynchronizationStatus } from '@nandoos/contracts'
import type { createKnowledgeService } from './knowledge-service.js'
import { KnowledgeBusyError } from '../domain/corpus.js'

export interface WikiSynchronization {
  status(): Promise<WikiSynchronizationStatus>
  synchronize(): Promise<WikiSynchronizationStatus>
}

export function createWikiSynchronization(service: Pick<ReturnType<typeof createKnowledgeService>, 'status'> & { ingest(): Promise<unknown> },
  lock: { runExclusive<T>(action: () => Promise<T>): Promise<T>; isLocked(): boolean }): WikiSynchronization {
  let running = false
  let lastStatus: WikiSynchronizationStatus | undefined
  async function readStatus(): Promise<WikiSynchronizationStatus> {
    const state = await service.status()
    lastStatus = { state: state.synchronized ? 'updated' : 'outdated', publishedArticles: state.publishedArticles,
      indexedArticles: state.active?.articles ?? 0, indexedChunks: state.active?.chunks ?? 0 }
    return lastStatus
  }
  return {
    async status() {
      if (running || lock.isLocked()) return { ...lastStatus, state: 'syncing',
        publishedArticles: lastStatus?.publishedArticles ?? null, indexedArticles: lastStatus?.indexedArticles ?? null,
        indexedChunks: lastStatus?.indexedChunks ?? null }
      return readStatus()
    },
    async synchronize() {
      if (running || lock.isLocked()) throw new KnowledgeBusyError('Ya hay una sincronización en curso.')
      running = true
      try {
        return await lock.runExclusive(async () => {
          await service.ingest()
          // Compare with live publications again, not just the POST's success.
          return readStatus()
        })
      } finally { running = false }
    },
  }
}
