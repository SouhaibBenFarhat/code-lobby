/**
 * User / Auth Mutations
 * Token is stored in TanStack Query cache and passed to API functions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as github from '../github'
import { keys } from '../keys'
import type { GitHubUser } from '../types'

export function useSignIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      console.log('[useSignIn] mutationFn called with token:', `${token.substring(0, 10)}...`)
      // Validate the token via API
      const result = await github.validateToken(token)
      console.log('[useSignIn] validateToken result:', result.valid, result.user?.login)
      if (!result.valid) {
        throw new Error('Invalid token')
      }
      return { token, user: result.user as GitHubUser }
    },
    onSuccess: ({ token, user }) => {
      console.log('[useSignIn] onSuccess - setting token and user')
      // Store token in TanStack cache (persisted to localStorage)
      qc.setQueryData(keys.githubToken, token)
      const cachedToken = qc.getQueryData<string>(keys.githubToken)
      console.log(
        '[useSignIn] Token set in cache:',
        `${typeof cachedToken === 'string' ? cachedToken.substring(0, 10) : ''}...`
      )
      // Store user data as AuthData format { user, token }
      qc.setQueryData(keys.user, { user, token })
      console.log('[useSignIn] User set in cache:', qc.getQueryData(keys.user))
      // Refetch repos with new token
      console.log('[useSignIn] Calling refetchQueries for repos')
      qc.refetchQueries({ queryKey: keys.repos })
    }
  })
}

export function useSignOut() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Nothing to do in mutationFn - all cleanup in onSuccess
    },
    onSuccess: () => {
      // Clear token from cache
      qc.removeQueries({ queryKey: keys.githubToken })
      // Clear user
      qc.setQueryData(keys.user, null)
      // Clear all GitHub-related data
      qc.removeQueries({ queryKey: keys.repos })
      qc.removeQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.('github') })
    }
  })
}

/**
 * Validate a new token (e.g. from user input)
 */
export function useValidateToken() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      const result = await github.validateToken(token)
      return { token, valid: result.valid, user: result.user as GitHubUser | undefined }
    },
    onSuccess: ({ token, valid, user }) => {
      if (valid && user) {
        qc.setQueryData(keys.githubToken, token)
        qc.setQueryData(keys.user, { user, token })
      } else {
        qc.removeQueries({ queryKey: keys.githubToken })
        qc.setQueryData(keys.user, null)
      }
    }
  })
}

/**
 * Validate the persisted token from cache (for app startup)
 * Checks if the token stored in cache is still valid
 */
export function useValidatePersistedToken() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Get token from cache (restored from localStorage by TanStack persistence)
      const token = qc.getQueryData<string>(keys.githubToken)
      if (!token) {
        return { token: null, valid: false, user: undefined }
      }
      const result = await github.validateToken(token)
      return { token, valid: result.valid, user: result.user as GitHubUser | undefined }
    },
    onSuccess: ({ token, valid, user }) => {
      if (valid && user && token) {
        qc.setQueryData(keys.user, { user, token })
      } else {
        // Token is invalid - clear it
        qc.removeQueries({ queryKey: keys.githubToken })
        qc.setQueryData(keys.user, null)
      }
    }
  })
}
