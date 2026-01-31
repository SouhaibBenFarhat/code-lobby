/**
 * StreamingBubble - Renders the currently streaming assistant response
 * Optimized for performance: no word-by-word animation, CSS in globals.css
 *
 * Note: Scroll management is handled by parent component (AIChat)
 */

import { ClaudeIcon, MarkdownContent } from '@ui-kit'
import { Brain } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import type { StreamingState } from '../../types'
import { StreamingStateIndicator } from '../StreamingStateIndicator'

/**
 * Fix incomplete markdown code blocks for better streaming display.
 * Adds closing ``` if we have an unclosed code block.
 */
function fixIncompleteMarkdown(content: string): string {
  // Count code fence markers
  const fenceMatches = content.match(/```/g)
  const fenceCount = fenceMatches?.length || 0

  // If odd number of fences, we have an unclosed code block
  if (fenceCount % 2 === 1) {
    return `${content}\n\`\`\``
  }

  return content
}

export interface StreamingBubbleProps {
  streaming: StreamingState
}

function StreamingBubbleInner({ streaming }: StreamingBubbleProps): React.JSX.Element {
  const thinkingRef = useRef<HTMLPreElement>(null)
  const lastScrollRef = useRef(0)

  // Throttled auto-scroll for thinking section (every 100ms max)
  useEffect(() => {
    if (thinkingRef.current && streaming.thinking) {
      const now = Date.now()
      if (now - lastScrollRef.current > 100) {
        thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
        lastScrollRef.current = now
      }
    }
  }, [streaming.thinking])

  return (
    <div className="flex gap-2">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
      </div>

      {/* Content */}
      <div className="max-w-[85%] rounded-lg bg-muted min-h-[40px]">
        {/* Thinking section */}
        {streaming.thinking && (
          <div className="border-b border-primary/20 bg-primary/5">
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-primary/80">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Thinking...</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Extended reasoning</span>
            </div>
            <div className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded">
              <pre
                ref={thinkingRef}
                className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed"
              >
                {streaming.thinking}
                <span className="streaming-cursor" />
              </pre>
            </div>
          </div>
        )}

        {/* State indicator at top - shows what Claude is doing when no content yet */}
        {!streaming.content && !streaming.thinking && streaming.status !== 'idle' && (
          <div className="px-3 py-2 border-b border-border/50">
            <StreamingStateIndicator status={streaming.status} activity={streaming.activity} />
          </div>
        )}

        {/* Main content - rendered as markdown for proper code formatting */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2">
          {streaming.content ? (
            <>
              <div className="leading-relaxed">
                <MarkdownContent content={fixIncompleteMarkdown(streaming.content)} />
                <span className="streaming-cursor" />
              </div>
              {/* Show state at bottom when paused/composing with existing content */}
              {(streaming.status === 'composing' || streaming.status === 'tool_use') && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <StreamingStateIndicator
                    status={streaming.status}
                    activity={streaming.activity}
                    className="opacity-80"
                  />
                </div>
              )}
            </>
          ) : (
            !streaming.thinking &&
            streaming.status === 'idle' && (
              <StreamingStateIndicator status="composing" activity={null} />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export const StreamingBubble: React.MemoExoticComponent<typeof StreamingBubbleInner> =
  React.memo(StreamingBubbleInner)
