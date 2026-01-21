/**
 * Main Entry Point - Modular Architecture
 *
 * This entry point uses the fully modular app architecture:
 * - Components are self-contained in packages/
 * - UI modules register themselves to slots
 * - Data flows through the shared store
 * - TanStack Query handles caching with automatic persistence
 */

import { QueryClient } from '@tanstack/react-query'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

// Bootstrap the modular app (initializes data module + registers all UI modules)
import { App, bootstrap } from '@codelobby/app'

// Initialize the app
bootstrap()

// ═══════════════════════════════════════════════════════════════════════════
// TANSTACK QUERY CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// This is the STANDARDIZED way to handle caching in React apps.
// - staleTime: How long data is considered "fresh"
// - gcTime: How long to keep data in memory after it's unused
// - refetchOnWindowFocus: Automatically refresh when user returns to app

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      refetchOnWindowFocus: true, // Refresh when window gains focus
      retry: 1
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// ELECTRON PERSISTER - Custom persister using IPC
// ═══════════════════════════════════════════════════════════════════════════
// This allows TanStack Query's cache to survive app restarts.
// The cache is stored in config.json via electron-store.

const electronPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      const serialized = JSON.stringify(client)
      await window.electron.setQueryCache(serialized)
    } catch (error) {
      console.error('[TanStack Persist] Failed to save cache:', error)
    }
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const data = await window.electron.getQueryCache()
      if (data) {
        return JSON.parse(data) as PersistedClient
      }
      return undefined
    } catch (error) {
      console.error('[TanStack Persist] Failed to restore cache:', error)
      return undefined
    }
  },
  removeClient: async () => {
    try {
      await window.electron.clearQueryCache()
    } catch (error) {
      console.error('[TanStack Persist] Failed to clear cache:', error)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER WITH PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
// PersistQueryClientProvider automatically:
// 1. Restores cache from disk on app start
// 2. Persists cache to disk when data changes (debounced)
// 3. Hydrates queries with cached data immediately

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: electronPersister,
        maxAge: 30 * 60 * 1000, // Cache expires after 30 minutes
        buster: 'v1' // Change this to invalidate all caches
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
)
