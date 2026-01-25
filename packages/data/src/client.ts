/**
 * @codelobby/data - TanStack Query Client with Persistence
 */

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient = new QueryClient({
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
      // Persist settings, AI data, local state, and GitHub data (for faster startup)
      const key = query.queryKey[0]
      return key === 'settings' || key === 'ai' || key === 'local' || key === 'github'
    }
  }
})

export { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
