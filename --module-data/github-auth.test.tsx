/**
 * useGitHubDeviceAuth hook tests.
 *
 * Covers the renderer-side orchestration: starting the flow, opening the
 * browser, handling the done/error IPC callbacks (valid token, invalid token,
 * validate throw), start failure, cancel, and reset.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient, resetMockElectron, setupMockElectron } from '@test-utils'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGitHubDeviceAuth } from './github-auth'
import { keys } from './keys'

vi.mock('./github', () => ({
  validateToken: vi.fn()
}))

import * as github from './github'

let qc: QueryClient

function renderAuth() {
  return renderHook(() => useGitHubDeviceAuth(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
  })
}

beforeEach(() => {
  qc = createTestQueryClient()
  resetMockElectron()
  vi.mocked(github.validateToken).mockReset()
})

describe('useGitHubDeviceAuth', () => {
  it('starts the flow, shows the code, and opens the browser', async () => {
    const electron = setupMockElectron()
    const { result } = renderAuth()

    await act(async () => {
      await result.current.start()
    })

    expect(electron.startGitHubAuth).toHaveBeenCalled()
    expect(result.current.status).toBe('awaiting')
    expect(result.current.userCode).toBe('WXYZ-1234')
    expect(electron.shell.openExternal).toHaveBeenCalledWith(
      'https://github.com/login/device?user_code=WXYZ-1234'
    )
  })

  it('writes the token to the cache when authorization completes', async () => {
    let doneCb: (d: { token: string }) => void = () => {}
    setupMockElectron({
      onGitHubAuthDone: vi.fn((cb) => {
        doneCb = cb
        return () => {}
      })
    })
    vi.mocked(github.validateToken).mockResolvedValue({
      valid: true,
      user: { login: 'me', avatar_url: '', name: 'Me', html_url: '' }
    })

    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      doneCb({ token: 'gho_tok' })
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(qc.getQueryData(keys.githubToken)).toBe('gho_tok')
  })

  it('errors when the returned token is invalid', async () => {
    let doneCb: (d: { token: string }) => void = () => {}
    setupMockElectron({
      onGitHubAuthDone: vi.fn((cb) => {
        doneCb = cb
        return () => {}
      })
    })
    vi.mocked(github.validateToken).mockResolvedValue({ valid: false, user: null })

    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      doneCb({ token: 'bad' })
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatch(/invalid token/i)
  })

  it('errors when token validation throws', async () => {
    let doneCb: (d: { token: string }) => void = () => {}
    setupMockElectron({
      onGitHubAuthDone: vi.fn((cb) => {
        doneCb = cb
        return () => {}
      })
    })
    vi.mocked(github.validateToken).mockRejectedValue(new Error('boom'))

    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      doneCb({ token: 'x' })
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatch(/could not verify/i)
  })

  it('surfaces an error emitted by the main process', async () => {
    let errCb: (d: { error: string }) => void = () => {}
    setupMockElectron({
      onGitHubAuthError: vi.fn((cb) => {
        errCb = cb
        return () => {}
      })
    })

    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      errCb({ error: 'device flow blew up' })
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('device flow blew up')
  })

  it('errors and skips the browser when start fails', async () => {
    const electron = setupMockElectron({
      startGitHubAuth: vi.fn().mockResolvedValue({ success: false, error: 'nope' })
    })

    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('nope')
    expect(electron.shell.openExternal).not.toHaveBeenCalled()
  })

  it('cancels an in-progress flow', async () => {
    const electron = setupMockElectron()
    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })

    act(() => {
      result.current.cancel()
    })

    expect(electron.cancelGitHubAuth).toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('resets back to idle after an error', async () => {
    setupMockElectron({
      startGitHubAuth: vi.fn().mockResolvedValue({ success: false, error: 'nope' })
    })
    const { result } = renderAuth()
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe('error')

    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })
})
