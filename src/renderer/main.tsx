/**
 * Main Entry Point - Modular Architecture
 *
 * This entry point uses the fully modular app architecture:
 * - Components are self-contained in packages/
 * - UI modules register themselves to slots
 * - Data flows through the shared store
 * - TanStack Query handles caching with automatic persistence
 */

import { api } from '@codelobby/api'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

// Bootstrap the modular app (initializes data module + registers all UI modules)
import { App, bootstrap } from '@codelobby/app'

// Cache persistence utilities (throttled, with change detection)
import { createThrottledPersister, hashClient, shouldPersistQuery } from './cache-persistence'

// Initialize the app
bootstrap()

// ═══════════════════════════════════════════════════════════════════════════
// TANSTACK QUERY CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// This is the STANDARDIZED way to handle caching in React apps.
// - staleTime: How long data is considered "fresh"
// - gcTime: How long to keep data in memory after it's unused
// - refetchOnWindowFocus: Disabled for desktop apps (causes cache churn)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Disabled - causes cache churn in Electron
      refetchOnReconnect: false, // Not needed for desktop app
      retry: 1
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ELECTRON PERSISTER - Throttled with change detection
// ═══════════════════════════════════════════════════════════════════════════
// Uses the cache-persistence module which:
// 1. Throttles saves to max once every 10 seconds
// 2. Detects actual data changes via hashing (skips redundant saves)
// 3. Only persists whitelisted queries (not transient state)

const { persister: electronPersister, state: persisterState } = createThrottledPersister({
  throttleMs: 10000, // Only persist every 10 seconds max
  saveCache: (data) => api.settings.setQueryCache(data).then(() => {}),
  loadCache: () => api.settings.getQueryCache(),
  clearCache: () => api.settings.clearQueryCache().then(() => {})
})

// Persist any pending changes before the window closes
window.addEventListener('beforeunload', () => {
  if (persisterState.pendingClient) {
    const newHash = hashClient(persisterState.pendingClient)
    if (newHash !== persisterState.lastPersistedHash) {
      const serialized = JSON.stringify(persisterState.pendingClient)
      api.settings.setQueryCache(serialized)
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// RENDER WITH PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
// PersistQueryClientProvider automatically:
// 1. Restores cache from disk on app start
// 2. Persists cache to disk when data changes (throttled)
// 3. Hydrates queries with cached data immediately

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: electronPersister,
        maxAge: 30 * 60 * 1000, // Cache expires after 30 minutes
        buster: 'v1', // Change this to invalidate all caches
        dehydrateOptions: {
          // Only persist successful queries with actual data
          shouldDehydrateQuery: (query) => {
            // Don't persist failed or loading queries
            if (query.state.status !== 'success') return false
            // Don't persist queries without data
            if (query.state.data === undefined) return false
            // Only persist queries in our whitelist
            return shouldPersistQuery(query.queryKey)
          }
        }
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
)
