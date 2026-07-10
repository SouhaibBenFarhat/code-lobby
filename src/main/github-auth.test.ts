/**
 * GitHub OAuth Device Flow tests.
 *
 * Covers the device-code request and the token-polling state machine
 * (authorization_pending, slow_down, expired_token, access_denied, success,
 * transient network errors, cancellation) plus the startGitHubDeviceAuth entry
 * point (missing client id, success, failed device-code request).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@logger/main', () => ({
  LogCategory: { AUTH: 'Auth', AI: 'AI' },
  mainLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

import type { BrowserWindow } from 'electron'
import {
  cancelGitHubDeviceAuth,
  pollForAccessToken,
  requestDeviceCode,
  startGitHubDeviceAuth
} from './github-auth'

function makeWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send: vi.fn() }
  } as unknown as BrowserWindow
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response
}

const DEVICE_CODE = {
  device_code: 'dc',
  user_code: 'WXYZ-1234',
  verification_uri: 'https://github.com/login/device',
  verification_uri_complete: 'https://github.com/login/device?user_code=WXYZ-1234',
  expires_in: 900,
  interval: 5
}

describe('github-auth device flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('GITHUB_CLIENT_ID', 'test_client_id')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('requestDeviceCode', () => {
    it('returns the device + user code on success', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(DEVICE_CODE))
      const res = await requestDeviceCode()
      expect(res.user_code).toBe('WXYZ-1234')
      expect(res.device_code).toBe('dc')
    })

    it('throws on a non-OK HTTP response', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
      await expect(requestDeviceCode()).rejects.toThrow(/HTTP 500/)
    })

    it('throws when GitHub returns an error payload', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: 'invalid_client', error_description: 'Bad client' })
        )
      await expect(requestDeviceCode()).rejects.toThrow(/Bad client/)
    })
  })

  describe('pollForAccessToken', () => {
    it('emits done with the token after authorization_pending', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'authorization_pending' }))
        .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_abc' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith('github-auth:done', { token: 'gho_abc' })
    })

    it('backs off on slow_down then succeeds', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'slow_down' }))
        .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_xyz' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000) // slow_down → interval becomes 10s
      await vi.advanceTimersByTimeAsync(10000) // token
      await p
      expect(win.webContents.send).toHaveBeenCalledWith('github-auth:done', { token: 'gho_xyz' })
    })

    it('emits error and does not fetch when the code has expired', async () => {
      global.fetch = vi.fn()
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 3) // deadline 3s < first sleep 5s
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith(
        'github-auth:error',
        expect.objectContaining({ error: expect.stringContaining('expired') })
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('emits error when the user denies access', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'access_denied' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith(
        'github-auth:error',
        expect.objectContaining({ error: expect.stringContaining('cancelled') })
      )
    })

    it('emits error on an expired_token response', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'expired_token' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith(
        'github-auth:error',
        expect.objectContaining({ error: expect.stringContaining('expired') })
      )
    })

    it('surfaces unknown error descriptions', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'weird', error_description: 'Something odd' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith(
        'github-auth:error',
        expect.objectContaining({ error: 'Something odd' })
      )
    })

    it('keeps polling through a transient network error', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_net' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).toHaveBeenCalledWith('github-auth:done', { token: 'gho_net' })
    })

    it('stops without emitting when cancelled', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'authorization_pending' }))
      const win = makeWindow()
      const p = pollForAccessToken(win, 'dc', 5, 900)
      cancelGitHubDeviceAuth()
      await vi.advanceTimersByTimeAsync(5000)
      await p
      expect(win.webContents.send).not.toHaveBeenCalled()
    })
  })

  describe('startGitHubDeviceAuth', () => {
    it('returns an error when no client id is configured', async () => {
      vi.stubEnv('GITHUB_CLIENT_ID', '')
      const res = await startGitHubDeviceAuth(makeWindow())
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/not configured/)
    })

    it('returns the user code and begins polling', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(DEVICE_CODE))
      const res = await startGitHubDeviceAuth(makeWindow())
      expect(res.success).toBe(true)
      expect(res.userCode).toBe('WXYZ-1234')
      expect(res.verificationUriComplete).toContain('user_code=WXYZ-1234')
      cancelGitHubDeviceAuth() // stop the background poll
    })

    it('returns an error when the device code request fails', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
      const res = await startGitHubDeviceAuth(makeWindow())
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/HTTP 500/)
    })
  })
})
