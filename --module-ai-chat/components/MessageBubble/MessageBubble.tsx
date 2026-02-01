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
  PopoverTrigger
} from '@ui-kit'
import { Brain, ChevronRight, MessageSquarePlus, MoreHorizontal, User } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import type { ChatMessage, GitHubUser } from '../../types'
import { MessageErrorBoundary } from '../MessageErrorBoundary'
import { PostAsCommentModal } from '../PostAsCommentModal'

export interface MessageBubbleProps {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  user?: GitHubUser | null
}

function MessageBubbleInner({
  message,
  expandedThinking,
  toggleThinkingExpanded,
  user
}: MessageBubbleProps): React.JSX.Element {
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}

        <div
          className={cn(
            'max-w-[85%] rounded-lg relative',
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
                {displayContent && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <MessageErrorBoundary messageId={message.id} content={displayContent}>
                      <MarkdownContent content={displayContent} />
                    </MessageErrorBoundary>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            <AvatarFallback className="bg-muted">
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
