/**
 * Contributions Query Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { keys } from '../keys'
import {
  useContributions,
  useRefreshContributions,
  useRefreshUserEvents,
  useUserEvents
} from './contributions'

// Mock the GitHub API
vi.mock('../github', () => ({
  fetchContributions: vi.fn(),
  fetchUserEvents: vi.fn()
}))

// Mock the settings hook
vi.mock('./settings', () => ({
  useGitHubToken: vi.fn(() => ({ data: 'test-token' }))
}))

// Mock the user hook
vi.mock('./user', () => ({
  useCurrentUser: vi.fn(() => ({ data: { login: 'testuser' } }))
}))

import * as github from '../github'
import { useGitHubToken } from './settings'
import { useCurrentUser } from './user'

const mockFetchContributions = vi.mocked(github.fetchContributions)
const mockFetchUserEvents = vi.mocked(github.fetchUserEvents)
const mockUseGitHubToken = vi.mocked(useGitHubToken)
const mockUseCurrentUser = vi.mocked(useCurrentUser)

const mockContributionsData = {
  totalContributions: 500,
  weeks: [],
  totalCommitContributions: 300,
  totalPullRequestContributions: 100,
  totalPullRequestReviewContributions: 50,
  totalIssueContributions: 50,
  currentStreak: 10,
  longestStreak: 30,
  averagePerDay: 2.5,
  mostActiveDay: '2026-01-15',
  mostActiveDayCount: 20
}

const mockUserEventsData = [
  {
    id: '1',
    type: 'Push',
    repoName: 'org/repo',
    title: 'Pushed 2 commits',
    description: 'Fix bug',
    timestamp: new Date().toISOString(),
    icon: 'commit' as const
  },
  {
    id: '2',
    type: 'Pull Request',
    repoName: 'org/repo',
    title: 'Opened PR #123',
    description: 'New feature',
    timestamp: new Date().toISOString(),
    icon: 'pr' as const
  }
]

// Create wrapper with QueryClient
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Contributions Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity }
      }
    })
    mockFetchContributions.mockResolvedValue(mockContributionsData)
    mockFetchUserEvents.mockResolvedValue(mockUserEventsData)
    mockUseGitHubToken.mockReturnValue({ data: 'test-token' } as ReturnType<typeof useGitHubToken>)
    mockUseCurrentUser.mockReturnValue({ data: { login: 'testuser' } } as ReturnType<
      typeof useCurrentUser
    >)
  })

  describe('useContributions', () => {
    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useContributions(false), {
        wrapper: createWrapper(queryClient)
      })

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetchContributions).not.toHaveBeenCalled()
      expect(result.current.data).toBeUndefined()
    })

    it('should fetch when enabled is true', async () => {
      const { result } = renderHook(() => useContributions(true), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetchContributions).toHaveBeenCalledWith('test-token')
      expect(result.current.data).toEqual(mockContributionsData)
    })

    it('should not fetch when no token is available', async () => {
      mockUseGitHubToken.mockReturnValue({ data: null } as ReturnType<typeof useGitHubToken>)

      const { result } = renderHook(() => useContributions(true), {
        wrapper: createWrapper(queryClient)
      })

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetchContributions).not.toHaveBeenCalled()
      expect(result.current.isFetched).toBe(false)
    })

    it('should use cached data when available', async () => {
      // Pre-populate cache
      queryClient.setQueryData(keys.contributions, mockContributionsData)

      const { result } = renderHook(() => useContributions(true), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Should not fetch again since data is cached and not stale
      expect(result.current.data).toEqual(mockContributionsData)
    })

    it('should handle fetch errors', async () => {
      const error = new Error('GitHub API Error')
      mockFetchContributions.mockRejectedValue(error)

      const { result } = renderHook(() => useContributions(true), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })
  })

  describe('useRefreshContributions', () => {
    it('should invalidate contributions query when called', async () => {
      // Pre-populate cache
      queryClient.setQueryData(keys.contributions, mockContributionsData)

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRefreshContributions(), {
        wrapper: createWrapper(queryClient)
      })

      // Call the refresh function
      result.current()

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.contributions })
    })
  })

  describe('useUserEvents', () => {
    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useUserEvents(false), {
        wrapper: createWrapper(queryClient)
      })

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetchUserEvents).not.toHaveBeenCalled()
      expect(result.current.data).toBeUndefined()
    })

    it('should fetch when enabled is true', async () => {
      const { result } = renderHook(() => useUserEvents(true), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetchUserEvents).toHaveBeenCalledWith('test-token', 'testuser')
      expect(result.current.data).toEqual(mockUserEventsData)
    })

    it('should not fetch when no token is available', async () => {
      mockUseGitHubToken.mockReturnValue({ data: null } as ReturnType<typeof useGitHubToken>)

      const { result } = renderHook(() => useUserEvents(true), {
        wrapper: createWrapper(queryClient)
      })

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetchUserEvents).not.toHaveBeenCalled()
      expect(result.current.isFetched).toBe(false)
    })

    it('should not fetch when no user is available', async () => {
      mockUseCurrentUser.mockReturnValue({ data: null } as ReturnType<typeof useCurrentUser>)

      const { result } = renderHook(() => useUserEvents(true), {
        wrapper: createWrapper(queryClient)
      })

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetchUserEvents).not.toHaveBeenCalled()
      expect(result.current.isFetched).toBe(false)
    })

    it('should handle fetch errors', async () => {
      const error = new Error('GitHub API Error')
      mockFetchUserEvents.mockRejectedValue(error)

      const { result } = renderHook(() => useUserEvents(true), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })
  })

  describe('useRefreshUserEvents', () => {
    it('should invalidate user events query when called', async () => {
      // Pre-populate cache
      queryClient.setQueryData(keys.userEvents, mockUserEventsData)

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRefreshUserEvents(), {
        wrapper: createWrapper(queryClient)
      })

      // Call the refresh function
      result.current()

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.userEvents })
    })
  })
})
