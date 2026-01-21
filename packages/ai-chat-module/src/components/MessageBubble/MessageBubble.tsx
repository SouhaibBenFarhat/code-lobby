/**
 * MessageBubble - Renders a single chat message (user or assistant)
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  ClaudeIcon,
  cn,
  MarkdownContent
} from '@codelobby/ui-kit'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  MessageSquarePlus,
  User
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import type {
  ChatMessage,
  ContentSection,
  GitHubUser,
  LinkedPRChat,
  PostableComment,
  PostingState
} from '../../types'
import { parseContentSections } from '../../utils/postable'
import { MessageErrorBoundary } from '../MessageErrorBoundary'

export interface MessageBubbleProps {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  user?: GitHubUser | null
  linkedPRChat?: LinkedPRChat | null
  onPostComment?: (
    file: string,
    line: number,
    body: string
  ) => Promise<{ success: boolean; commentUrl?: string }>
}

function MessageBubbleInner({
  message,
  expandedThinking,
  toggleThinkingExpanded,
  user,
  linkedPRChat,
  onPostComment
}: MessageBubbleProps): React.JSX.Element {
  const [postingState, setPostingState] = useState<PostingState>({})
  const [postedUrls, setPostedUrls] = useState<Record<string, string>>({})

  // Parse content into sections, each with potential postable
  const sections = useMemo(() => {
    if (message.role !== 'assistant') return []
    try {
      return parseContentSections(message.content || '')
    } catch (e) {
      console.error('Error parsing content sections:', e)
      return [{ content: message.content || '', postable: null, prComment: null }]
    }
  }, [message.content, message.role])

  const handlePostComment = async (
    postable: PostableComment,
    sectionContent: string,
    sectionIndex: number
  ) => {
    if (!onPostComment) return

    const key = `section-${sectionIndex}`
    setPostingState((prev) => ({ ...prev, [key]: 'posting' }))

    try {
      // Post only the content of THIS section, not the whole message
      const result = await onPostComment(postable.file, postable.line, sectionContent)

      if (result.success) {
        setPostingState((prev) => ({ ...prev, [key]: 'posted' }))
        if (result.commentUrl) {
          setPostedUrls((prev) => ({ ...prev, [key]: result.commentUrl as string }))
        }
      } else {
        setPostingState((prev) => ({ ...prev, [key]: 'error' }))
      }
    } catch {
      setPostingState((prev) => ({ ...prev, [key]: 'error' }))
    }
  }

  // Render a single section with optional inline Post button
  const renderSection = (section: ContentSection, index: number) => {
    const key = `section-${index}`
    const state = postingState[key]
    const postedUrl = postedUrls[key]
    const showPostButton = section.postable && linkedPRChat && onPostComment

    return (
      <div key={key} className={cn(index > 0 && 'border-t border-border/20 pt-2 mt-2')}>
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <MessageErrorBoundary messageId={message.id} content={section.content}>
            <MarkdownContent content={section.content} />
          </MessageErrorBoundary>
        </div>

        {/* Inline Post button for this section */}
        {showPostButton && section.postable && (
          <div className="flex items-center gap-2 mt-2 text-xs bg-blue-500/10 rounded px-2 py-1.5">
            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-muted-foreground truncate flex-1">
              <code className="text-[10px] bg-black/20 px-1 rounded">{section.postable.file}</code>
              <span className="text-muted-foreground/60 mx-1">:</span>
              <span className="text-blue-400">L{section.postable.line}</span>
            </span>

            {state === 'posted' && postedUrl ? (
              <a
                href={postedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Posted</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : state === 'posting' ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Posting...</span>
              </span>
            ) : state === 'error' ? (
              <button
                type="button"
                onClick={() => {
                  if (section.postable) {
                    // Use PR comment if available, otherwise fall back to section content
                    const commentBody = section.prComment || section.content
                    handlePostComment(section.postable, commentBody, index)
                  }
                }}
                className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Retry</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (section.postable) {
                    // Use PR comment if available, otherwise fall back to section content
                    const commentBody = section.prComment || section.content
                    handlePostComment(section.postable, commentBody, index)
                  }
                }}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors font-medium"
              >
                <span>Post to PR</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

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
            {message.thinking && (
              <div
                className={cn(
                  'border-b transition-colors',
                  expandedThinking.has(message.id)
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border/50'
                )}
              >
                <button
                  type="button"
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
                </button>
                {expandedThinking.has(message.id) && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
                      {message.thinking}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Render sections with inline Post buttons */}
            <div className="px-3 py-2">
              {sections.length > 0 ? (
                sections.map((section, index) => renderSection(section, index))
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <MessageErrorBoundary messageId={message.id} content={message.content}>
                    <MarkdownContent content={message.content || ''} />
                  </MessageErrorBoundary>
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
