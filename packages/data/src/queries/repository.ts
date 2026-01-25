/**
 * Repository Queries
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as github from '../github'
import { keys } from '../keys'
import type { Repository } from '../types'
import { useUser } from './user'

// 1 hour in milliseconds
const REPOS_CACHE_TIME = 60 * 60 * 1000

/**
 * Fetch all repositories the user has contributed to
 * Only runs when user is authenticated (has token)
 * Cache: 1 hour, persisted to localStorage
 */
export function useRepos() {
  const qc = useQueryClient()

  // Use useUser() for reactive updates
  const { data: authData } = useUser()

  // Check token from authData OR directly from cache (for persisted token)
  const tokenFromCache = qc.getQueryData<string>(keys.githubToken)
  const token = authData?.token ?? tokenFromCache
  const enabled = !!token

  return useQuery({
    queryKey: keys.repos,
    queryFn: async (): Promise<Repository[]> => {
      // Get token fresh from cache
      const freshToken = qc.getQueryData<string>(keys.githubToken)
      if (!freshToken) throw new Error('No token')
      const repos = await github.fetchRepos(freshToken)
      return repos as Repository[]
    },
    enabled,
    staleTime: REPOS_CACHE_TIME,
    retry: 1
  })
}
