/**
 * User / Auth Mutations
 * Token is stored in TanStack Query cache (persisted to localStorage automatically)
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import * as github from '../github'
import { clearETagCache } from '../http'
import { keys } from '../keys'
import type { GitHubUser } from '../types'
import { upsertAccountAndActivate } from './accounts'

export function useSignIn(): UseMutationResult<{ token: string; user: GitHubUser }, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      // Validate the token via API
      const result = await github.validateToken(token)
      if (!result.valid) {
        throw new Error('Invalid token')
      }
      return { token, user: result.user as GitHubUser }
    },
    onSuccess: ({ token, user }) => {
      // Add (or update) this account and make it active. First sign-in creates
      // the first account; a subsequent sign-in appends another.
      upsertAccountAndActivate(qc, token, user)
    }
  })
}

export function useSignOut(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Nothing to do in mutationFn - all cleanup in onSuccess
    },
    onSuccess: () => {
      // Sign out of ALL accounts.
      qc.setQueryData(keys.accounts, [])
      qc.setQueryData(keys.activeAccountId, null)
      // Clear token from cache
      qc.setQueryData(keys.githubToken, null)
      // Clear user
      qc.setQueryData(keys.user, null)
      qc.setQueryData(keys.currentUser, null)
      // Clear HTTP ETag cache (stale ETags shouldn't persist across accounts)
      clearETagCache()
      // Clear all GitHub-related data
      qc.removeQueries({ queryKey: keys.repos })
      qc.removeQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.('github') })
    }
  })
}

/**
 * Validate a new token (e.g. from user input)
 */
export function useValidateToken(): UseMutationResult<
  { token: string; valid: boolean; user: GitHubUser | undefined },
  Error,
  string
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      const result = await github.validateToken(token)
      return { token, valid: result.valid, user: result.user as GitHubUser | undefined }
    },
    onSuccess: ({ token, valid, user }) => {
      if (valid && user) {
        upsertAccountAndActivate(qc, token, user)
      } else {
        qc.setQueryData(keys.githubToken, null)
        qc.setQueryData(keys.user, null)
      }
    }
  })
}

/**
 * Validate the persisted token from cache (for app startup)
 * Checks if the token stored in cache is still valid
 */
export function useValidatePersistedToken(): UseMutationResult<
  { token: string | null; valid: boolean; user: GitHubUser | undefined },
  Error,
  void
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Get token from TanStack cache (restored from localStorage by persist)
      const token = qc.getQueryData<string>(keys.githubToken)
      if (!token) {
        // No token found - don't validate, don't clear anything
        return { token: null, valid: false, user: undefined }
      }

      try {
        const result = await github.validateToken(token)
        return { token, valid: result.valid, user: result.user as GitHubUser | undefined }
      } catch {
        // On network error, keep the token (assume valid)
        return { token, valid: true, user: undefined }
      }
    },
    onSuccess: ({ token, valid, user }) => {
      if (valid && token) {
        // Token is valid - store user data
        if (user) {
          qc.setQueryData(keys.user, { user, token })
        }
      } else if (token && !valid) {
        // Token EXISTS but is INVALID - clear it
        qc.setQueryData(keys.githubToken, null)
        qc.setQueryData(keys.user, null)
      }
      // If token is null, do nothing - don't clear cache
    }
  })
}
