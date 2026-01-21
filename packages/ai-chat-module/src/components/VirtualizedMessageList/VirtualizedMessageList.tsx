/**
 * VirtualizedMessageList - Virtualized list of chat messages for performance
 * IMPORTANT: Streaming content is rendered OUTSIDE the virtualizer to avoid constant re-measurements
 */

import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import React, { useLayoutEffect, useMemo } from 'react'
import type {
  ChatMessage,
  GitHubUser,
  LinkedPRChat,
  QueuedMessage,
  StreamingState
} from '../../types'
import { MessageBubble } from '../MessageBubble'
import { QueuedMessageBubble } from '../QueuedMessageBubble'
import { StreamingBubble } from '../StreamingBubble'

export interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  streaming: StreamingState
  throttledStreaming: StreamingState // Throttled version for display
  messageQueue: QueuedMessage[]
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  setMessageQueue: React.Dispatch<React.SetStateAction<QueuedMessage[]>>
  scrollContainerRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
  onVirtualizerReady: (scrollToEnd: () => void) => void
  user?: GitHubUser | null
  linkedPRChat?: LinkedPRChat | null
  onPostComment?: (
    file: string,
    line: number,
    body: string
  ) => Promise<{ success: boolean; commentUrl?: string }>
}

export function VirtualizedMessageList({
  messages,
  streaming,
  throttledStreaming,
  messageQueue,
  expandedThinking,
  toggleThinkingExpanded,
  setMessageQueue,
  scrollContainerRef,
  onScroll,
  onVirtualizerReady,
  user,
  linkedPRChat,
  onPostComment
}: VirtualizedMessageListProps): React.JSX.Element {
  // Only virtualize static messages - streaming content is rendered separately
  const allItems = useMemo(() => {
    const items: Array<{
      type: 'message' | 'queued'
      data: ChatMessage | QueuedMessage
      index?: number
    }> = []

    // Add messages
    messages.forEach((msg) => {
      items.push({ type: 'message', data: msg })
    })

    // Add queued messages (these are static, ok to virtualize)
    messageQueue.forEach((msg, idx) => {
      items.push({ type: 'queued', data: msg, index: idx })
    })

    return items
  }, [messages, messageQueue])

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100, // Slightly larger estimate for safety
    overscan: 5 // Render 5 extra items above/below viewport
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Expose scrollToEnd function to parent via callback
  // This uses virtualizer's scrollToIndex which is more reliable
  useLayoutEffect(() => {
    const scrollToEnd = () => {
      if (allItems.length > 0) {
        // Use virtualizer's scrollToIndex for accurate positioning
        virtualizer.scrollToIndex(allItems.length - 1, { align: 'end' })

        // Also scroll to absolute bottom to include streaming content
        requestAnimationFrame(() => {
          const container = scrollContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      }
    }
    onVirtualizerReady(scrollToEnd)
  }, [allItems.length, virtualizer, onVirtualizerReady, scrollContainerRef])

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto p-3" onScroll={onScroll}>
      {/* Virtualized messages */}
      <div
        style={{
          height: allItems.length > 0 ? `${virtualizer.getTotalSize()}px` : 'auto',
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = allItems[virtualItem.index]

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`
              }}
              className="pb-3"
            >
              {item.type === 'message' && (
                <MessageBubble
                  message={item.data as ChatMessage}
                  expandedThinking={expandedThinking}
                  toggleThinkingExpanded={toggleThinkingExpanded}
                  user={user}
                  linkedPRChat={linkedPRChat}
                  onPostComment={onPostComment}
                />
              )}

              {item.type === 'queued' && (
                <QueuedMessageBubble
                  message={item.data as QueuedMessage}
                  index={item.index ?? 0}
                  onRemove={() =>
                    setMessageQueue((prev) =>
                      prev.filter((m) => m.id !== (item.data as QueuedMessage).id)
                    )
                  }
                  user={user}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Streaming content - rendered OUTSIDE virtualizer for smooth updates */}
      {streaming.isStreaming && (
        <div className="pb-3">
          <StreamingBubble streaming={throttledStreaming} />
        </div>
      )}

      {/* Queue header - rendered outside virtualizer when streaming */}
      {streaming.isStreaming && messageQueue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 pb-3 border-t border-dashed border-border/50">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>
            {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
          </span>
        </div>
      )}

      {/* Scroll anchor at absolute bottom */}
      <div data-scroll-anchor className="h-px" />
    </div>
  )
}
