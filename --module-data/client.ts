/**
 * @codelobby/data - TanStack Query Client with Persistence
 */

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache for persistence
      retry: 1,
      refetchOnWindowFocus: true // Refetch stale data when app regains focus
    },
    mutations: {
      retry: 0
    }
  }
})

// Persist to localStorage
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined
})

// Track hydration state
let isHydrated = false
let hydrateResolve: (() => void) | null = null
const hydratePromise = new Promise<void>((resolve) => {
  hydrateResolve = resolve
})

// Persist queries to localStorage
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist settings, ai, and local queries
      const key = query.queryKey[0] as string
      return key === 'settings' || key === 'ai' || key === 'local'
    }
  }
})

// Mark as hydrated after a tick (gives persist time to restore)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    isHydrated = true
    hydrateResolve?.()
  }, 0)
}

/** Check if cache has been hydrated from localStorage */
export function isQueryCacheHydrated(): boolean {
  return isHydrated
}

/** Wait for cache hydration to complete */
export function waitForHydration(): Promise<void> {
  return hydratePromise
}

export { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
