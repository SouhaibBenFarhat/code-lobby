/**
 * StreamingBubble - Renders the currently streaming assistant response
 * Features smooth text animation with gentle fade-in effect
 *
 * Note: Scroll management is handled by parent component (AIChat)
 */

import { ClaudeIcon } from '@ui-kit'
import { Brain, Loader2 } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { StreamingState } from '../../types'

export interface StreamingBubbleProps {
  streaming: StreamingState
}

// Split content into animated segments
function useAnimatedContent(content: string): string[] {
  const [segments, setSegments] = useState<string[]>([])
  const lastLengthRef = useRef(0)

  useEffect(() => {
    if (content.length > lastLengthRef.current) {
      const newContent = content.slice(lastLengthRef.current)
      lastLengthRef.current = content.length

      const newSegments = newContent.match(/\S+[.,!?;:]*\s*|\s+/g) || []
      if (newSegments.length > 0) {
        setSegments((prev) => [...prev, ...newSegments])
      }
    }
  }, [content])

  useEffect(() => {
    if (content === '') {
      setSegments([])
      lastLengthRef.current = 0
    }
  }, [content])

  return segments
}

function StreamingBubbleInner({ streaming }: StreamingBubbleProps): React.JSX.Element {
  const thinkingRef = useRef<HTMLPreElement>(null)
  const contentSegments = useAnimatedContent(streaming.content)

  // Auto-scroll thinking section internally
  useEffect(() => {
    if (thinkingRef.current && streaming.thinking) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
    }
  }, [streaming.thinking])

  const animatedContent = useMemo(() => {
    if (contentSegments.length === 0) return null

    return (
      <span className="streaming-text">
        {contentSegments.map((segment, i) => (
          <span key={`${i}-${segment.slice(0, 10)}`} className="streaming-word">
            {segment}
          </span>
        ))}
        <span className="streaming-cursor" />
      </span>
    )
  }, [contentSegments])

  return (
    <div className="flex gap-2" style={{ contain: 'content', willChange: 'contents' }}>
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

        {/* Main content */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2">
          {streaming.content ? (
            <div className="whitespace-pre-wrap leading-relaxed">{animatedContent}</div>
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

      {/* CSS animations */}
      <style>{`
        .streaming-text {
          display: inline;
        }
        .streaming-word {
          display: inline;
          animation: gentleFadeIn 0.4s ease-out forwards;
        }
        @keyframes gentleFadeIn {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: hsl(var(--primary) / 0.6);
          margin-left: 1px;
          animation: cursorBlink 1s ease-in-out infinite;
          vertical-align: text-bottom;
          border-radius: 1px;
        }
        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

export const StreamingBubble: React.NamedExoticComponent<StreamingBubbleProps> =
  React.memo(StreamingBubbleInner)
