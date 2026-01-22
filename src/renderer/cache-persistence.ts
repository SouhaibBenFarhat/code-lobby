/**
 * Cache Persistence Utilities
 *
 * Utilities for TanStack Query cache persistence with change detection
 * and throttling to prevent excessive disk writes.
 */

import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PersistenceConfig {
  /** How often to persist at most (in ms) */
  throttleMs: number
  /** Function to save the cache */
  saveCache: (data: string) => Promise<void>
  /** Function to load the cache */
  loadCache: () => Promise<string | null>
  /** Function to clear the cache */
  clearCache: () => Promise<void>
}

export interface PersisterState {
  persistTimeout: ReturnType<typeof setTimeout> | null
  pendingClient: PersistedClient | null
  lastPersistedHash: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
// HASH FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a hash from the PersistedClient to detect if data actually changed.
 * Only considers query keys and data length (not metadata like timestamps).
 *
 * This is much faster than comparing full JSON strings and effectively
 * detects when actual data changes vs internal TanStack state changes.
 */
export function hashClient(client: PersistedClient): string {
  const queries = client.clientState?.queries || []

  const dataKeys = queries.map((q) => {
    // Create a key from the query key array
    const key = Array.isArray(q.queryKey) ? q.queryKey.join(':') : String(q.queryKey)

    // Include a hash of the data to detect actual data changes
    // Using length as a quick proxy - if data changes, length usually changes
    const dataHash = q.state?.data !== undefined ? JSON.stringify(q.state.data).length : 0

    return `${key}:${dataHash}`
  })

  // Sort for consistent ordering
  return dataKeys.sort().join('|')
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY WHITELIST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Queries that should be persisted to disk.
 * Only important data queries, not transient state.
 */
export const PERSISTED_QUERY_PREFIXES: readonly string[] = [
  'repos',
  'prs',
  'prFiles',
  'allPrs',
  'rateLimit',
  'selectedRepos',
  'cardLayouts',
  'repoColors',
  'minimizedRepos',
  'viewMode',
  'ideSettings',
  'aiPanel',
  'prDetailPanel',
  'claudeApiKey',
  'selectedModel',
  'enableThinking',
  'chatHistory',
  'prChats',
  'customPrompts'
] as const

/**
 * Check if a query key should be persisted
 */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const firstKey = queryKey[0]
  if (typeof firstKey !== 'string') return false
  return PERSISTED_QUERY_PREFIXES.some((prefix) => firstKey.startsWith(prefix))
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTER FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a throttled persister with change detection
 */
export function createThrottledPersister(config: PersistenceConfig): {
  persister: Persister
  state: PersisterState
  doPersist: () => Promise<void>
} {
  const state: PersisterState = {
    persistTimeout: null,
    pendingClient: null,
    lastPersistedHash: null
  }

  const doPersist = async (): Promise<void> => {
    if (!state.pendingClient) return

    // Check if anything actually changed
    const newHash = hashClient(state.pendingClient)
    if (newHash === state.lastPersistedHash) {
      state.pendingClient = null
      return // Nothing changed, skip save
    }

    const client = state.pendingClient
    state.pendingClient = null
    state.lastPersistedHash = newHash

    try {
      const serialized = JSON.stringify(client)
      await config.saveCache(serialized)
    } catch (error) {
      console.error('[TanStack Persist] Failed to save cache:', error)
    }
  }

  const persister: Persister = {
    persistClient: async (client: PersistedClient) => {
      // Store the latest client state
      state.pendingClient = client

      // If no timeout is pending, set one
      if (!state.persistTimeout) {
        state.persistTimeout = setTimeout(() => {
          state.persistTimeout = null
          doPersist()
        }, config.throttleMs)
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const data = await config.loadCache()
        if (data) {
          const client = JSON.parse(data) as PersistedClient
          // Initialize hash from restored data
          state.lastPersistedHash = hashClient(client)
          return client
        }
        return undefined
      } catch (error) {
        console.error('[TanStack Persist] Failed to restore cache:', error)
        return undefined
      }
    },

    removeClient: async () => {
      // Clear any pending persist
      if (state.persistTimeout) {
        clearTimeout(state.persistTimeout)
        state.persistTimeout = null
      }
      state.pendingClient = null
      state.lastPersistedHash = null
      try {
        await config.clearCache()
      } catch (error) {
        console.error('[TanStack Persist] Failed to clear cache:', error)
      }
    }
  }

  return { persister, state, doPersist }
}
