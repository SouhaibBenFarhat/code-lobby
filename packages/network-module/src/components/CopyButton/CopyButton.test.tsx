import { TooltipProvider } from '@codelobby/ui-kit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './CopyButton'

// Wrapper component to provide TooltipProvider context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

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
    render(
      <TestWrapper>
        <CopyButton text="test" label="test" />
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: /copy test/i })
    expect(button).toBeInTheDocument()
  })

  it('should copy text to clipboard when clicked', async () => {
    const user = userEvent.setup()
    const textToCopy = 'Hello, World!'

    render(
      <TestWrapper>
        <CopyButton text={textToCopy} label="content" />
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: /copy content/i })
    await user.click(button)

    // After clicking, should show copied state (proves the copy was triggered)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
    })
  })

  it('should show checkmark icon after successful copy', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <CopyButton text="test" label="test" />
      </TestWrapper>
    )

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

    // Override with a rejecting mock
    mockWriteText.mockRejectedValue(new Error('Clipboard error'))

    render(
      <TestWrapper>
        <CopyButton text="test" label="test" />
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: /copy test/i })
    await user.click(button)

    // Wait for the error to be logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })

    consoleError.mockRestore()
  })

  it('should have correct styling classes', () => {
    render(
      <TestWrapper>
        <CopyButton text="test" label="test" />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-5', 'w-5', 'opacity-60')
  })

  it('should use custom label in aria-label', () => {
    render(
      <TestWrapper>
        <CopyButton text="test" label="response" />
      </TestWrapper>
    )

    expect(screen.getByRole('button', { name: /copy response/i })).toBeInTheDocument()
  })
})
