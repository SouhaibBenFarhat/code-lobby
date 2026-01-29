/**
 * Contributions & Events Queries
 *
 * Fetches user contribution data and daily events from GitHub.
 * Lazy-loaded: only fetches when enabled=true (panel open)
 */

import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContributionsData, UserEvent } from '../github'
import * as github from '../github'
import { keys } from '../keys'
import { useGitHubToken } from './settings'
import { useCurrentUser } from './user'

export type { ContributionsData, UserEvent } from '../github'

/**
 * Fetch user contributions from GitHub
 *
 * @param enabled - Only fetch when true (lazy loading)
 */
export function useContributions(enabled = false): UseQueryResult<ContributionsData | null> {
  const { data: token } = useGitHubToken()

  return useQuery({
    queryKey: keys.contributions,
    queryFn: async (): Promise<ContributionsData | null> => {
      if (!token) return null
      return github.fetchContributions(token)
    },
    enabled: enabled && !!token,
    staleTime: 30 * 60 * 1000, // 30 minutes - contributions don't change that often
    gcTime: 60 * 60 * 1000 // Keep in cache for 1 hour
  })
}

/**
 * Hook to manually refresh contributions
 */
export function useRefreshContributions(): () => void {
  const qc = useQueryClient()

  return () => {
    qc.invalidateQueries({ queryKey: keys.contributions })
  }
}

/**
 * Fetch user events for today
 *
 * @param enabled - Only fetch when true (lazy loading)
 */
export function useUserEvents(enabled = false): UseQueryResult<UserEvent[]> {
  const { data: token } = useGitHubToken()
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: keys.userEvents,
    queryFn: async (): Promise<UserEvent[]> => {
      if (!token || !user?.login) return []
      return github.fetchUserEvents(token, user.login)
    },
    enabled: enabled && !!token && !!user?.login,
    staleTime: 5 * 60 * 1000, // 5 minutes - events change more frequently
    gcTime: 30 * 60 * 1000 // Keep in cache for 30 minutes
  })
}

/**
 * Hook to manually refresh user events
 */
export function useRefreshUserEvents(): () => void {
  const qc = useQueryClient()

  return () => {
    qc.invalidateQueries({ queryKey: keys.userEvents })
  }
}
