/**
 * VirtualizedMessageList - Virtualized list of chat messages for performance
 * IMPORTANT: Streaming content is rendered OUTSIDE the virtualizer to avoid constant re-measurements
 */

import type { ClaudeReviewData } from '@data'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import React, { useCallback, useLayoutEffect, useMemo } from 'react'
import type { ChatMessage, GitHubUser, QueuedMessage, StreamingState } from '../../types'
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
  /** Ref for the bottom anchor element; parent uses scrollIntoView() to keep view at live edge (ChatGPT-style). */
  scrollAnchorRef?: React.RefObject<HTMLDivElement>
  onScroll: () => void
  /** Called as soon as user scrolls up (wheel) so parent can stop auto-scroll before scroll event. */
  onScrollUpIntent?: () => void
  /** Called right before applying programmatic scroll (in rAF). Return false to skip. Cancels in-flight scrolls. */
  getShouldAutoScroll?: () => boolean
  onVirtualizerReady: (scrollToEnd: (opts?: { smooth?: boolean }) => void) => void
  user?: GitHubUser | null
  // Review support - for messages that generated code reviews
  sessionReviews?: Record<string, ClaudeReviewData>
  onOpenReview?: (review: ClaudeReviewData) => void
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
  scrollAnchorRef,
  onScroll,
  onScrollUpIntent,
  getShouldAutoScroll,
  onVirtualizerReady,
  user,
  sessionReviews,
  onOpenReview
}: VirtualizedMessageListProps): React.JSX.Element {
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.deltaY < 0) {
        onScrollUpIntent?.()
      }
    },
    [onScrollUpIntent]
  )
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
    // Use ~400px so when stream ends we swap StreamingBubble (removed) for this row (added).
    // Same ballpark height = scrollHeight barely changes = no jerk. 100px caused shrink-then-grow and double jerk.
    estimateSize: () => 400,
    overscan: 2 // Render 2 extra items above/below viewport (tight for performance)
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Expose scrollToEnd function to parent via callback.
  // The actual scroll is applied in rAF; we check getShouldAutoScroll() there so in-flight
  // scrolls can be cancelled when the user has scrolled up (avoids fight/jump).
  useLayoutEffect(() => {
    const scrollToEnd = (opts?: { smooth?: boolean }) => {
      if (allItems.length > 0) {
        virtualizer.scrollToIndex(allItems.length - 1, { align: 'end' })
        const smooth = opts?.smooth ?? false
        requestAnimationFrame(() => {
          if (getShouldAutoScroll?.() === false) return
          const container = scrollContainerRef.current
          if (container) {
            if (smooth) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
            } else {
              container.scrollTop = container.scrollHeight
            }
          }
        })
      }
    }
    onVirtualizerReady(scrollToEnd)
  }, [allItems.length, virtualizer, onVirtualizerReady, scrollContainerRef, getShouldAutoScroll])

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-auto px-3 pt-3"
      onScroll={onScroll}
      onWheel={handleWheel}
    >
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
                  review={sessionReviews?.[(item.data as ChatMessage).id]}
                  onOpenReview={onOpenReview}
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

      {/* Streaming content - rendered OUTSIDE virtualizer. Containment isolates layout so height changes don't thrash the whole list. */}
      {streaming.isStreaming && (
        <div className="pb-3" style={{ contain: 'layout' }}>
          <StreamingBubble streaming={throttledStreaming} />
        </div>
      )}

      {/* Queue header - rendered outside virtualizer when streaming */}
      {streaming.isStreaming && messageQueue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 pb-3 border-t border-dashed border-border-muted">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>
            {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
          </span>
        </div>
      )}

      {/* Scroll anchor at absolute bottom - parent uses scrollIntoView(anchor) to keep view at live edge */}
      <div ref={scrollAnchorRef} data-scroll-anchor className="h-px" />
    </div>
  )
}
