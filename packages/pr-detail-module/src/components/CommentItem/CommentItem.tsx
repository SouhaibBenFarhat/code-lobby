/**
 * CommentItem - Displays a single comment in the PR timeline.
 */

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
} from '@codelobby/ui-kit'
import { Bot, Check, ChevronRight, Copy } from 'lucide-react'
import { useState } from 'react'
import type { CommentData } from '../types'

export interface CommentItemProps {
  comment: CommentData
}

const TRUNCATE_LENGTH = 200

export function CommentItem({ comment }: CommentItemProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!comment.actor) return null

  const shouldTruncate = comment.body && comment.body.length > TRUNCATE_LENGTH

  const handleCopy = async () => {
    if (comment.body) {
      await navigator.clipboard.writeText(comment.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
      </Row>
    </div>
  )
}
