import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import type { PortfolioContent } from '@nandoos/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../infrastructure/http-client'

export const portfolioQueryKey = ['portfolio', 'published'] as const

export function usePortfolioContent() {
  return useQuery({
    queryKey: portfolioQueryKey,
    queryFn: async (): Promise<PortfolioContent> => {
      try {
        const result = await apiRequest<{ content: PortfolioContent }>('portfolio')
        return result.content
      } catch {
        return DEFAULT_PORTFOLIO_CONTENT
      }
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  })
}
