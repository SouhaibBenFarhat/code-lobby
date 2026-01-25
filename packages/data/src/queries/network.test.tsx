/**
 * Network Queries Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'
import { useNetworkRequests } from './network'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Network Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    })
  })

  describe('useNetworkRequests', () => {
    it('returns empty array initially', async () => {
      const { result } = renderHook(() => useNetworkRequests(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('returns network requests from cache', async () => {
      const requests: NetworkRequest[] = [
        {
          id: 'req-1',
          method: 'GitHub GraphQL',
          httpMethod: 'POST',
          url: 'https://api.github.com/graphql',
          status: 'success',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          durationMs: 100,
          statusCode: 200
        },
        {
          id: 'req-2',
          method: 'fetchUser',
          httpMethod: 'GET',
          url: 'https://api.github.com/user',
          status: 'pending',
          startTime: Date.now()
        }
      ]
      queryClient.setQueryData(keys.networkRequests, requests)

      const { result } = renderHook(() => useNetworkRequests(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0].id).toBe('req-1')
      expect(result.current.data?.[1].id).toBe('req-2')
    })

    it('returns requests with full data including bodies', async () => {
      const request: NetworkRequest = {
        id: 'req-1',
        method: 'GitHub GraphQL',
        httpMethod: 'POST',
        url: 'https://api.github.com/graphql',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        durationMs: 100,
        statusCode: 200,
        requestBody: '{"query": "{ viewer { login } }"}',
        responseBody: '{"data": {"viewer": {"login": "testuser"}}}',
        responseSize: 42
      }
      queryClient.setQueryData(keys.networkRequests, [request])

      const { result } = renderHook(() => useNetworkRequests(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.[0].requestBody).toBe('{"query": "{ viewer { login } }"}')
      expect(result.current.data?.[0].responseBody).toBe(
        '{"data": {"viewer": {"login": "testuser"}}}'
      )
      expect(result.current.data?.[0].responseSize).toBe(42)
    })

    it('handles error requests', async () => {
      const request: NetworkRequest = {
        id: 'req-error',
        method: 'fetchRepos',
        httpMethod: 'GET',
        url: 'https://api.github.com/repos',
        status: 'error',
        startTime: Date.now(),
        endTime: Date.now() + 50,
        durationMs: 50,
        error: 'Network timeout'
      }
      queryClient.setQueryData(keys.networkRequests, [request])

      const { result } = renderHook(() => useNetworkRequests(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.[0].status).toBe('error')
      expect(result.current.data?.[0].error).toBe('Network timeout')
    })
  })
})
