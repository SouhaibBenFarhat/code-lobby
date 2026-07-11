/**
 * Multi-account Queries
 *
 * A user can be signed into several GitHub accounts; exactly one is active.
 * The accounts list and the active id are persisted (settings prefix). The
 * ACTIVE account's token is mirrored into `keys.githubToken`, so the rest of the
 * app keeps reading a single token source of truth (see mutations/accounts.ts).
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { Account } from '../types'

function getPersisted<T>(key: readonly unknown[], defaultValue: T): T {
  return (queryClient.getQueryData(key) as T | undefined) ?? defaultValue
}

/** All signed-in accounts (persisted). */
export function useAccounts(): UseQueryResult<Account[], Error> {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: (): Account[] => getPersisted<Account[]>(keys.accounts, []),
    staleTime: Number.POSITIVE_INFINITY
  })
}

/** Id (GitHub login) of the active account, or null when signed out. */
export function useActiveAccountId(): UseQueryResult<string | null, Error> {
  return useQuery({
    queryKey: keys.activeAccountId,
    queryFn: (): string | null => getPersisted<string | null>(keys.activeAccountId, null),
    staleTime: Number.POSITIVE_INFINITY
  })
}

/** The currently active account object (derived), or null. */
export function useActiveAccount(): Account | null {
  const { data: accounts = [] } = useAccounts()
  const { data: activeId = null } = useActiveAccountId()
  return accounts.find((a) => a.id === activeId) ?? null
}
