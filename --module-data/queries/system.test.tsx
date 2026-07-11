/**
 * System Queries Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupMockElectron } from '@test-utils'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { keys } from '../keys'
import { useAboutModalOpen } from './system'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useAboutModalOpen', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
      }
    })
  })

  it('defaults to false (modal closed on launch)', async () => {
    setupMockElectron()

    const { result } = renderHook(() => useAboutModalOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))
  })

  it('opens when the native About menu item fires the IPC event', async () => {
    let captured: (() => void) | null = null
    setupMockElectron({
      onOpenAbout: vi.fn((cb: () => void) => {
        captured = cb
        return () => {}
      })
    })

    const { result } = renderHook(() => useAboutModalOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))

    // Simulate the "About CodeLobby" menu item being clicked
    act(() => {
      captured?.()
    })

    await waitFor(() => expect(result.current.data).toBe(true))
    expect(queryClient.getQueryData(keys.system.aboutModalOpen)).toBe(true)
  })

  it('does not throw when the menu bridge is unavailable', async () => {
    setupMockElectron({ onOpenAbout: undefined })

    const { result } = renderHook(() => useAboutModalOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))
  })
})
