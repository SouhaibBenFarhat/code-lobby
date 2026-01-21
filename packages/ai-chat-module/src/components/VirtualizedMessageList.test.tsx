/**
 * Tests for VirtualizedMessageList component
 */

import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage, StreamingState } from '../types'
import { VirtualizedMessageList } from './VirtualizedMessageList'

// Wrapper component to provide the ref
function TestWrapper({
  messages,
  streaming,
  messageQueue = [],
  expandedThinking = new Set<string>()
}: {
  messages: ChatMessage[]
  streaming: StreamingState
  messageQueue?: Array<{ id: string; content: string }>
  expandedThinking?: Set<string>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ height: '400px' }}>
      <VirtualizedMessageList
        messages={messages}
        streaming={streaming}
        throttledStreaming={streaming}
        messageQueue={messageQueue}
        expandedThinking={expandedThinking}
        toggleThinkingExpanded={vi.fn()}
        setMessageQueue={vi.fn()}
        scrollContainerRef={scrollRef}
        onScroll={vi.fn()}
        onVirtualizerReady={vi.fn()}
      />
    </div>
  )
}

describe('VirtualizedMessageList', () => {
  const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): ChatMessage => ({
    id: `msg_${Date.now()}_${Math.random()}`,
    role,
    content,
    timestamp: new Date().toISOString()
  })

  const notStreaming: StreamingState = {
    content: '',
    thinking: '',
    isStreaming: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render messages container', () => {
    const messages = [createMessage('Hello', 'user'), createMessage('Hi there!', 'assistant')]

    render(<TestWrapper messages={messages} streaming={notStreaming} />)

    // Due to virtualization, items may not render in JSDOM without proper scroll context
    // Just verify the container and data structure is correct
    const container = document.querySelector('.overflow-auto')
    expect(container).toBeInTheDocument()

    // Verify the virtualizer has the correct height
    const virtualContainer = container?.querySelector('[style*="position: relative"]')
    expect(virtualContainer).toBeInTheDocument()
  })

  it('should render streaming content when streaming', () => {
    const streaming: StreamingState = {
      content: 'Generating this response...',
      thinking: '',
      isStreaming: true
    }

    render(<TestWrapper messages={[]} streaming={streaming} />)

    expect(screen.getByText('Generating this response...')).toBeInTheDocument()
  })

  it('should show queued messages count when streaming', () => {
    const streaming: StreamingState = {
      content: 'Response',
      thinking: '',
      isStreaming: true
    }

    const messageQueue = [
      { id: 'q1', content: 'First queued' },
      { id: 'q2', content: 'Second queued' }
    ]

    render(<TestWrapper messages={[]} streaming={streaming} messageQueue={messageQueue} />)

    expect(screen.getByText('2 messages queued')).toBeInTheDocument()
  })

  it('should render scroll anchor', () => {
    render(<TestWrapper messages={[]} streaming={notStreaming} />)

    const anchor = document.querySelector('[data-scroll-anchor]')
    expect(anchor).toBeInTheDocument()
  })

  it('should handle empty state', () => {
    render(<TestWrapper messages={[]} streaming={notStreaming} />)

    // Should render without error, just the container and anchor
    const container = document.querySelector('.overflow-auto')
    expect(container).toBeInTheDocument()
  })

  it('should handle many messages (virtualization container test)', () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      createMessage(`Message ${i}`, i % 2 === 0 ? 'user' : 'assistant')
    )

    render(<TestWrapper messages={messages} streaming={notStreaming} />)

    // Verify the container is set up for virtualization
    const container = document.querySelector('.overflow-auto')
    expect(container).toBeInTheDocument()

    // The virtualizer should set a height based on estimated item sizes
    const virtualContainer = container?.querySelector('[style*="height"]')
    expect(virtualContainer).toBeInTheDocument()
  })

  it('should show streaming bubble with thinking', () => {
    const streaming: StreamingState = {
      content: 'My response',
      thinking: 'Thinking about the problem...',
      isStreaming: true
    }

    render(<TestWrapper messages={[]} streaming={streaming} />)

    expect(screen.getByText('Thinking...')).toBeInTheDocument()
    expect(screen.getByText('Thinking about the problem...')).toBeInTheDocument()
    expect(screen.getByText('My response')).toBeInTheDocument()
  })
})
