/**
 * Rate Limit Queries
 */

import { useQuery } from '@tanstack/react-query'
import * as github from '../github'
import { keys } from '../keys'
import type { RateLimit } from '../types'
import { useGitHubToken } from './settings'

/**
 * Fetch GitHub API rate limit
 */
export function useRateLimit() {
  const { data: token } = useGitHubToken()

  return useQuery({
    queryKey: keys.rateLimit,
    queryFn: async (): Promise<RateLimit> => {
      if (!token) throw new Error('No token')
      return github.fetchRateLimit(token)
    },
    enabled: !!token,
    staleTime: 30 * 1000, // Refresh every 30 seconds
    refetchInterval: 60 * 1000 // Auto-refresh every minute
  })
}
