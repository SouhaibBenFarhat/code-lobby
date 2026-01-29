/**
 * Settings Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { keys } from '../keys'
import {
  useClearCache,
  useFactoryReset,
  useSetAIPanel,
  useSetCardLayouts,
  useSetIDESettings,
  useSetPRDetailPanel,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedRepos,
  useSetViewMode,
  useToggleMyPRsFilter,
  useToggleRepoExpanded
} from './settings'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Settings Mutations', () => {
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

  describe('useSetSelectedRepos', () => {
    it('sets selected repos in cache', async () => {
      const { result } = renderHook(() => useSetSelectedRepos(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync(['org/repo-1', 'org/repo-2'])
      })

      expect(queryClient.getQueryData(keys.selectedRepos)).toEqual(['org/repo-1', 'org/repo-2'])
    })
  })

  describe('useSetViewMode', () => {
    it('sets view mode to ide', async () => {
      const { result } = renderHook(() => useSetViewMode(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('ide')
      })

      expect(queryClient.getQueryData(keys.viewMode)).toBe('ide')
    })

    it('sets view mode to canvas', async () => {
      queryClient.setQueryData(keys.viewMode, 'ide')

      const { result } = renderHook(() => useSetViewMode(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('canvas')
      })

      expect(queryClient.getQueryData(keys.viewMode)).toBe('canvas')
    })
  })

  describe('useSetAIPanel', () => {
    it('updates AI panel settings partially', async () => {
      queryClient.setQueryData(keys.aiPanel, { isOpen: false, width: 400 })

      const { result } = renderHook(() => useSetAIPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ isOpen: true })
      })

      expect(queryClient.getQueryData(keys.aiPanel)).toEqual({ isOpen: true, width: 400 })
    })

    it('updates AI panel width', async () => {
      queryClient.setQueryData(keys.aiPanel, { isOpen: true, width: 400 })

      const { result } = renderHook(() => useSetAIPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ width: 500 })
      })

      expect(queryClient.getQueryData(keys.aiPanel)).toEqual({ isOpen: true, width: 500 })
    })
  })

  describe('useSetPRDetailPanel', () => {
    it('updates PR detail panel settings', async () => {
      queryClient.setQueryData(keys.prDetailPanel, { isOpen: false, width: 400 })

      const { result } = renderHook(() => useSetPRDetailPanel(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ isOpen: true, width: 600 })
      })

      expect(queryClient.getQueryData(keys.prDetailPanel)).toEqual({ isOpen: true, width: 600 })
    })
  })

  describe('useSetIDESettings', () => {
    it('updates IDE sidebar width', async () => {
      queryClient.setQueryData(keys.ideSettings, {
        sidebarWidth: 280,
        expandedRepos: [],
        expandedOwners: []
      })

      const { result } = renderHook(() => useSetIDESettings(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ sidebarWidth: 350 })
      })

      expect(queryClient.getQueryData(keys.ideSettings)).toEqual({
        sidebarWidth: 350,
        expandedRepos: [],
        expandedOwners: []
      })
    })
  })

  describe('useSetCardLayouts', () => {
    it('sets card layouts', async () => {
      const layouts = [{ i: 'org/repo', x: 0, y: 0, w: 300, h: 400 }]

      const { result } = renderHook(() => useSetCardLayouts(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync(layouts)
      })

      expect(queryClient.getQueryData(keys.cardLayouts)).toEqual(layouts)
    })
  })

  describe('useSetRepoColor', () => {
    it('sets a repo color', async () => {
      queryClient.setQueryData(keys.repoColors, {})

      const { result } = renderHook(() => useSetRepoColor(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ repoFullName: 'org/repo', color: '#ff0000' })
      })

      expect(queryClient.getQueryData(keys.repoColors)).toEqual({ 'org/repo': '#ff0000' })
    })

    it('removes a repo color when null', async () => {
      queryClient.setQueryData(keys.repoColors, { 'org/repo': '#ff0000' })

      const { result } = renderHook(() => useSetRepoColor(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ repoFullName: 'org/repo', color: null })
      })

      expect(queryClient.getQueryData(keys.repoColors)).toEqual({})
    })
  })

  describe('useSetRepoMinimized', () => {
    it('adds repo to minimized list', async () => {
      queryClient.setQueryData(keys.minimizedRepos, [])

      const { result } = renderHook(() => useSetRepoMinimized(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ repoFullName: 'org/repo', isMinimized: true })
      })

      expect(queryClient.getQueryData(keys.minimizedRepos)).toEqual(['org/repo'])
    })

    it('removes repo from minimized list', async () => {
      queryClient.setQueryData(keys.minimizedRepos, ['org/repo'])

      const { result } = renderHook(() => useSetRepoMinimized(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ repoFullName: 'org/repo', isMinimized: false })
      })

      expect(queryClient.getQueryData(keys.minimizedRepos)).toEqual([])
    })

    it('does not duplicate repo in minimized list', async () => {
      queryClient.setQueryData(keys.minimizedRepos, ['org/repo'])

      const { result } = renderHook(() => useSetRepoMinimized(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync({ repoFullName: 'org/repo', isMinimized: true })
      })

      expect(queryClient.getQueryData(keys.minimizedRepos)).toEqual(['org/repo'])
    })
  })

  describe('useToggleMyPRsFilter', () => {
    it('adds repo to my PRs filter', async () => {
      queryClient.setQueryData(keys.myPRsRepos, [])

      const { result } = renderHook(() => useToggleMyPRsFilter(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('org/repo')
      })

      expect(queryClient.getQueryData(keys.myPRsRepos)).toEqual(['org/repo'])
    })

    it('removes repo from my PRs filter when already present', async () => {
      queryClient.setQueryData(keys.myPRsRepos, ['org/repo'])

      const { result } = renderHook(() => useToggleMyPRsFilter(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('org/repo')
      })

      expect(queryClient.getQueryData(keys.myPRsRepos)).toEqual([])
    })
  })

  describe('useToggleRepoExpanded', () => {
    it('expands a repo', async () => {
      queryClient.setQueryData(keys.ideSettings, {
        sidebarWidth: 280,
        expandedRepos: [],
        expandedOwners: []
      })

      const { result } = renderHook(() => useToggleRepoExpanded(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('org/repo')
      })

      const data = queryClient.getQueryData<{ expandedRepos: string[] }>(keys.ideSettings)
      expect(data?.expandedRepos).toContain('org/repo')
    })

    it('collapses an expanded repo', async () => {
      queryClient.setQueryData(keys.ideSettings, {
        sidebarWidth: 280,
        expandedRepos: ['org/repo'],
        expandedOwners: []
      })

      const { result } = renderHook(() => useToggleRepoExpanded(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('org/repo')
      })

      const data = queryClient.getQueryData<{ expandedRepos: string[] }>(keys.ideSettings)
      expect(data?.expandedRepos).not.toContain('org/repo')
    })
  })

  describe('useClearCache', () => {
    it('clears query client and localStorage', async () => {
      queryClient.setQueryData(keys.viewMode, 'ide')
      localStorage.setItem('test', 'value')

      const { result } = renderHook(() => useClearCache(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(queryClient.getQueryData(keys.viewMode)).toBeUndefined()
      expect(localStorage.getItem('test')).toBeNull()
    })
  })

  describe('useFactoryReset', () => {
    it('clears all data', async () => {
      queryClient.setQueryData(keys.githubToken, 'token')
      queryClient.setQueryData(keys.viewMode, 'ide')
      localStorage.setItem('test', 'value')

      const { result } = renderHook(() => useFactoryReset(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(queryClient.getQueryData(keys.githubToken)).toBeUndefined()
      expect(queryClient.getQueryData(keys.viewMode)).toBeUndefined()
      expect(localStorage.getItem('test')).toBeNull()
    })
  })
})
