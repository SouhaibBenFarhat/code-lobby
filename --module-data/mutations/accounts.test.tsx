/**
 * Multi-account Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as github from '../github'
import { keys } from '../keys'
import type { Account, GitHubUser } from '../types'
import {
  upsertAccountAndActivate,
  useMigrateAccounts,
  useRemoveAccount,
  useSwitchAccount
} from './accounts'

vi.mock('../github', () => ({
  validateToken: vi.fn()
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeUser(login: string): GitHubUser {
  return {
    login,
    avatar_url: `https://github.com/${login}.png`,
    name: `${login} name`,
    html_url: `https://github.com/${login}`
  }
}

describe('Account Mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Number.POSITIVE_INFINITY,
          staleTime: Number.POSITIVE_INFINITY
        },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('upsertAccountAndActivate', () => {
    it('creates the first account and activates it', () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))

      const accounts = queryClient.getQueryData<Account[]>(keys.accounts)
      expect(accounts).toHaveLength(1)
      expect(accounts?.[0].id).toBe('alice')
      expect(accounts?.[0].token).toBe('tok-a')
      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('alice')
      expect(queryClient.getQueryData(keys.githubToken)).toBe('tok-a')
      expect(queryClient.getQueryData(keys.currentUser)).toMatchObject({ login: 'alice' })
    })

    it('appends a second distinct account and activates it', () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))
      upsertAccountAndActivate(queryClient, 'tok-b', makeUser('bob'))

      const accounts = queryClient.getQueryData<Account[]>(keys.accounts)
      expect(accounts?.map((a) => a.id)).toEqual(['alice', 'bob'])
      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('bob')
      expect(queryClient.getQueryData(keys.githubToken)).toBe('tok-b')
    })

    it('dedupes by login (case-insensitive) and refreshes the token', () => {
      upsertAccountAndActivate(queryClient, 'tok-old', makeUser('alice'))
      upsertAccountAndActivate(queryClient, 'tok-new', { ...makeUser('alice'), login: 'Alice' })

      const accounts = queryClient.getQueryData<Account[]>(keys.accounts)
      expect(accounts).toHaveLength(1)
      expect(accounts?.[0].token).toBe('tok-new')
    })

    it('clears stale github data and selection when activating', () => {
      queryClient.setQueryData(keys.repos, [{ name: 'repo1' }])
      queryClient.setQueryData(keys.local.selectedPRId, 'pr-x')

      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))

      expect(queryClient.getQueryData(keys.repos)).toBeUndefined()
      expect(queryClient.getQueryData(keys.local.selectedPRId)).toBeNull()
    })
  })

  describe('useSwitchAccount', () => {
    it('switches the active account and its token', async () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))
      upsertAccountAndActivate(queryClient, 'tok-b', makeUser('bob')) // active = bob

      const { result } = renderHook(() => useSwitchAccount(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('alice')
      })

      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('alice')
      expect(queryClient.getQueryData(keys.githubToken)).toBe('tok-a')
      expect(queryClient.getQueryData(keys.currentUser)).toMatchObject({ login: 'alice' })
    })

    it('throws for an unknown account', async () => {
      const { result } = renderHook(() => useSwitchAccount(), {
        wrapper: createWrapper(queryClient)
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync('ghost')
        })
      ).rejects.toThrow(/not found/)
    })
  })

  describe('useRemoveAccount', () => {
    it('removes a non-active account and its selected repos', async () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))
      upsertAccountAndActivate(queryClient, 'tok-b', makeUser('bob')) // active = bob
      queryClient.setQueryData(keys.selectedReposFor('alice'), ['org/a'])

      const { result } = renderHook(() => useRemoveAccount(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('alice')
      })

      expect(queryClient.getQueryData<Account[]>(keys.accounts)?.map((a) => a.id)).toEqual(['bob'])
      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('bob')
      expect(queryClient.getQueryData(keys.selectedReposFor('alice'))).toBeUndefined()
    })

    it('switches to another account when the active one is removed', async () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))
      upsertAccountAndActivate(queryClient, 'tok-b', makeUser('bob')) // active = bob

      const { result } = renderHook(() => useRemoveAccount(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('bob')
      })

      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('alice')
      expect(queryClient.getQueryData(keys.githubToken)).toBe('tok-a')
    })

    it('fully signs out when the last account is removed', async () => {
      upsertAccountAndActivate(queryClient, 'tok-a', makeUser('alice'))

      const { result } = renderHook(() => useRemoveAccount(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('alice')
      })

      expect(queryClient.getQueryData<Account[]>(keys.accounts)).toEqual([])
      expect(queryClient.getQueryData(keys.activeAccountId)).toBeNull()
      expect(queryClient.getQueryData(keys.githubToken)).toBeNull()
    })
  })

  describe('useMigrateAccounts', () => {
    it('adopts a legacy token as the first account and carries selected repos', async () => {
      queryClient.setQueryData(keys.githubToken, 'legacy-token')
      queryClient.setQueryData(keys.selectedRepos, ['org/legacy'])
      vi.mocked(github.validateToken).mockResolvedValue({ valid: true, user: makeUser('legacy') })

      const { result } = renderHook(() => useMigrateAccounts(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        expect(await result.current.mutateAsync()).toBe(true)
      })

      expect(queryClient.getQueryData<Account[]>(keys.accounts)?.[0].id).toBe('legacy')
      expect(queryClient.getQueryData(keys.activeAccountId)).toBe('legacy')
      expect(queryClient.getQueryData(keys.selectedReposFor('legacy'))).toEqual(['org/legacy'])
    })

    it('no-ops when accounts already exist', async () => {
      queryClient.setQueryData(keys.accounts, [
        { id: 'alice', user: makeUser('alice'), token: 't', addedAt: 1 }
      ])
      queryClient.setQueryData(keys.githubToken, 'legacy')

      const { result } = renderHook(() => useMigrateAccounts(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        expect(await result.current.mutateAsync()).toBe(false)
      })
      expect(github.validateToken).not.toHaveBeenCalled()
    })

    it('no-ops when there is no legacy token', async () => {
      const { result } = renderHook(() => useMigrateAccounts(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        expect(await result.current.mutateAsync()).toBe(false)
      })
      expect(github.validateToken).not.toHaveBeenCalled()
    })

    it('skips migration on a network error', async () => {
      queryClient.setQueryData(keys.githubToken, 'legacy')
      vi.mocked(github.validateToken).mockRejectedValue(new Error('offline'))

      const { result } = renderHook(() => useMigrateAccounts(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        expect(await result.current.mutateAsync()).toBe(false)
      })
      expect(queryClient.getQueryData<Account[]>(keys.accounts) ?? []).toEqual([])
    })
  })
})
