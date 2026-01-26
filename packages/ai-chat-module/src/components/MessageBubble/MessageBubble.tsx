/**
 * MessageBubble - Renders a single chat message (user or assistant)
 *
 * For assistant messages:
 * - Renders markdown content
 * - Shows thinking section (collapsible) if present
 * - Detects review JSON and shows "Open Review" button
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ClaudeIcon,
  cn,
  MarkdownContent
} from '@codelobby/ui-kit'
import { Brain, ChevronRight, ClipboardCheck, User } from 'lucide-react'
import React, { useMemo } from 'react'
import type { ChatMessage, GitHubUser, ReviewData } from '../../types'
import {
  containsReviewJson,
  getDisplayContentWithoutReview,
  parseReviewFromMessage
} from '../../utils/review-parser'
import { MessageErrorBoundary } from '../MessageErrorBoundary'

export interface MessageBubbleProps {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  user?: GitHubUser | null
  onOpenReview?: (review: ReviewData) => void
}

function MessageBubbleInner({
  message,
  expandedThinking,
  toggleThinkingExpanded,
  user,
  onOpenReview
}: MessageBubbleProps): React.JSX.Element {
  // Check if the message contains a review JSON
  const reviewData = useMemo(() => {
    if (message.role !== 'assistant') return null
    if (!message.content) return null
    if (!containsReviewJson(message.content)) return null
    return parseReviewFromMessage(message.content)
  }, [message.content, message.role])

  // Get display content (without the JSON block if present)
  const displayContent = useMemo(() => {
    if (!message.content) return ''
    if (reviewData) {
      return getDisplayContentWithoutReview(message.content)
    }
    return message.content
  }, [message.content, reviewData])

  return (
    <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      {message.role === 'assistant' && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-lg',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground px-3 py-2 selection:bg-white/30 selection:text-white'
            : 'bg-muted'
        )}
      >
        {message.role === 'assistant' ? (
          <div className="space-y-0">
            {/* Thinking section (collapsible) */}
            {message.thinking && (
              <div
                className={cn(
                  'border-b transition-colors',
                  expandedThinking.has(message.id)
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border/50'
                )}
              >
                <Button
                  variant="unstyled"
                  size="none"
                  onClick={() => toggleThinkingExpanded(message.id)}
                  className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'w-3 h-3 transition-transform',
                      expandedThinking.has(message.id) && 'rotate-90'
                    )}
                  />
                  <Brain
                    className={cn(
                      'w-3.5 h-3.5',
                      expandedThinking.has(message.id) && 'text-primary'
                    )}
                  />
                  <span>Thinking</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">
                    Click to {expandedThinking.has(message.id) ? 'hide' : 'show'}
                  </span>
                </Button>
                {expandedThinking.has(message.id) && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
                      {message.thinking}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Message content */}
            <div className="px-3 py-2">
              {displayContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <MessageErrorBoundary messageId={message.id} content={displayContent}>
                    <MarkdownContent content={displayContent} />
                  </MessageErrorBoundary>
                </div>
              ) : reviewData ? (
                // If only review JSON with no other content, show a message
                <p className="text-sm text-muted-foreground">
                  Review generated. Click below to preview and submit.
                </p>
              ) : null}

              {/* Review button if review data detected */}
              {reviewData && onOpenReview && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <Button
                    onClick={() => onOpenReview(reviewData)}
                    className="w-full flex items-center justify-center gap-2"
                    variant="default"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Open Review ({reviewData.comments.length} comment
                    {reviewData.comments.length !== 1 ? 's' : ''})
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {message.role === 'user' && (
        <Avatar className="w-7 h-7 flex-shrink-0">
          {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.login} /> : null}
          <AvatarFallback className="bg-muted">
            <User className="w-3.5 h-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export const MessageBubble: React.NamedExoticComponent<MessageBubbleProps> =
  React.memo(MessageBubbleInner)
