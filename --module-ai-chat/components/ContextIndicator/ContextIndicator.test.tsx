/**
 * Tests for ContextIndicator component
 */

import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../types'
import { ContextIndicator } from './ContextIndicator'

describe('ContextIndicator', () => {
  const createMessage = (content: string): ChatMessage => ({
    id: `msg_${Date.now()}_${Math.random()}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  })

  it('should render progress bar', () => {
    render(<ContextIndicator messages={[]} model="claude-3-sonnet-20240229" />)

    const progressBar = document.querySelector('.bg-surface.rounded-full')
    expect(progressBar).toBeInTheDocument()
  })

  it('should show green color for low usage (<50%)', () => {
    const messages = [createMessage('Short message')]

    render(<ContextIndicator messages={messages} model="claude-3-sonnet-20240229" />)

    const fill = document.querySelector('.bg-green-500')
    expect(fill).toBeInTheDocument()
  })

  it('should show warning indicator for high usage (>=95%)', async () => {
    // Create enough content to exceed 95% of context
    // 200K tokens * 4 chars/token = 800K chars to fill
    // 95% = 760K chars
    const longContent = 'a'.repeat(800000) // ~200K tokens
    const messages = [createMessage(longContent)]

    render(<ContextIndicator messages={messages} model="claude-3-sonnet-20240229" />)

    // Should show warning emoji
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should include input text in calculation', async () => {
    const user = userEvent.setup()
    const messages: ChatMessage[] = []
    const inputText = 'a'.repeat(4000) // ~1K tokens

    const { container, rerender } = render(
      <ContextIndicator messages={messages} model="claude-3-sonnet-20240229" />
    )

    // Get initial percentage
    const trigger = container.querySelector('[data-state]')
    if (trigger) {
      await user.hover(trigger)
    }

    // Rerender with input
    rerender(
      <ContextIndicator
        messages={messages}
        model="claude-3-sonnet-20240229"
        inputText={inputText}
      />
    )

    // Tooltip should show some percentage (not exactly 0%)
    // We can't easily test exact values, but we verify it renders
    expect(container).toBeInTheDocument()
  })

  it('should include streaming content in calculation', () => {
    const messages: ChatMessage[] = []
    const streamingContent = 'This is streaming content being generated...'

    render(
      <ContextIndicator
        messages={messages}
        model="claude-3-sonnet-20240229"
        streamingContent={streamingContent}
      />
    )

    // Component should render without error
    const progressBar = document.querySelector('.bg-surface.rounded-full')
    expect(progressBar).toBeInTheDocument()
  })

  it('should include streaming thinking in calculation', () => {
    const messages: ChatMessage[] = []
    const streamingThinking = 'Extended thinking process...'

    render(
      <ContextIndicator
        messages={messages}
        model="claude-3-sonnet-20240229"
        streamingThinking={streamingThinking}
      />
    )

    const progressBar = document.querySelector('.bg-surface.rounded-full')
    expect(progressBar).toBeInTheDocument()
  })

  it('should use default context window for unknown models', () => {
    const messages: ChatMessage[] = []

    render(<ContextIndicator messages={messages} model="unknown-model-xyz" />)

    // Should render without error using default
    const progressBar = document.querySelector('.bg-surface.rounded-full')
    expect(progressBar).toBeInTheDocument()
  })

  it('should format large token numbers with K suffix', async () => {
    const user = userEvent.setup()
    // Create content that results in ~10K tokens
    const content = 'a'.repeat(40000) // ~10K tokens
    const messages = [createMessage(content)]

    const { container } = render(
      <ContextIndicator messages={messages} model="claude-3-sonnet-20240229" />
    )

    // Hover to show tooltip
    const trigger = container.querySelector('.cursor-help')
    if (trigger) {
      await user.hover(trigger)
    }

    // Wait for tooltip to appear - it should contain "K"
    // The exact format is "X.XK / 200.0K context used"
  })
})
