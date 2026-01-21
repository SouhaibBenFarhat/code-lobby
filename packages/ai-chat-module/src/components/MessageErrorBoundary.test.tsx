/**
 * Tests for MessageErrorBoundary component
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageErrorBoundary } from './MessageErrorBoundary'

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Content rendered successfully</div>
}

describe('MessageErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when no error occurs', () => {
    render(
      <MessageErrorBoundary>
        <div>Child content</div>
      </MessageErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('should render error fallback when child throws', () => {
    render(
      <MessageErrorBoundary messageId="test-msg-123">
        <ThrowingComponent shouldThrow={true} />
      </MessageErrorBoundary>
    )

    expect(screen.getByText('Failed to render message')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should show raw content in details when provided', async () => {
    const user = userEvent.setup()
    const rawContent = 'This is the raw message content'

    render(
      <MessageErrorBoundary messageId="test-msg-123" content={rawContent}>
        <ThrowingComponent shouldThrow={true} />
      </MessageErrorBoundary>
    )

    // Details should be collapsed initially
    expect(screen.queryByText(rawContent)).not.toBeVisible()

    // Click to expand
    await user.click(screen.getByText('Show raw content'))

    // Now should be visible
    expect(screen.getByText(rawContent)).toBeVisible()
  })

  it('should not show raw content section if content is not provided', () => {
    render(
      <MessageErrorBoundary messageId="test-msg-123">
        <ThrowingComponent shouldThrow={true} />
      </MessageErrorBoundary>
    )

    expect(screen.queryByText('Show raw content')).not.toBeInTheDocument()
  })

  it('should log error details to console', () => {
    const consoleSpy = vi.spyOn(console, 'error')

    render(
      <MessageErrorBoundary messageId="test-msg-123" content="test content">
        <ThrowingComponent shouldThrow={true} />
      </MessageErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith('[AIChat] Message render error:', expect.any(Error))
    expect(consoleSpy).toHaveBeenCalledWith('[AIChat] Message ID:', 'test-msg-123')
  })

  it('should handle unknown error message gracefully', () => {
    // Create a component that throws without a message
    function ThrowEmpty(): React.JSX.Element {
      throw { notAnError: true }
    }

    render(
      <MessageErrorBoundary>
        <ThrowEmpty />
      </MessageErrorBoundary>
    )

    // Should show fallback text
    expect(screen.getByText('Unknown rendering error')).toBeInTheDocument()
  })
})
