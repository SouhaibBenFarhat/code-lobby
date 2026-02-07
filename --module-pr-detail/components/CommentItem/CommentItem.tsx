/**
 * CommentItem - Displays a single comment in the PR timeline.
 */

import { useCurrentUser, useDeletePRComment } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Col,
  cn,
  formatRelativeTime,
  MarkdownContent,
  Row
} from '@ui-kit'
import {
  Bot,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  MonitorPlay,
  Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CommentData } from '../types'

export interface CommentItemProps {
  comment: CommentData
  /** Repository full name for mutations */
  repoFullName: string
  /** PR number for mutations */
  prNumber: number
  /** Callback to open a URL in the webview panel */
  onOpenInWebview?: (url: string) => void
}

const TRUNCATE_LENGTH = 200

/**
 * Extract unique URLs from text content.
 * Matches http/https URLs and filters out duplicates.
 */
function extractLinks(text: string | undefined): string[] {
  if (!text) return []

  // Match URLs starting with http:// or https://
  const urlRegex = /https?:\/\/[^\s<>[\]()'"`,]+/gi
  const matches = text.match(urlRegex) || []

  // Remove duplicates and clean up trailing punctuation
  const uniqueUrls = [...new Set(matches)].map((url) => {
    // Remove trailing punctuation that might have been captured
    return url.replace(/[.,;:!?)]+$/, '')
  })

  return uniqueUrls
}

/**
 * Get a friendly display name for a URL
 */
function getUrlDisplayName(url: string): string {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname.slice(0, 30)
    return `${hostname}${path.length > 1 ? path : ''}${parsed.pathname.length > 30 ? '...' : ''}`
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? '...' : '')
  }
}

