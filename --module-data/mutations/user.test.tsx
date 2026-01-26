/**
 * User / Auth Mutations Tests
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as github from '../github'
import { keys } from '../keys'
import { useSignIn, useSignOut, useValidatePersistedToken, useValidateToken } from './user'

// Mock github module
vi.mock('../github', () => ({
  validateToken: vi.fn()
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('User Mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useSignIn', () => {
    it('signs in with valid token', async () => {
      const mockUser = {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        name: 'Test User',
        html_url: 'https://github.com/testuser'
      }
      vi.mocked(github.validateToken).mockResolvedValue({ valid: true, user: mockUser })

      const { result } = renderHook(() => useSignIn(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('ghp_validtoken123')
      })

      // Check token is stored
      expect(queryClient.getQueryData(keys.githubToken)).toBe('ghp_validtoken123')

      // Check user data is stored
      const userData = queryClient.getQueryData<{ user: typeof mockUser; token: string }>(keys.user)
      expect(userData?.user.login).toBe('testuser')
      expect(userData?.token).toBe('ghp_validtoken123')
    })

    it('throws error for invalid token', async () => {
      vi.mocked(github.validateToken).mockResolvedValue({ valid: false, user: null })

      const { result } = renderHook(() => useSignIn(), {
        wrapper: createWrapper(queryClient)
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync('invalid-token')
        })
      ).rejects.toThrow('Invalid token')

      // Token should not be stored
      expect(queryClient.getQueryData(keys.githubToken)).toBeUndefined()
    })

    it('calls validateToken with the provided token', async () => {
      const mockUser = { login: 'testuser', avatar_url: '', name: '', html_url: '' }
      vi.mocked(github.validateToken).mockResolvedValue({ valid: true, user: mockUser })

      const { result } = renderHook(() => useSignIn(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync('my-token-123')
      })

      expect(github.validateToken).toHaveBeenCalledWith('my-token-123')
    })
  })

  describe('useSignOut', () => {
    it('clears token and user data', async () => {
      // Setup authenticated state
      queryClient.setQueryData(keys.githubToken, 'ghp_token123')
      queryClient.setQueryData(keys.user, {
        user: { login: 'testuser' },
        token: 'ghp_token123'
      })
      queryClient.setQueryData(keys.repos, [{ name: 'repo1' }])

      const { result } = renderHook(() => useSignOut(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      // Token should be cleared
      expect(queryClient.getQueryData(keys.githubToken)).toBeUndefined()

      // User should be null
      expect(queryClient.getQueryData(keys.user)).toBeNull()

      // Repos should be cleared
      expect(queryClient.getQueryData(keys.repos)).toBeUndefined()
    })

    it('clears all github-prefixed queries', async () => {
      // Setup various github queries
      queryClient.setQueryData(keys.repos, [])
      queryClient.setQueryData(keys.prs(['org/repo']), [])
      queryClient.setQueryData(keys.rateLimit, { remaining: 5000 })
      queryClient.setQueryData(keys.currentUser, { login: 'testuser' })

      const { result } = renderHook(() => useSignOut(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(queryClient.getQueryData(keys.repos)).toBeUndefined()
      expect(queryClient.getQueryData(keys.rateLimit)).toBeUndefined()
    })
  })

  describe('useValidateToken', () => {
    it('validates and stores valid token', async () => {
      const mockUser = { login: 'testuser', avatar_url: '', name: '', html_url: '' }
      vi.mocked(github.validateToken).mockResolvedValue({ valid: true, user: mockUser })

      const { result } = renderHook(() => useValidateToken(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        const res = await result.current.mutateAsync('valid-token')
        expect(res.valid).toBe(true)
        expect(res.user?.login).toBe('testuser')
      })

      expect(queryClient.getQueryData(keys.githubToken)).toBe('valid-token')
    })

    it('clears data for invalid token', async () => {
      queryClient.setQueryData(keys.githubToken, 'old-token')
      vi.mocked(github.validateToken).mockResolvedValue({ valid: false, user: null })

      const { result } = renderHook(() => useValidateToken(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        const res = await result.current.mutateAsync('invalid-token')
        expect(res.valid).toBe(false)
      })

      expect(queryClient.getQueryData(keys.githubToken)).toBeUndefined()
      expect(queryClient.getQueryData(keys.user)).toBeNull()
    })
  })

  describe('useValidatePersistedToken', () => {
    it('validates persisted token on startup', async () => {
      // Simulate persisted token from cache
      queryClient.setQueryData(keys.githubToken, 'persisted-token-123')

      const mockUser = { login: 'persisteduser', avatar_url: '', name: '', html_url: '' }
      vi.mocked(github.validateToken).mockResolvedValue({ valid: true, user: mockUser })

      const { result } = renderHook(() => useValidatePersistedToken(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      // User data should be populated
      const userData = queryClient.getQueryData<{ user: typeof mockUser; token: string }>(keys.user)
      expect(userData?.user.login).toBe('persisteduser')
      expect(userData?.token).toBe('persisted-token-123')
    })

    it('returns early when no persisted token', async () => {
      // No token in cache

      const { result } = renderHook(() => useValidatePersistedToken(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        const res = await result.current.mutateAsync()
        expect(res.valid).toBe(false)
        expect(res.token).toBeNull()
      })

      // validateToken should not be called
      expect(github.validateToken).not.toHaveBeenCalled()
    })

    it('clears invalid persisted token', async () => {
      queryClient.setQueryData(keys.githubToken, 'expired-token')
      vi.mocked(github.validateToken).mockResolvedValue({ valid: false, user: null })

      const { result } = renderHook(() => useValidatePersistedToken(), {
        wrapper: createWrapper(queryClient)
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      // Token should be cleared
      expect(queryClient.getQueryData(keys.githubToken)).toBeUndefined()
      expect(queryClient.getQueryData(keys.user)).toBeNull()
    })
  })
})
