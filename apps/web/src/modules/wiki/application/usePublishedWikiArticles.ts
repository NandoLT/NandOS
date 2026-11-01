import { useQuery } from '@tanstack/react-query'
import type { PublishedWikiArticle } from '@nandoos/contracts'
import { apiRequest } from '../../portfolio/infrastructure/http-client'

export const publishedWikiQueryKey = ['wiki', 'published'] as const

export function usePublishedWikiArticles() {
  return useQuery({
    queryKey: publishedWikiQueryKey,
    queryFn: async ({ signal }): Promise<PublishedWikiArticle[]> => {
      const result = await apiRequest<{ articles: PublishedWikiArticle[] }>('wiki/articles', { signal })
      if (!Array.isArray(result.articles)) throw new Error('Respuesta de wiki no válida.')
      return result.articles
    },
    // Revalidate on each opening: a withdrawal must not stay in a restored cache.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
  })
}
