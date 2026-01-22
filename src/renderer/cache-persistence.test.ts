/**
 * Cache Persistence Tests
 *
 * Tests for the TanStack Query cache persistence utilities
 */

import type { PersistedClient } from '@tanstack/react-query-persist-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistenceConfig } from './cache-persistence'
import {
  createThrottledPersister,
  hashClient,
  PERSISTED_QUERY_PREFIXES,
  shouldPersistQuery
} from './cache-persistence'

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function createMockClient(
  queries: Array<{ queryKey: unknown[]; data?: unknown }>
): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: 'v1',
    clientState: {
      queries: queries.map((q) => ({
        queryKey: q.queryKey,
        queryHash: JSON.stringify(q.queryKey),
        state: {
          data: q.data,
          dataUpdatedAt: Date.now(),
          dataUpdateCount: 1,
          error: null,
          errorUpdatedAt: 0,
          errorUpdateCount: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          fetchStatus: 'idle' as const,
          isInvalidated: false,
          status: 'success' as const
        }
      })),
      mutations: []
    }
  }
}

function createMockConfig(overrides: Partial<PersistenceConfig> = {}): PersistenceConfig {
  return {
    throttleMs: 5000,
    saveCache: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    loadCache: vi.fn<[], Promise<string | null>>().mockResolvedValue(null),
    clearCache: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
    ...overrides
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HASH CLIENT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('hashClient', () => {
  it('should return empty string for client with no queries', () => {
    const client = createMockClient([])
    expect(hashClient(client)).toBe('')
  })

  it('should create consistent hash for same data', () => {
    const client1 = createMockClient([
      { queryKey: ['repos'], data: [{ id: 1, name: 'repo1' }] },
      { queryKey: ['prs', 'owner/repo'], data: [{ id: 1, title: 'PR 1' }] }
    ])

    const client2 = createMockClient([
      { queryKey: ['repos'], data: [{ id: 1, name: 'repo1' }] },
      { queryKey: ['prs', 'owner/repo'], data: [{ id: 1, title: 'PR 1' }] }
    ])

    expect(hashClient(client1)).toBe(hashClient(client2))
  })

  it('should produce different hash when data changes', () => {
    const client1 = createMockClient([{ queryKey: ['repos'], data: [{ id: 1, name: 'repo1' }] }])

    const client2 = createMockClient([
      {
        queryKey: ['repos'],
        data: [
          { id: 1, name: 'repo1' },
          { id: 2, name: 'repo2' }
        ]
      }
    ])

    expect(hashClient(client1)).not.toBe(hashClient(client2))
  })

  it('should produce same hash regardless of query order', () => {
    const client1 = createMockClient([
      { queryKey: ['repos'], data: ['a'] },
      { queryKey: ['prs'], data: ['b'] }
    ])

    const client2 = createMockClient([
      { queryKey: ['prs'], data: ['b'] },
      { queryKey: ['repos'], data: ['a'] }
    ])

    expect(hashClient(client1)).toBe(hashClient(client2))
  })

  it('should handle nested query keys', () => {
    const client = createMockClient([
      { queryKey: ['prs', 'owner', 'repo', 123], data: { title: 'PR' } }
    ])

    const hash = hashClient(client)
    expect(hash).toContain('prs:owner:repo:123')
  })

  it('should differentiate between undefined and empty data', () => {
    const clientWithUndefined = createMockClient([{ queryKey: ['test'], data: undefined }])

    const clientWithEmpty = createMockClient([{ queryKey: ['test'], data: [] }])

    expect(hashClient(clientWithUndefined)).not.toBe(hashClient(clientWithEmpty))
  })

  it('should handle null clientState gracefully', () => {
    const client = {
      timestamp: Date.now(),
      buster: 'v1',
      clientState: null as unknown as PersistedClient['clientState']
    }

    expect(hashClient(client)).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SHOULD PERSIST QUERY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('shouldPersistQuery', () => {
  it('should return true for whitelisted query keys', () => {
    expect(shouldPersistQuery(['repos'])).toBe(true)
    expect(shouldPersistQuery(['prs', 'owner/repo'])).toBe(true)
    expect(shouldPersistQuery(['prFiles', 'owner', 'repo', 1])).toBe(true)
    expect(shouldPersistQuery(['allPrs'])).toBe(true)
    expect(shouldPersistQuery(['selectedRepos'])).toBe(true)
    expect(shouldPersistQuery(['viewMode'])).toBe(true)
    expect(shouldPersistQuery(['chatHistory'])).toBe(true)
  })

  it('should return false for non-whitelisted query keys', () => {
    expect(shouldPersistQuery(['logs'])).toBe(false)
    expect(shouldPersistQuery(['logs-summary'])).toBe(false)
    expect(shouldPersistQuery(['randomQuery'])).toBe(false)
    expect(shouldPersistQuery(['temporary-data'])).toBe(false)
  })

  it('should return false for non-string first key', () => {
    expect(shouldPersistQuery([123])).toBe(false)
    expect(shouldPersistQuery([{ key: 'repos' }])).toBe(false)
    expect(shouldPersistQuery([null])).toBe(false)
  })

  it('should handle prefix matching correctly', () => {
    // Should match 'repos' prefix
    expect(shouldPersistQuery(['reposExtra'])).toBe(true)
    // Should match 'prs' prefix
    expect(shouldPersistQuery(['prsData'])).toBe(true)
  })

  it('should have all expected prefixes', () => {
    // Verify key prefixes are included
    const expectedPrefixes = [
      'repos',
      'prs',
      'prFiles',
      'allPrs',
      'selectedRepos',
      'cardLayouts',
      'viewMode',
      'chatHistory',
      'prChats',
      'claudeApiKey'
    ]

    for (const prefix of expectedPrefixes) {
      expect(PERSISTED_QUERY_PREFIXES).toContain(prefix)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// THROTTLED PERSISTER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('createThrottledPersister', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('throttling', () => {
    it('should not save immediately', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      const client = createMockClient([{ queryKey: ['repos'], data: ['test'] }])
      await persister.persistClient(client)

      expect(config.saveCache).not.toHaveBeenCalled()
    })

    it('should save after throttle time', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      const client = createMockClient([{ queryKey: ['repos'], data: ['test'] }])
      await persister.persistClient(client)

      // Fast forward past throttle time
      await vi.advanceTimersByTimeAsync(5000)

      expect(config.saveCache).toHaveBeenCalledTimes(1)
    })

    it('should only save once within throttle window', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      // Simulate multiple rapid cache updates
      for (let i = 0; i < 10; i++) {
        const client = createMockClient([{ queryKey: ['repos'], data: [`test${i}`] }])
        await persister.persistClient(client)
      }

      // Fast forward past throttle time
      await vi.advanceTimersByTimeAsync(5000)

      // Should only save once with the latest data
      expect(config.saveCache).toHaveBeenCalledTimes(1)
    })

    it('should save the latest data, not intermediate states', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      // First update
      await persister.persistClient(createMockClient([{ queryKey: ['repos'], data: ['first'] }]))

      // Second update (this should be saved)
      await persister.persistClient(createMockClient([{ queryKey: ['repos'], data: ['second'] }]))

      await vi.advanceTimersByTimeAsync(5000)

      expect(config.saveCache).toHaveBeenCalledTimes(1)
      const mockFn = config.saveCache as ReturnType<typeof vi.fn>
      const savedData = JSON.parse(mockFn.mock.calls[0][0])
      expect(savedData.clientState.queries[0].state.data).toEqual(['second'])
    })
  })

  describe('change detection', () => {
    it('should not save if data has not changed', async () => {
      const config = createMockConfig()
      const { persister, doPersist } = createThrottledPersister(config)

      const client = createMockClient([{ queryKey: ['repos'], data: ['test'] }])

      // First persist
      await persister.persistClient(client)
      await vi.advanceTimersByTimeAsync(5000)
      expect(config.saveCache).toHaveBeenCalledTimes(1)

      // Second persist with same data
      await persister.persistClient(client)
      await doPersist()

      // Should not save again
      expect(config.saveCache).toHaveBeenCalledTimes(1)
    })

    it('should save if data has changed', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      // First persist
      const client1 = createMockClient([{ queryKey: ['repos'], data: ['test1'] }])
      await persister.persistClient(client1)
      await vi.advanceTimersByTimeAsync(5000)
      expect(config.saveCache).toHaveBeenCalledTimes(1)

      // Second persist with different data - need to wait for throttle window
      const client2 = createMockClient([{ queryKey: ['repos'], data: ['test2', 'extra'] }])
      await persister.persistClient(client2)
      await vi.advanceTimersByTimeAsync(5000)

      expect(config.saveCache).toHaveBeenCalledTimes(2)
    })

    it('should initialize hash from restored data', async () => {
      const storedClient = createMockClient([{ queryKey: ['repos'], data: ['stored'] }])
      const config = createMockConfig({
        loadCache: vi
          .fn<[], Promise<string | null>>()
          .mockResolvedValue(JSON.stringify(storedClient))
      })

      const { persister, state } = createThrottledPersister(config)

      await persister.restoreClient()

      // Hash should be initialized
      expect(state.lastPersistedHash).not.toBeNull()
      expect(state.lastPersistedHash).toBe(hashClient(storedClient))
    })
  })

  describe('restoreClient', () => {
    it('should return undefined if no cache exists', async () => {
      const config = createMockConfig({
        loadCache: vi.fn<[], Promise<string | null>>().mockResolvedValue(null)
      })

      const { persister } = createThrottledPersister(config)

      const result = await persister.restoreClient()
      expect(result).toBeUndefined()
    })

    it('should return parsed client if cache exists', async () => {
      const storedClient = createMockClient([{ queryKey: ['repos'], data: ['stored'] }])
      const config = createMockConfig({
        loadCache: vi
          .fn<[], Promise<string | null>>()
          .mockResolvedValue(JSON.stringify(storedClient))
      })

      const { persister } = createThrottledPersister(config)

      const result = await persister.restoreClient()
      expect(result).toBeDefined()
      expect(result?.clientState.queries[0].state.data).toEqual(['stored'])
    })

    it('should handle parse errors gracefully', async () => {
      const config = createMockConfig({
        loadCache: vi.fn<[], Promise<string | null>>().mockResolvedValue('invalid json{')
      })

      const { persister } = createThrottledPersister(config)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await persister.restoreClient()

      expect(result).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('removeClient', () => {
    it('should clear pending state', async () => {
      const config = createMockConfig()
      const { persister, state } = createThrottledPersister(config)

      // Set up pending state
      const client = createMockClient([{ queryKey: ['repos'], data: ['test'] }])
      await persister.persistClient(client)

      expect(state.pendingClient).not.toBeNull()
      expect(state.persistTimeout).not.toBeNull()

      // Remove client
      await persister.removeClient()

      expect(state.pendingClient).toBeNull()
      expect(state.persistTimeout).toBeNull()
      expect(state.lastPersistedHash).toBeNull()
      expect(config.clearCache).toHaveBeenCalled()
    })

    it('should cancel pending timeout', async () => {
      const config = createMockConfig()
      const { persister } = createThrottledPersister(config)

      // Set up pending persist
      const client = createMockClient([{ queryKey: ['repos'], data: ['test'] }])
      await persister.persistClient(client)

      // Remove before timeout fires
      await persister.removeClient()

      // Advance time - save should NOT happen
      await vi.advanceTimersByTimeAsync(5000)

      expect(config.saveCache).not.toHaveBeenCalled()
    })
  })
})
