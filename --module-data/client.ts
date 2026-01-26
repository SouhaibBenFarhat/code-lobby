/**
 * @codelobby/data - TanStack Query Client with Persistence
 */

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - needed for persistence
      retry: 1,
      refetchOnWindowFocus: false
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

// Persist queries to localStorage
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist settings, AI data, and local UI state
      // GitHub API data should always be fetched fresh (avoids stale mergeable status, etc.)
      const key = query.queryKey[0]
      return key === 'settings' || key === 'ai' || key === 'local'
    }
  }
})

export { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
