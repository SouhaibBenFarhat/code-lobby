/**
 * ReviewerNode - Card-based timeline item for a reviewer's review
 *
 * Design (matches CommentItem style):
 * - Card with colored left border (green=approved, red=changes requested)
 * - Avatar, name, status badge, time
 * - Review body preview (truncated)
 * - Expandable to show inline comments with diffs
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  formatRelativeTime,
  MarkdownContent
} from '@ui-kit'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { CommentNode } from './CommentNode'
import type { ReviewerData } from './types'

export interface ReviewerNodeProps {
  reviewer: ReviewerData
  /** Whether to start expanded */
  defaultExpanded?: boolean
}

const TRUNCATE_LENGTH = 200

export function ReviewerNode({
  reviewer,
  defaultExpanded = false
}: ReviewerNodeProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const hasComments = reviewer.totalComments > 0
  const shouldTruncate = reviewer.reviewBody && reviewer.reviewBody.length > TRUNCATE_LENGTH

  // Get card styling based on review state
  const getCardClasses = () => {
    switch (reviewer.reviewState) {
      case 'approved':
        return 'bg-success/15 border-l-success dark:bg-success/20'
      case 'changes_requested':
        return 'bg-destructive/15 border-l-destructive dark:bg-destructive/20'
      default:
        return 'bg-muted/40 border-l-primary/50 dark:bg-muted/50'
    }
  }

  // Get status badge
  const getStatusBadge = () => {
    switch (reviewer.reviewState) {
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
      case 'commented':
        return (
          <Badge variant="secondary" className="text-[9px] h-[18px] px-1.5">
            Commented
          </Badge>
        )
      default:
        return null
    }
  }

  // Build summary text for comments
  const getSummaryText = (): string => {
    const parts: string[] = []
    if (reviewer.totalComments > 0) {
      parts.push(`${reviewer.totalComments} comment${reviewer.totalComments !== 1 ? 's' : ''}`)
      if (reviewer.totalUnresolved > 0) {
        parts.push(`${reviewer.totalUnresolved} open`)
      }
    }
    return parts.join(' · ')
  }

  // Truncate content for preview
  const getPreviewContent = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
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
    <div className={cn('rounded-lg overflow-hidden border-l-2 group/review', getCardClasses())}>
      {/* Header - always visible */}
      <div className="p-2.5">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
            <AvatarFallback className="text-[9px]">
              {reviewer.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <span className="text-xs font-medium truncate max-w-[120px]">{reviewer.login}</span>

          {/* Status badge */}
          {getStatusBadge()}

          {/* Summary stats */}
          {getSummaryText() && (
            <span
              className={cn(
                'text-[10px] text-muted-foreground',
                reviewer.totalUnresolved > 0 && 'text-warning'
              )}
            >
              {getSummaryText()}
            </span>
          )}

          {/* Time + expand button */}
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            {reviewer.reviewDate && (
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(reviewer.reviewDate)}
              </span>
            )}
            {hasComments && (
              <Button
                variant="unstyled"
                size="none"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-muted/50 rounded"
              >
                <ChevronRight
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              </Button>
            )}
          </div>
        </div>

        {/* Review body preview */}
        {reviewer.reviewBody && (
          <div className="mt-2 text-xs text-foreground/80 dark:text-foreground/70">
            <MarkdownContent
              content={
                isExpanded || !shouldTruncate
                  ? reviewer.reviewBody
                  : getPreviewContent(reviewer.reviewBody, TRUNCATE_LENGTH)
              }
            />
            {shouldTruncate && !isExpanded && (
              <Button
                variant="unstyled"
                size="none"
                onClick={() => setIsExpanded(true)}
                className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1"
              >
                Show more
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expanded content - inline comments */}
      {isExpanded && hasComments && (
        <div className="border-t border-border/30 bg-background/50 p-3 space-y-4">
          {reviewer.files.flatMap((file) =>
            file.comments.map((comment) => (
              <CommentNode key={comment.id} comment={comment} filePath={file.path} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
