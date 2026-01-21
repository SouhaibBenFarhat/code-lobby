/**
 * StreamingBubble - Renders the currently streaming assistant response
 * Optimized for frequent updates with GPU hints
 */

import { ClaudeIcon, MarkdownContent } from '@codelobby/ui-kit'
import { Brain, Loader2 } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import type { StreamingState } from '../types'
import { MessageErrorBoundary } from './MessageErrorBoundary'

export interface StreamingBubbleProps {
  streaming: StreamingState
}

function StreamingBubbleInner({ streaming }: StreamingBubbleProps): React.JSX.Element {
  const thinkingRef = useRef<HTMLPreElement>(null)

  // Auto-scroll thinking section to bottom as new content streams in
  useEffect(() => {
    if (thinkingRef.current && streaming.thinking) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
    }
  }, [streaming.thinking])

  return (
    <div
      className="flex gap-2"
      style={{
        contain: 'content', // Isolate layout changes to this subtree
        willChange: 'contents' // Hint to browser about updates
      }}
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] rounded-lg bg-muted min-h-[40px]">
        {streaming.thinking && (
          <div className="border-b border-primary/20 bg-primary/5">
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-primary/80">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Thinking...</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Extended reasoning</span>
            </div>
            <div
              className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded"
              style={{ contain: 'content' }}
            >
              <pre
                ref={thinkingRef}
                className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed"
              >
                {streaming.thinking}
                <span className="inline-block w-2 h-3 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
              </pre>
            </div>
          </div>
        )}
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2"
          style={{ contain: 'content' }}
        >
          {streaming.content ? (
            <>
              <MessageErrorBoundary messageId="streaming" content={streaming.content}>
                <MarkdownContent content={streaming.content} />
              </MessageErrorBoundary>
              <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
            </>
          ) : (
            !streaming.thinking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Generating response...</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export const StreamingBubble: React.NamedExoticComponent<StreamingBubbleProps> =
  React.memo(StreamingBubbleInner)
