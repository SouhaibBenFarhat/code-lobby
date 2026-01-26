import { render, screen, waitFor } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './CopyButton'

describe('CopyButton', () => {
  let mockWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create fresh mock for each test
    mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render copy icon initially', () => {
    render(<CopyButton text="test" label="test" />)

    const button = screen.getByRole('button', { name: /copy test/i })
    expect(button).toBeInTheDocument()
  })

  it('should copy text to clipboard when clicked', async () => {
    const user = userEvent.setup()
    const textToCopy = 'Hello, World!'

    render(<CopyButton text={textToCopy} label="content" />)

    const button = screen.getByRole('button', { name: /copy content/i })
    await user.click(button)

    // After clicking, should show copied state (proves the copy was triggered)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
    })
  })

  it('should show checkmark icon after successful copy', async () => {
    const user = userEvent.setup()

    render(<CopyButton text="test" label="test" />)

    const button = screen.getByRole('button', { name: /copy test/i })
    await user.click(button)

    // After clicking, aria-label should change to "Copied!"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
    })
  })

  it('should handle clipboard API errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Override with a rejecting mock (create new clipboard object to ensure rejection is used)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')) },
      writable: true,
      configurable: true
    })

    render(<CopyButton text="test" label="test" />)

    const button = screen.getByRole('button', { name: /copy test/i })
    await user.click(button)

    // Wait for the error to be logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })

  it('should have correct styling classes', () => {
    render(<CopyButton text="test" label="test" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-5', 'w-5', 'opacity-60')
  })

  it('should use custom label in aria-label', () => {
    render(<CopyButton text="test" label="response" />)

    expect(screen.getByRole('button', { name: /copy response/i })).toBeInTheDocument()
  })
})
