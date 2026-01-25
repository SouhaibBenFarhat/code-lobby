/**
 * User Queries Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as github from '../github'
import { keys } from '../keys'
import { type AuthData, useCurrentUser, useIsAuthenticated, useUser } from './user'

// Mock github module
vi.mock('../github', () => ({
  fetchCurrentUser: vi.fn()
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('User Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useUser', () => {
    it('returns null when no user data', async () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toBeNull()
    })

    it('returns auth data when set', async () => {
      const authData: AuthData = {
        user: { login: 'testuser', avatar_url: '', name: '', html_url: '' },
        token: 'test-token'
      }
      queryClient.setQueryData(keys.user, authData)

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.user.login).toBe('testuser')
      expect(result.current.data?.token).toBe('test-token')
    })
  })

  describe('useCurrentUser', () => {
    it('does not fetch when no token', async () => {
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(queryClient)
      })

      // Query should be disabled
      expect(result.current.fetchStatus).toBe('idle')
      expect(github.fetchCurrentUser).not.toHaveBeenCalled()
    })

    it('fetches user when token is available', async () => {
      const mockUser = {
        login: 'currentuser',
        avatar_url: 'https://github.com/currentuser.png',
        name: 'Current User',
        html_url: 'https://github.com/currentuser'
      }
      vi.mocked(github.fetchCurrentUser).mockResolvedValue(mockUser)
      queryClient.setQueryData(keys.githubToken, 'valid-token')

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.login).toBe('currentuser')
      expect(github.fetchCurrentUser).toHaveBeenCalledWith('valid-token')
    })
  })

  describe('useIsAuthenticated', () => {
    it('returns not authenticated when no user or token', async () => {
      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
    })

    it('returns authenticated when token exists', async () => {
      queryClient.setQueryData(keys.githubToken, 'valid-token')

      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.token).toBe('valid-token')
    })

    it('returns authenticated with user data', async () => {
      const authData: AuthData = {
        user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', name: 'Test', html_url: '' },
        token: 'test-token'
      }
      queryClient.setQueryData(keys.user, authData)
      queryClient.setQueryData(keys.githubToken, 'test-token')

      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(queryClient)
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.login).toBe('testuser')
      expect(result.current.token).toBe('test-token')
    })
  })
})
