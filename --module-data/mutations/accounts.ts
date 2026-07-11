/**
 * Multi-account Mutations
 *
 * Every sign-in path (PAT `useSignIn`, device-flow `finishWithToken`) funnels
 * through `upsertAccountAndActivate`, so the FIRST sign-in simply creates the
 * first account and "Add account" appends another — one code path.
 *
 * Activating an account mirrors its token into `keys.githubToken` and clears the
 * other account's cached `github/*` data, so every existing GitHub hook and the
 * Claude CLI `prContext.githubToken` transparently follow the active account.
 */

import {
  type QueryClient,
  type UseMutationResult,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import * as github from '../github'
import { clearETagCache } from '../http'
import { keys } from '../keys'
import type { Account, GitHubUser } from '../types'

// ─── Shared internals ───────────────────────────────────────────────────────

/**
 * Drop the previous account's cached GitHub data so it refetches under the new
 * token, and reset any selection that pointed at the old account's repos.
 */
function clearGitHubCacheForSwitch(qc: QueryClient): void {
  clearETagCache()
  qc.removeQueries({ predicate: (q) => (q.queryKey[0] as string) === 'github' })
  // A PR selected under the previous account won't resolve under the new one.
  qc.setQueryData(keys.local.selectedPRId, null)
  const prDetail = qc.getQueryData<{ isOpen: boolean; width: number }>(keys.prDetailPanel)
  if (prDetail?.isOpen) {
    qc.setQueryData(keys.prDetailPanel, { ...prDetail, isOpen: false })
  }
}

/** Make `account` the active one: mirror its token + identity, refetch repos. */
function activateAccount(qc: QueryClient, account: Account): void {
  qc.setQueryData(keys.activeAccountId, account.id)
  // Single source of truth for the whole GitHub layer + Claude CLI PR context.
  qc.setQueryData(keys.githubToken, account.token)
  clearGitHubCacheForSwitch(qc)
  // Seed identity from the cached snapshot so the header renders with no flash;
  // useCurrentUser will revalidate in the background.
  qc.setQueryData(keys.user, { user: account.user, token: account.token })
  qc.setQueryData(keys.currentUser, account.user)
  qc.refetchQueries({ queryKey: keys.repos })
}

/**
 * Insert or update an account from a freshly validated token + profile, then
 * activate it. Dedupes by login (case-insensitive). Called by every sign-in
 * path so first sign-in and add-account share behaviour.
 */
export function upsertAccountAndActivate(
  qc: QueryClient,
  token: string,
  user: GitHubUser
): Account {
  const accounts = qc.getQueryData<Account[]>(keys.accounts) ?? []
  const existingIdx = accounts.findIndex((a) => a.id.toLowerCase() === user.login.toLowerCase())
  const account: Account = {
    id: user.login,
    user,
    token,
    addedAt: existingIdx >= 0 ? accounts[existingIdx].addedAt : Date.now()
  }
  const next =
    existingIdx >= 0
      ? accounts.map((a, i) => (i === existingIdx ? account : a))
      : [...accounts, account]

  qc.setQueryData(keys.accounts, next)
  activateAccount(qc, account)
  return account
}

// ─── Public hooks ───────────────────────────────────────────────────────────

/** Switch the active account to an already-signed-in one. */
export function useSwitchAccount(): UseMutationResult<Account, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const accounts = qc.getQueryData<Account[]>(keys.accounts) ?? []
      const account = accounts.find((a) => a.id === accountId)
      if (!account) throw new Error(`Account "${accountId}" not found`)
      return account
    },
    onSuccess: (account) => {
      activateAccount(qc, account)
    }
  })
}

/**
 * Remove an account. If it was active, switch to the first remaining account;
 * if none remain, sign out entirely (drops the app back to the sign-in screen).
 */
export function useRemoveAccount(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => accountId,
    onSuccess: (accountId) => {
      const accounts = qc.getQueryData<Account[]>(keys.accounts) ?? []
      const wasActive = qc.getQueryData<string | null>(keys.activeAccountId) === accountId
      const remaining = accounts.filter((a) => a.id !== accountId)

      // Drop the removed account's per-account settings.
      qc.removeQueries({ queryKey: keys.selectedReposFor(accountId) })
      qc.setQueryData(keys.accounts, remaining)

      if (remaining.length === 0) {
        // Full sign-out.
        qc.setQueryData(keys.activeAccountId, null)
        qc.setQueryData(keys.githubToken, null)
        qc.setQueryData(keys.user, null)
        qc.setQueryData(keys.currentUser, null)
        clearETagCache()
        qc.removeQueries({ predicate: (q) => (q.queryKey[0] as string) === 'github' })
      } else if (wasActive) {
        activateAccount(qc, remaining[0])
      }
    }
  })
}

/**
 * One-time migration from the single-account model: if there are no accounts
 * yet but a legacy `keys.githubToken` exists, adopt it as the first account and
 * carry over the legacy global selected-repos list. No-op once migrated.
 */
export function useMigrateAccounts(): UseMutationResult<boolean, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const accounts = qc.getQueryData<Account[]>(keys.accounts) ?? []
      if (accounts.length > 0) return false // already migrated

      const legacyToken = qc.getQueryData<string>(keys.githubToken)
      if (!legacyToken) return false // nothing to migrate (signed out)

      // Need the profile to build the account snapshot. If we can't reach GitHub,
      // skip this launch — the token still works and migration retries next time.
      let user: GitHubUser
      try {
        const result = await github.validateToken(legacyToken)
        if (!result.valid || !result.user) return false // invalid token — leave for validatePersistedToken to clear
        user = result.user as GitHubUser
      } catch {
        return false
      }

      const account: Account = {
        id: user.login,
        user,
        token: legacyToken,
        addedAt: Date.now()
      }
      qc.setQueryData(keys.accounts, [account])
      qc.setQueryData(keys.activeAccountId, account.id)
      qc.setQueryData(keys.currentUser, user)
      qc.setQueryData(keys.user, { user, token: legacyToken })

      // Carry the legacy global selected repos into the account's namespaced key.
      const legacyRepos = qc.getQueryData<string[]>(keys.selectedRepos)
      if (legacyRepos && legacyRepos.length > 0) {
        qc.setQueryData(keys.selectedReposFor(account.id), legacyRepos)
      }
      return true
    }
  })
}
