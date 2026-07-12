/**
 * System Queries Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupMockElectron } from '@test-utils'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { keys } from '../keys'
import { applyThemeClasses, useAboutModalOpen, useDatabaseViewerOpen, useTheme } from './system'

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

describe('useDatabaseViewerOpen', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
      }
    })
  })

  it('defaults to false (viewer closed on launch)', async () => {
    setupMockElectron()

    const { result } = renderHook(() => useDatabaseViewerOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))
  })

  it('opens when the native Database Viewer menu item fires the IPC event', async () => {
    let captured: (() => void) | null = null
    setupMockElectron({
      onOpenDatabaseViewer: vi.fn((cb: () => void) => {
        captured = cb
        return () => {}
      })
    })

    const { result } = renderHook(() => useDatabaseViewerOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))

    // Simulate the "Database Viewer" menu item being clicked
    act(() => {
      captured?.()
    })

    await waitFor(() => expect(result.current.data).toBe(true))
    expect(queryClient.getQueryData(keys.system.databaseViewerOpen)).toBe(true)
  })

  it('does not throw when the menu bridge is unavailable', async () => {
    setupMockElectron({ onOpenDatabaseViewer: undefined })

    const { result } = renderHook(() => useDatabaseViewerOpen(), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.data).toBe(false))
  })
})

// ── Theme ──────────────────────────────────────────────────────────────────

/**
 * Install a controllable `window.matchMedia` stub. `setDark` flips the OS
 * preference and notifies subscribers, mirroring a live OS theme change.
 */
function mockMatchMedia(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<() => void>()
  const mql = {
    get matches() {
      return dark
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => {
      listeners.add(cb)
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.delete(cb)
    },
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true
  }
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
  return {
    setDark(next: boolean) {
      dark = next
      for (const cb of listeners) cb()
    },
    get listenerCount() {
      return listeners.size
    }
  }
}

describe('applyThemeClasses', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it("adds .dark for 'dark'", () => {
    applyThemeClasses('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it("removes .dark for 'light'", () => {
    document.documentElement.classList.add('dark')
    applyThemeClasses('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it("resolves 'system' to the OS preference", () => {
    mockMatchMedia(true)
    applyThemeClasses('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    mockMatchMedia(false)
    applyThemeClasses('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it("treats 'system' as light when matchMedia is unavailable", () => {
    document.documentElement.classList.add('dark')
    applyThemeClasses('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('useTheme', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } }
    })
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it("defaults to 'dark' and applies .dark on mount", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(result.current.data).toBe('dark'))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
  })

  it('reads the saved mode from localStorage', async () => {
    localStorage.setItem('codelobby-theme', 'light')
    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(result.current.data).toBe('light'))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
  })

  it("falls back to 'dark' for an unknown saved value (e.g. removed windows themes)", async () => {
    localStorage.setItem('codelobby-theme', 'windows-dark')
    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(result.current.data).toBe('dark'))
  })

  it("follows OS changes while in 'system' mode and cleans up the listener", async () => {
    localStorage.setItem('codelobby-theme', 'system')
    const mm = mockMatchMedia(false)
    const { result, unmount } = renderHook(() => useTheme(), {
      wrapper: createWrapper(queryClient)
    })
    await waitFor(() => expect(result.current.data).toBe('system'))
    await waitFor(() => expect(mm.listenerCount).toBe(1))
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // OS switches to dark → the app follows live
    act(() => mm.setDark(true))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    unmount()
    expect(mm.listenerCount).toBe(0)
  })
})
