/**
 * User / Auth Queries
 */

import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query'
import * as github from '../github'
import { keys } from '../keys'
import type { GitHubUser } from '../types'
import { useGitHubToken } from './settings'

export interface AuthData {
  user: GitHubUser
  token: string
}

/**
 * Fetch current user from GitHub API
 * Simple query - just fetches user data when token is available
 */
export function useCurrentUser(): UseQueryResult<GitHubUser | null> {
  const { data: token } = useGitHubToken()

  return useQuery({
    queryKey: keys.currentUser,
    queryFn: async (): Promise<GitHubUser | null> => {
      if (!token) return null
      return github.fetchCurrentUser(token)
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Get current authenticated user (legacy - uses cache)
 * @deprecated Use useCurrentUser instead
 */
export function useUser(): UseQueryResult<AuthData | null> {
  const qc = useQueryClient()

  const result = useQuery({
    queryKey: keys.user,
    queryFn: (): AuthData | null => {
      const data = qc.getQueryData<AuthData>(keys.user) ?? null
      return data
    },
    staleTime: Infinity,
    gcTime: Infinity
  })

  return result
}

export interface AuthStatus {
  isAuthenticated: boolean
  isLoading: boolean
  user: GitHubUser | null
  token: string | null
}

/**
 * Check if user is authenticated
 * Simple: read token from cache, check if it exists
 */
export function useIsAuthenticated(): AuthStatus {
  const { data: authData, isLoading } = useUser()
  const { data: token } = useGitHubToken()

  const isAuthenticated = !!authData?.user || !!token

  return {
    isAuthenticated,
    isLoading,
    user: authData?.user ?? null,
    token: authData?.token ?? token ?? null
  }
}
