/**
 * TokenInput tests.
 *
 * Covers the device-flow primary path (button → start → code shown) and the
 * Personal Access Token fallback under the Advanced toggle (reveal + invalid
 * token error).
 */

import { render, resetMockElectron, screen, setupMockElectron } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TokenInput } from './TokenInput'

beforeEach(() => {
  resetMockElectron()
})

describe('TokenInput', () => {
  it('shows the "Sign in with GitHub" button by default', () => {
    setupMockElectron()
    render(<TokenInput />)
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('starts the device flow and shows the user code', async () => {
    const electron = setupMockElectron()
    render(<TokenInput />)

    await userEvent.click(screen.getByRole('button', { name: /sign in with github/i }))

    expect(electron.startGitHubAuth).toHaveBeenCalled()
    expect(await screen.findByText('WXYZ-1234')).toBeInTheDocument()
    expect(screen.getByText(/waiting for authorization/i)).toBeInTheDocument()
  })

  it('reveals the Personal Access Token form under Advanced', async () => {
    setupMockElectron()
    render(<TokenInput />)

    await userEvent.click(screen.getByRole('button', { name: /personal access token/i }))

    expect(screen.getByPlaceholderText(/ghp_/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect with token/i })).toBeInTheDocument()
  })

  it('shows an error when an invalid token is submitted', async () => {
    setupMockElectron()
    // Force github.validateToken (called by useSignIn) to fail.
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    render(<TokenInput />)

    await userEvent.click(screen.getByRole('button', { name: /personal access token/i }))
    await userEvent.type(screen.getByPlaceholderText(/ghp_/i), 'ghp_badtoken')
    await userEvent.click(screen.getByRole('button', { name: /connect with token/i }))

    expect(await screen.findByText(/invalid token/i)).toBeInTheDocument()
  })

  it('shows an error banner when the device flow fails to start', async () => {
    setupMockElectron({
      startGitHubAuth: vi.fn().mockResolvedValue({ success: false, error: 'GitHub is unreachable' })
    })
    render(<TokenInput />)

    await userEvent.click(screen.getByRole('button', { name: /sign in with github/i }))

    expect(await screen.findByText(/github is unreachable/i)).toBeInTheDocument()
  })

  it('re-opens the browser from the waiting state', async () => {
    setupMockElectron()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<TokenInput />)

    await userEvent.click(screen.getByRole('button', { name: /sign in with github/i }))
    await screen.findByText('WXYZ-1234')
    await userEvent.click(screen.getByRole('button', { name: /open github/i }))

    expect(openSpy).toHaveBeenCalledWith('https://github.com/login/device', '_blank')
    openSpy.mockRestore()
  })
})
