/**
 * System Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import { useSetAboutModalOpen, useSetDatabaseViewerOpen, useSetTheme } from './system'

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

describe('useSetDatabaseViewerOpen', () => {
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
    const { result } = renderHook(() => useSetDatabaseViewerOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await act(async () => {
      await result.current.mutateAsync(true)
    })
    expect(queryClient.getQueryData(keys.system.databaseViewerOpen)).toBe(true)

    await act(async () => {
      await result.current.mutateAsync(false)
    })
    expect(queryClient.getQueryData(keys.system.databaseViewerOpen)).toBe(false)
  })
})

describe('useSetTheme', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false }
      }
    })
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('persists the mode, applies .dark, and writes the cache', async () => {
    const { result } = renderHook(() => useSetTheme(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync('dark')
    })
    expect(localStorage.getItem('codelobby-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(queryClient.getQueryData(keys.system.theme)).toBe('dark')

    await act(async () => {
      await result.current.mutateAsync('light')
    })
    expect(localStorage.getItem('codelobby-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(queryClient.getQueryData(keys.system.theme)).toBe('light')
  })
})
