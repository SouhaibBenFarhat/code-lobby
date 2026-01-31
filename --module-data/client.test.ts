/**
 * Client Tests - Hydration utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Setup window mock before importing the module
vi.stubGlobal('window', {
  localStorage: localStorageMock
})

describe('Client Hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('isQueryCacheHydrated returns false initially then true after setTimeout', async () => {
    // Dynamic import to get fresh module state
    vi.resetModules()
    const { isQueryCacheHydrated } = await import('./client')

    // Initially should be false (before setTimeout fires)
    expect(isQueryCacheHydrated()).toBe(false)

    // Advance timer to trigger the setTimeout(0) callback
    await vi.advanceTimersByTimeAsync(0)

    // Now should be true
    expect(isQueryCacheHydrated()).toBe(true)
  })

  it('waitForHydration resolves after setTimeout', async () => {
    vi.resetModules()
    const { waitForHydration } = await import('./client')

    let resolved = false
    const promise = waitForHydration().then(() => {
      resolved = true
    })

    // Should not be resolved yet
    expect(resolved).toBe(false)

    // Advance timer
    await vi.advanceTimersByTimeAsync(0)

    // Wait for promise to complete
    await promise

    // Now should be resolved
    expect(resolved).toBe(true)
  })

  it('queryClient is exported and is a QueryClient instance', async () => {
    vi.resetModules()
    const { queryClient } = await import('./client')

    expect(queryClient).toBeDefined()
    expect(typeof queryClient.getQueryData).toBe('function')
    expect(typeof queryClient.setQueryData).toBe('function')
  })
})
