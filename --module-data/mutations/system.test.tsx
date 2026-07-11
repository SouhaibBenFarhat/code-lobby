/**
 * System Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import { useSetAboutModalOpen } from './system'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSetAboutModalOpen', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false }
      }
    })
  })

  it('writes the open state into the query cache', async () => {
    const { result } = renderHook(() => useSetAboutModalOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await result.current.mutateAsync(true)
    })
    expect(queryClient.getQueryData(keys.system.aboutModalOpen)).toBe(true)

    await act(async () => {
      await result.current.mutateAsync(false)
    })
    expect(queryClient.getQueryData(keys.system.aboutModalOpen)).toBe(false)
  })
})
