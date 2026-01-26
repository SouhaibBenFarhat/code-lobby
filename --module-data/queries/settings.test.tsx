/**
 * Settings Queries Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import {
  getGitHubToken,
  useAIPanel,
  useCardLayouts,
  useGitHubToken,
  useIDESettings,
  useMinimizedRepos,
  useMyPRsRepos,
  usePRDetailPanel,
  useRepoColors,
  useSelectedRepos,
  useViewMode
} from './settings'

// Create wrapper with QueryClient
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Settings Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
      }
    })
  })

  describe('useGitHubToken', () => {
    it('returns null when no token is set', async () => {
      const { result } = renderHook(() => useGitHubToken(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBeNull()
    })

    it('returns token when set in cache', async () => {
      queryClient.setQueryData(keys.githubToken, 'test-token-123')

      const { result } = renderHook(() => useGitHubToken(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBe('test-token-123')
    })
  })

  describe('getGitHubToken (sync)', () => {
    it('returns null when no token is set', () => {
      expect(getGitHubToken()).toBeNull()
    })
  })

  describe('useSelectedRepos', () => {
    it('returns null when no repos selected (show all)', async () => {
      const { result } = renderHook(() => useSelectedRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBeNull()
    })

    it('returns selected repos when set', async () => {
      const repos = ['org/repo-1', 'org/repo-2']
      queryClient.setQueryData(keys.selectedRepos, repos)

      const { result } = renderHook(() => useSelectedRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(repos)
    })
  })

  describe('useViewMode', () => {
    it('returns canvas as default', async () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBe('canvas')
    })

    it('returns ide when set', async () => {
      queryClient.setQueryData(keys.viewMode, 'ide')

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBe('ide')
    })
  })

  describe('useAIPanel', () => {
    it('returns default values when not set', async () => {
      const { result } = renderHook(() => useAIPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ isOpen: false, width: 400 })
    })

    it('returns custom values when set', async () => {
      queryClient.setQueryData(keys.aiPanel, { isOpen: true, width: 500 })

      const { result } = renderHook(() => useAIPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ isOpen: true, width: 500 })
    })
  })

  describe('usePRDetailPanel', () => {
    it('returns default values when not set', async () => {
      const { result } = renderHook(() => usePRDetailPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ isOpen: false, width: 400 })
    })

    it('returns custom values when set', async () => {
      queryClient.setQueryData(keys.prDetailPanel, { isOpen: true, width: 600 })

      const { result } = renderHook(() => usePRDetailPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ isOpen: true, width: 600 })
    })
  })

  describe('useIDESettings', () => {
    it('returns default values when not set', async () => {
      const { result } = renderHook(() => useIDESettings(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ sidebarWidth: 280, expandedRepos: [] })
    })

    it('returns custom values when set', async () => {
      queryClient.setQueryData(keys.ideSettings, {
        sidebarWidth: 320,
        expandedRepos: ['org/repo-1']
      })

      const { result } = renderHook(() => useIDESettings(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({
        sidebarWidth: 320,
        expandedRepos: ['org/repo-1']
      })
    })
  })

  describe('useCardLayouts', () => {
    it('returns empty array when not set', async () => {
      const { result } = renderHook(() => useCardLayouts(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('returns layouts when set', async () => {
      const layouts = [
        { i: 'org/repo-1', x: 0, y: 0, w: 300, h: 400 },
        { i: 'org/repo-2', x: 310, y: 0, w: 300, h: 400 }
      ]
      queryClient.setQueryData(keys.cardLayouts, layouts)

      const { result } = renderHook(() => useCardLayouts(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(layouts)
    })
  })

  describe('useRepoColors', () => {
    it('returns empty object when not set', async () => {
      const { result } = renderHook(() => useRepoColors(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({})
    })

    it('returns colors when set', async () => {
      const colors = { 'org/repo-1': '#ff0000', 'org/repo-2': '#00ff00' }
      queryClient.setQueryData(keys.repoColors, colors)

      const { result } = renderHook(() => useRepoColors(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(colors)
    })
  })

  describe('useMinimizedRepos', () => {
    it('returns empty array when not set', async () => {
      const { result } = renderHook(() => useMinimizedRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('returns minimized repos when set', async () => {
      const minimized = ['org/repo-1', 'org/repo-2']
      queryClient.setQueryData(keys.minimizedRepos, minimized)

      const { result } = renderHook(() => useMinimizedRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(minimized)
    })
  })

  describe('useMyPRsRepos', () => {
    it('returns empty array when not set', async () => {
      const { result } = renderHook(() => useMyPRsRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('returns my prs repos when set', async () => {
      const myPRsRepos = ['org/repo-1']
      queryClient.setQueryData(keys.myPRsRepos, myPRsRepos)

      const { result } = renderHook(() => useMyPRsRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(myPRsRepos)
    })
  })
})
