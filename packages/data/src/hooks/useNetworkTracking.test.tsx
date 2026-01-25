/**
 * Network Tracking Hook Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'
import { useNetworkTracking } from './useNetworkTracking'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useNetworkTracking', () => {
  let queryClient: QueryClient
  let originalFetch: typeof fetch

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false }
      }
    })
    // Save original fetch
    originalFetch = window.fetch
  })

  afterEach(() => {
    // Restore original fetch
    window.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('intercepts fetch calls and tracks requests', async () => {
    // Setup mock fetch
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      clone: () => ({
        text: () => Promise.resolve('{"data": "test"}')
      })
    }
    window.fetch = vi.fn().mockResolvedValue(mockResponse)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    // Make a fetch request
    await act(async () => {
      await window.fetch('https://api.example.com/data', { method: 'GET' })
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    expect(requests).toBeDefined()
    expect(requests?.length).toBeGreaterThanOrEqual(1)

    const lastRequest = requests?.[requests.length - 1]
    expect(lastRequest?.url).toBe('https://api.example.com/data')
    expect(lastRequest?.status).toBe('success')
    expect(lastRequest?.statusCode).toBe(200)

    unmount()
  })

  it('tracks pending requests before completion', async () => {
    let resolveRequest: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolveRequest = resolve
    })

    window.fetch = vi.fn().mockReturnValue(pendingPromise)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    // Start a request but don't await it
    act(() => {
      window.fetch('https://api.example.com/slow', { method: 'GET' })
    })

    // Check for pending request
    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const pendingRequest = requests?.find((r) => r.url === 'https://api.example.com/slow')
    expect(pendingRequest?.status).toBe('pending')

    // Cleanup
    resolveRequest?.({
      ok: true,
      status: 200,
      clone: () => ({ text: () => Promise.resolve('{}') })
    })
    unmount()
  })

  it('tracks error requests', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      clone: () => ({
        text: () => Promise.resolve('{"error": "not found"}')
      })
    }
    window.fetch = vi.fn().mockResolvedValue(mockResponse)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await window.fetch('https://api.example.com/notfound')
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const errorRequest = requests?.find((r) => r.url === 'https://api.example.com/notfound')
    expect(errorRequest?.status).toBe('error')
    expect(errorRequest?.statusCode).toBe(404)
    expect(errorRequest?.error).toBe('HTTP 404 Not Found')

    unmount()
  })

  it('tracks network errors', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      try {
        await window.fetch('https://api.example.com/timeout')
      } catch {
        // Expected to throw
      }
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const errorRequest = requests?.find((r) => r.url === 'https://api.example.com/timeout')
    expect(errorRequest?.status).toBe('error')
    expect(errorRequest?.error).toBe('Network timeout')

    unmount()
  })

  it('captures request body', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      clone: () => ({ text: () => Promise.resolve('{}') })
    }
    window.fetch = vi.fn().mockResolvedValue(mockResponse)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await window.fetch('https://api.github.com/graphql', {
        method: 'POST',
        body: '{"query": "{ viewer { login } }"}'
      })
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const request = requests?.find((r) => r.url.includes('graphql'))
    expect(request?.requestBody).toBe('{"query": "{ viewer { login } }"}')

    unmount()
  })

  it('captures response body', async () => {
    const responseData = '{"data": {"viewer": {"login": "testuser"}}}'
    const mockResponse = {
      ok: true,
      status: 200,
      clone: () => ({ text: () => Promise.resolve(responseData) })
    }
    window.fetch = vi.fn().mockResolvedValue(mockResponse)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await window.fetch('https://api.github.com/graphql', { method: 'POST' })
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const request = requests?.find((r) => r.url.includes('graphql'))
    expect(request?.responseBody).toBe(responseData)
    expect(request?.responseSize).toBe(responseData.length)

    unmount()
  })

  it('identifies GitHub GraphQL requests', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      clone: () => ({ text: () => Promise.resolve('{}') })
    }
    window.fetch = vi.fn().mockResolvedValue(mockResponse)

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await window.fetch('https://api.github.com/graphql', { method: 'POST' })
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const request = requests?.find((r) => r.url.includes('graphql'))
    expect(request?.method).toBe('GitHub GraphQL')

    unmount()
  })

  it('calculates request duration', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      clone: () => ({ text: () => Promise.resolve('{}') })
    }
    window.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 50)
        })
    )

    const { unmount } = renderHook(() => useNetworkTracking(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await window.fetch('https://api.example.com/delayed')
    })

    const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
    const request = requests?.find((r) => r.url.includes('delayed'))
    expect(request?.durationMs).toBeGreaterThanOrEqual(50)
    expect(request?.endTime).toBeGreaterThan(request?.startTime ?? 0)

    unmount()
  })
})
