/**
 * Network Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'
import {
  useAddNetworkRequest,
  useClearNetworkRequests,
  useSetNetworkPanelOpen,
  useToggleNetworkPanel,
  useUpdateNetworkRequest
} from './network'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Network Mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false }
      }
    })
    localStorage.clear()
  })

  describe('useAddNetworkRequest', () => {
    it('adds a network request to empty list', async () => {
      queryClient.setQueryData(keys.networkRequests, [])

      const { result } = renderHook(() => useAddNetworkRequest(), {
        wrapper: createWrapper(queryClient)
      })

      const newRequest: NetworkRequest = {
        id: 'req-1',
        method: 'GitHub GraphQL',
        httpMethod: 'POST',
        url: 'https://api.github.com/graphql',
        status: 'pending',
        startTime: Date.now()
      }

      await act(async () => {
        await result.current.mutateAsync(newRequest)
      })

      const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
      expect(requests).toHaveLength(1)
      expect(requests?.[0].id).toBe('req-1')
    })

    it('appends request to existing list', async () => {
      const existingRequest: NetworkRequest = {
        id: 'req-existing',
        method: 'fetchUser',
        httpMethod: 'GET',
        url: 'https://api.github.com/user',
        status: 'success',
        startTime: Date.now()
      }
      queryClient.setQueryData(keys.networkRequests, [existingRequest])

      const { result } = renderHook(() => useAddNetworkRequest(), {
        wrapper: createWrapper(queryClient)
      })

      const newRequest: NetworkRequest = {
        id: 'req-new',
        method: 'GitHub GraphQL',
        httpMethod: 'POST',
        url: 'https://api.github.com/graphql',
        status: 'pending',
        startTime: Date.now()
      }

      await act(async () => {
        await result.current.mutateAsync(newRequest)
      })

      const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
      expect(requests).toHaveLength(2)
      expect(requests?.[0].id).toBe('req-existing')
      expect(requests?.[1].id).toBe('req-new')
    })
  })

  describe('useUpdateNetworkRequest', () => {
    it('updates an existing request', async () => {
      const request: NetworkRequest = {
        id: 'req-1',
        method: 'GitHub GraphQL',
        httpMethod: 'POST',
        url: 'https://api.github.com/graphql',
        status: 'pending',
        startTime: Date.now()
      }
      queryClient.setQueryData(keys.networkRequests, [request])

      const { result } = renderHook(() => useUpdateNetworkRequest(), {
        wrapper: createWrapper(queryClient)
      })

      const endTime = Date.now() + 100

      await act(async () => {
        await result.current.mutateAsync({
          id: 'req-1',
          status: 'success',
          statusCode: 200,
          endTime,
          durationMs: 100,
          responseBody: '{"data": {}}',
          responseSize: 12
        })
      })

      const requests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
      expect(requests?.[0].status).toBe('success')
      expect(requests?.[0].statusCode).toBe(200)
      expect(requests?.[0].durationMs).toBe(100)
      expect(requests?.[0].responseBody).toBe('{"data": {}}')
    })

    it('does not modify other requests', async () => {
      const requests: NetworkRequest[] = [
        {
          id: 'req-1',
          method: 'fetchUser',
          httpMethod: 'GET',
          url: 'https://api.github.com/user',
          status: 'pending',
          startTime: Date.now()
        },
        {
          id: 'req-2',
          method: 'GitHub GraphQL',
          httpMethod: 'POST',
          url: 'https://api.github.com/graphql',
          status: 'pending',
          startTime: Date.now()
        }
      ]
      queryClient.setQueryData(keys.networkRequests, requests)

      const { result } = renderHook(() => useUpdateNetworkRequest(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({
          id: 'req-1',
          status: 'success',
          statusCode: 200
        })
      })

      const updatedRequests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
      expect(updatedRequests?.[0].status).toBe('success')
      expect(updatedRequests?.[1].status).toBe('pending')
    })
  })

  describe('useClearNetworkRequests', () => {
    it('clears all network requests', async () => {
      const requests: NetworkRequest[] = [
        {
          id: 'req-1',
          method: 'fetchUser',
          httpMethod: 'GET',
          url: 'https://api.github.com/user',
          status: 'success',
          startTime: Date.now()
        },
        {
          id: 'req-2',
          method: 'GitHub GraphQL',
          httpMethod: 'POST',
          url: 'https://api.github.com/graphql',
          status: 'success',
          startTime: Date.now()
        }
      ]
      queryClient.setQueryData(keys.networkRequests, requests)

      const { result } = renderHook(() => useClearNetworkRequests(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      const updatedRequests = queryClient.getQueryData<NetworkRequest[]>(keys.networkRequests)
      expect(updatedRequests).toEqual([])
    })
  })

  describe('useToggleNetworkPanel', () => {
    it('opens panel when closed', async () => {
      queryClient.setQueryData(keys.local.networkPanelOpen, false)

      const { result } = renderHook(() => useToggleNetworkPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(queryClient.getQueryData(keys.local.networkPanelOpen)).toBe(true)
      expect(localStorage.getItem('networkPanelOpen')).toBe('true')
    })

    it('closes panel when open', async () => {
      queryClient.setQueryData(keys.local.networkPanelOpen, true)

      const { result } = renderHook(() => useToggleNetworkPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(queryClient.getQueryData(keys.local.networkPanelOpen)).toBe(false)
      expect(localStorage.getItem('networkPanelOpen')).toBe('false')
    })

    it('defaults to false when not set', async () => {
      const { result } = renderHook(() => useToggleNetworkPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      // Should toggle from false (default) to true
      expect(queryClient.getQueryData(keys.local.networkPanelOpen)).toBe(true)
    })
  })

  describe('useSetNetworkPanelOpen', () => {
    it('sets panel to open', async () => {
      const { result } = renderHook(() => useSetNetworkPanelOpen(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync(true)
      })

      expect(queryClient.getQueryData(keys.local.networkPanelOpen)).toBe(true)
      expect(localStorage.getItem('networkPanelOpen')).toBe('true')
    })

    it('sets panel to closed', async () => {
      queryClient.setQueryData(keys.local.networkPanelOpen, true)

      const { result } = renderHook(() => useSetNetworkPanelOpen(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync(false)
      })

      expect(queryClient.getQueryData(keys.local.networkPanelOpen)).toBe(false)
      expect(localStorage.getItem('networkPanelOpen')).toBe('false')
    })
  })
})
