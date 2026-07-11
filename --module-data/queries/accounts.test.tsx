/**
 * Multi-account Queries Tests
 *
 * The query hooks read through `getPersisted`, which reads the shared singleton
 * queryClient (from ../client). We therefore drive them via that same client.
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { Account } from '../types'
import { useAccounts, useActiveAccount, useActiveAccountId } from './accounts'

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const alice: Account = {
  id: 'alice',
  user: { login: 'alice', avatar_url: '', name: 'Alice', html_url: '' },
  token: 't-a',
  addedAt: 1
}
const bob: Account = {
  id: 'bob',
  user: { login: 'bob', avatar_url: '', name: 'Bob', html_url: '' },
  token: 't-b',
  addedAt: 2
}

describe('Account Queries', () => {
  beforeEach(() => {
    queryClient.clear()
  })

  it('useAccounts defaults to an empty list', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it('useAccounts returns the stored accounts', () => {
    queryClient.setQueryData(keys.accounts, [alice, bob])
    const { result } = renderHook(() => useAccounts(), { wrapper })
    expect(result.current.data).toEqual([alice, bob])
  })

  it('useActiveAccountId reflects the stored id (null by default)', async () => {
    const first = renderHook(() => useActiveAccountId(), { wrapper })
    await waitFor(() => expect(first.result.current.data).toBeNull())

    queryClient.setQueryData(keys.activeAccountId, 'bob')
    const second = renderHook(() => useActiveAccountId(), { wrapper })
    expect(second.result.current.data).toBe('bob')
  })

  it('useActiveAccount derives the active account object', () => {
    queryClient.setQueryData(keys.accounts, [alice, bob])
    queryClient.setQueryData(keys.activeAccountId, 'bob')
    const { result } = renderHook(() => useActiveAccount(), { wrapper })
    expect(result.current).toEqual(bob)
  })

  it('useActiveAccount returns null when nothing is active', () => {
    queryClient.setQueryData(keys.accounts, [alice])
    const { result } = renderHook(() => useActiveAccount(), { wrapper })
    expect(result.current).toBeNull()
  })
})
