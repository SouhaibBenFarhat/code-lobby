/**
 * Contributions & Events Queries
 *
 * Fetches user contribution data and daily events from GitHub.
 * Lazy-loaded: only fetches when enabled=true (panel open)
 */

import { type UseQueryResult, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContributionsData, UserEvent } from '../github'
import * as github from '../github'
import { keys } from '../keys'
import { useGitHubToken, useSelectedRepos } from './settings'
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
    staleTime: 30 * 1000, // 30 seconds — ETag-protected REST call, 304 is free
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

/**
 * Activity across the repos the user is monitoring (their selected repos).
 *
 * Fans out one `GET /repos/:owner/:repo/events` per selected repo (each its own
 * cached query, so one failing repo can't blank the whole feed), then merges,
 * sorts newest-first, and caps the feed. Powers the header Activity Stream.
 */
export function useWatchedRepoEvents(): {
  data: UserEvent[]
  isLoading: boolean
  isFetching: boolean
  refetch: () => void
} {
  const { data: token } = useGitHubToken()
  const { data: selectedRepos } = useSelectedRepos()
  const qc = useQueryClient()
  const reposToFetch = selectedRepos || []

  const eventQueries = useQueries({
    queries: reposToFetch.map((repoFullName) => ({
      queryKey: keys.repoEvents(repoFullName),
      queryFn: async (): Promise<UserEvent[]> => {
        if (!token) return []
        return github.fetchRepoEvents(token, repoFullName)
      },
      enabled: !!token,
      staleTime: 60 * 1000, // 60s — ETag-protected REST call, 304s are free
      gcTime: 30 * 60 * 1000
    }))
  })

  const data = eventQueries
    .flatMap((q) => q.data || [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100)

  // Only "loading" on the very first load (every repo still loading, none cached)
  const isLoading = reposToFetch.length > 0 && eventQueries.every((q) => q.isLoading)
  const isFetching = eventQueries.some((q) => q.isFetching)

  const refetch = (): void => {
    for (const repoFullName of reposToFetch) {
      qc.invalidateQueries({ queryKey: keys.repoEvents(repoFullName) })
    }
  }

  return { data, isLoading, isFetching, refetch }
}
