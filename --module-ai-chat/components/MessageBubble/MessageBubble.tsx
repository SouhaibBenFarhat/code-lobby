/**
 * MessageBubble - Renders a single chat message (user or assistant)
 *
 * For assistant messages:
 * - Renders markdown content
 * - Shows thinking section (collapsible) if present
 * - Message actions menu (post as comment, etc.)
 *
 * Note: Review detection is handled via tool events, not text parsing
 */

import type { ClaudeReviewData } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ClaudeIcon,
  cn,
  ListMenu,
  ListMenuItem,
  MarkdownContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ThinkingSection
} from '@ui-kit'
import { ClipboardCheck, MessageSquarePlus, MoreHorizontal, User } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import type { ChatMessage, GitHubUser } from '../../types'
import { MessageErrorBoundary } from '../MessageErrorBoundary'
import { PostAsCommentModal } from '../PostAsCommentModal'

export interface MessageBubbleProps {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  user?: GitHubUser | null
  // Review support - for messages that generated code reviews
  review?: ClaudeReviewData
  onOpenReview?: (review: ClaudeReviewData) => void
}

function MessageBubbleInner({
  message,
  expandedThinking,
  toggleThinkingExpanded,
  user,
  review,
  onOpenReview
}: MessageBubbleProps): React.JSX.Element {
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleOpenReview = useCallback(() => {
    if (review && onOpenReview) {
      onOpenReview(review)
    }
  }, [review, onOpenReview])

  // Get display content - for user messages with displayLabel, show the label instead of full prompt
  const displayContent = useMemo(() => {
    if (!message.content) return ''
    // For user messages, prefer displayLabel (short label for quick actions)
    if (message.role === 'user' && (message as any).displayLabel) {
      return (message as any).displayLabel
    }
    return message.content
  }, [message.content, message.role, (message as any).displayLabel])

  const handlePostAsComment = useCallback(() => {
    setMenuOpen(false)
    setShowCommentModal(true)
  }, [])

  return (
    <>
      <div
        className={cn(
          'group flex gap-2',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        )}
      >
        {message.role === 'assistant' && (
          <div className="w-7 h-7 rounded-full bg-info-subtle flex items-center justify-center flex-shrink-0">
            <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}

        <div
          className={cn(
            'max-w-[85%] rounded-lg relative',
            message.role === 'user'
              ? 'user-bubble text-foreground px-3 py-2 shadow-elevation-low'
              : 'bg-chat-bubble border border-border shadow-elevation-low'
          )}
        >
          {message.role === 'assistant' ? (
            <div className="space-y-0">
              {/* Thinking section (collapsible) */}
              {message.thinking && (
                <ThinkingSection
                  thinking={message.thinking}
                  isExpanded={expandedThinking.has(message.id)}
                  onExpandedChange={() => toggleThinkingExpanded(message.id)}
                  showHint
                />
              )}

              {/* Message content */}
              <div className="px-3 py-2">
                {displayContent && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <MessageErrorBoundary messageId={message.id} content={displayContent}>
                      <MarkdownContent content={displayContent} />
                    </MessageErrorBoundary>
                  </div>
                )}

                {/* Review button - shown for messages that generated a code review */}
                {review && onOpenReview && (
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-2 flex items-center gap-1.5"
                    onClick={handleOpenReview}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    View Review ({review.comments.length} comment
                    {review.comments.length !== 1 ? 's' : ''})
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Actions menu - shows on hover */}
        {message.role === 'assistant' && displayContent && (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                  menuOpen && 'opacity-100'
                )}
                title="Message actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1">
              <ListMenu>
                <ListMenuItem
                  icon={<MessageSquarePlus className="w-4 h-4" />}
                  title="Post as comment"
                  onClick={handlePostAsComment}
                />
              </ListMenu>
            </PopoverContent>
          </Popover>
        )}

        {message.role === 'user' && (
          <Avatar className="w-7 h-7 flex-shrink-0">
            {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.login} /> : null}
            <AvatarFallback className="bg-surface">
              <User className="w-3.5 h-3.5" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Post as comment modal - only rendered when open to avoid hook errors in tests */}
      {showCommentModal && (
        <PostAsCommentModal
          open={showCommentModal}
          onOpenChange={setShowCommentModal}
          initialContent={displayContent}
        />
      )}
    </>
  )
}

export const MessageBubble: React.NamedExoticComponent<MessageBubbleProps> =
  React.memo(MessageBubbleInner)
