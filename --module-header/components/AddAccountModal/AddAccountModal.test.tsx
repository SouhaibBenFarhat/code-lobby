import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddAccountModal } from './AddAccountModal'

const startMock = vi.fn()
const cancelMock = vi.fn()
const resetMock = vi.fn()
const signInMutate = vi.fn()
const signInReset = vi.fn()

let deviceAuthState: {
  status: string
  userCode: string | null
  verificationUri: string | null
  error: string | null
  start: () => void
  cancel: () => void
  reset: () => void
}
let signInState: {
  mutate: typeof signInMutate
  reset: typeof signInReset
  isPending: boolean
  isError: boolean
  error: Error | null
}

vi.mock('@data', () => ({
  useGitHubDeviceAuth: () => deviceAuthState,
  useSignIn: () => signInState
}))

describe('AddAccountModal', () => {
  const onOpenChange = vi.fn()
  // Radix Dialog locks the body with pointer-events: none while open; disable the
  // check so clicks are deterministic (matches the AddCustomPromptModal pattern).
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup({ pointerEventsCheck: 0 })
    deviceAuthState = {
      status: 'idle',
      userCode: null,
      verificationUri: null,
      error: null,
      start: startMock,
      cancel: cancelMock,
      reset: resetMock
    }
    signInState = {
      mutate: signInMutate,
      reset: signInReset,
      isPending: false,
      isError: false,
      error: null
    }
  })

  it('does not render content when closed', () => {
    render(<AddAccountModal open={false} onOpenChange={onOpenChange} />)
    expect(screen.queryByText('Add a GitHub account')).not.toBeInTheDocument()
  })

  it('renders the sign-in entry point when open', () => {
    render(<AddAccountModal open onOpenChange={onOpenChange} />)
    expect(screen.getByText('Add a GitHub account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('starts the device flow when clicking Sign in with GitHub', async () => {
    render(<AddAccountModal open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: /sign in with github/i }))
    expect(startMock).toHaveBeenCalled()
  })

  it('shows the user code while awaiting authorization', () => {
    deviceAuthState = {
      ...deviceAuthState,
      status: 'awaiting',
      userCode: 'WXYZ-1234',
      verificationUri: 'https://github.com/login/device'
    }
    render(<AddAccountModal open onOpenChange={onOpenChange} />)
    expect(screen.getByText('WXYZ-1234')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for authorization/i)).toBeInTheDocument()
  })

  it('submits a Personal Access Token via the fallback', async () => {
    render(<AddAccountModal open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: /use a personal access token/i }))
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: 'ghp_test' } })
    await user.click(screen.getByRole('button', { name: /connect with token/i }))
    expect(signInMutate).toHaveBeenCalledWith('ghp_test', expect.any(Object))
  })

  it('closes and resets when a device-flow sign-in succeeds', () => {
    deviceAuthState = { ...deviceAuthState, status: 'success' }
    render(<AddAccountModal open onOpenChange={onOpenChange} />)
    expect(resetMock).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