export function CommentItem({
  comment,
  repoFullName,
  prNumber,
  onOpenInWebview
}: CommentItemProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null)

  const { data: currentUser } = useCurrentUser()
  const deleteComment = useDeletePRComment()

  // Extract links from comment body
  const extractedLinks = useMemo(() => extractLinks(comment.body), [comment.body])

  if (!comment.actor) return null

  // Check if current user can delete this comment (only their own comments)
  const canDelete = currentUser?.login === comment.actor.login && comment.event === 'commented'

  const handleDelete = () => {
    if (!canDelete) return

    deleteComment.mutate({
      commentNodeId: comment.id,
      repoFullName,
      prNumber
    })
  }

  const shouldTruncate = comment.body && comment.body.length > TRUNCATE_LENGTH

  const handleCopy = async () => {
    if (comment.body) {
      await navigator.clipboard.writeText(comment.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyLink = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url)
    setCopiedLinkIndex(index)
    setTimeout(() => setCopiedLinkIndex(null), 2000)
  }

  const getEventBadge = () => {
    switch (comment.event) {
      case 'approved':
        return (
          <Badge
            variant="default"
            className="bg-success/20 text-success text-[9px] h-[18px] px-1.5"
          >
            Approved
          </Badge>
        )
      case 'changes_requested':
        return (
          <Badge
            variant="default"
            className="bg-destructive/20 text-destructive text-[9px] h-[18px] px-1.5"
          >
            Changes
          </Badge>
        )
      case 'reviewed':
        return (
          <Badge variant="secondary" className="text-[9px] h-[18px] px-1.5">
            Reviewed
          </Badge>
        )
      default:
        return null
    }
  }

  // Truncate markdown content for preview
  const getPreviewContent = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    // Try to truncate at a natural break point
    const truncated = text.slice(0, maxLength)
    const lastNewline = truncated.lastIndexOf('\n')
    const lastSpace = truncated.lastIndexOf(' ')
    const breakPoint =
      lastNewline > maxLength * 0.5
        ? lastNewline
        : lastSpace > maxLength * 0.5
          ? lastSpace
          : maxLength
    return `${truncated.slice(0, breakPoint)}...`
  }

  return (
    <div
      className={cn(
        'p-2.5 rounded-lg overflow-hidden border-l-2 group/comment',
        comment.actor.isBot
          ? 'bg-purple-500/15 border-l-purple-500 dark:bg-purple-500/20'
          : comment.event === 'approved'
            ? 'bg-success/15 border-l-success dark:bg-success/20'
            : comment.event === 'changes_requested'
              ? 'bg-destructive/15 border-l-destructive dark:bg-destructive/20'
              : 'bg-muted/40 border-l-primary/50 dark:bg-muted/50'
      )}
    >
      <Row gutter="xs" className="flex-col">
        <Col span="full">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <Avatar className="h-5 w-5">
                <AvatarImage src={comment.actor.avatar_url} alt={comment.actor.login} />
                <AvatarFallback className="text-[9px]">
                  {comment.actor.login.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Col>
            <Col span="auto">
              <span className="text-xs font-medium truncate max-w-[100px]">
                {comment.actor.login}
              </span>
            </Col>
            {comment.actor.isBot && (
              <Col span="auto">
                <Badge
                  variant="outline"
                  className="text-[9px] h-[16px] px-1 gap-0.5 text-purple-500 border-purple-500/50"
                >
                  <Bot className="w-2 h-2" />
                  Bot
                </Badge>
              </Col>
            )}
            {getEventBadge() && <Col span="auto">{getEventBadge()}</Col>}
            <Col>
              <Row gutter="xs" align="center" justify="end">
                <Col span="auto">
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </Col>
                {/* Copy button - visible on hover */}
                {comment.body && (
                  <Col span="auto">
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={handleCopy}
                      className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                      title="Copy comment"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      )}
                    </Button>
                  </Col>
                )}
                {/* Delete button - visible on hover for own comments */}
                {canDelete && (
                  <Col span="auto">
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={handleDelete}
                      disabled={deleteComment.isPending}
                      className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      title="Delete comment"
                    >
                      {deleteComment.isPending ? (
                        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </Col>
                )}
              </Row>
            </Col>
          </Row>
        </Col>
        {comment.body && (
          <Col span="full">
            <Row gutter="xs" className="flex-col">
              <Col span="full">
                <div className="text-xs text-foreground/80 dark:text-foreground/70 overflow-hidden">
                  <MarkdownContent
                    content={
                      isExpanded || !shouldTruncate
                        ? comment.body
                        : getPreviewContent(comment.body, TRUNCATE_LENGTH)
                    }
                  />
                </div>
              </Col>
              {shouldTruncate && (
                <Col span="full">
                  <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] text-primary hover:text-primary/80 font-medium"
                  >
                    <Row gutter="xs" align="center">
                      <Col span="auto">
                        <ChevronRight
                          className={cn('w-3 h-3', isExpanded ? 'rotate-90' : '-rotate-90')}
                        />
                      </Col>
                      <Col span="auto">
                        {isExpanded
                          ? 'Show less'
                          : `Show more (${comment.body.length - TRUNCATE_LENGTH}+ chars)`}
                      </Col>
                    </Row>
                  </Button>
                </Col>
              )}
            </Row>
          </Col>
        )}

        {/* Extracted links footer */}
        {extractedLinks.length > 0 && (
          <Col span="full">
            <div className="mt-2 pt-2 border-t border-border/30">
              <div className="flex flex-col gap-1 items-start">
                {extractedLinks.map((url) => (
                  <div
                    key={url}
                    className="inline-flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1 text-[10px] group/link max-w-full"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                      title={url}
                    >
                      {getUrlDisplayName(url)}
                    </a>
                    {/* Open in CodeLobby button */}
                    {onOpenInWebview && (
                      <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => onOpenInWebview(url)}
                        className="opacity-0 group-hover/link:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded flex-shrink-0"
                        title="Open in CodeLobby"
                      >
                        <MonitorPlay className="w-3 h-3 text-muted-foreground hover:text-primary" />
                      </Button>
                    )}
                    {/* Copy link button */}
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={() => handleCopyLink(url, extractedLinks.indexOf(url))}
                      className="opacity-0 group-hover/link:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded flex-shrink-0"
                      title="Copy link"
                    >
                      {copiedLinkIndex === extractedLinks.indexOf(url) ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        )}
      </Row>
    </div>
  )
}
