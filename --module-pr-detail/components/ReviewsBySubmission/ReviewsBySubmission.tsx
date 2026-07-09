/**
 * ReviewsBySubmission - Render review submissions with their associated inline comments.
 *
 * Option A: separate inline review comments by the review submission they belong to.
 * This avoids mixing comments across multiple reviews.
 */

import type { PRReview, ReviewThread } from '@data'
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
import { ChevronDown, ChevronRight, FileSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CommentNode } from '../ReviewTree/CommentNode'

export interface ReviewsBySubmissionProps {
  reviews: PRReview[]
  reviewThreads: ReviewThread[]
  className?: string
}

type InlineItem = {
  commentId: string
  threadId: string
  body: string
  created_at: string
  path: string
  line: number | null
  diffHunk?: string
  isResolved: boolean
}

function ReviewStateBadge({ state }: { state: string }): React.JSX.Element | null {
  if (state === 'approved') {
    return (
      <Badge
        variant="default"
        className="bg-success-subtle text-success text-[9px] h-[18px] px-1.5"
      >
        Approved
      </Badge>
    )
  }
  if (state === 'changes_requested') {
    return (
      <Badge
        variant="default"
        className="bg-destructive-subtle text-destructive text-[9px] h-[18px] px-1.5"
      >
        Changes
      </Badge>
    )
  }
  if (state === 'commented') {
    return (
      <Badge variant="secondary" className="text-[9px] h-[18px] px-1.5">
        Commented
      </Badge>
    )
  }
  return null
}

export function ReviewsBySubmission({
  reviews,
  reviewThreads,
  className
}: ReviewsBySubmissionProps): React.JSX.Element {
  // Flatten thread comments into "inline items" that keep thread metadata.
  const inlineItems = useMemo<InlineItem[]>(() => {
    const items: InlineItem[] = []
    for (const thread of reviewThreads) {
      for (const c of thread.comments) {
        items.push({
          commentId: c.id,
          threadId: thread.id,
          body: c.body,
          created_at: c.created_at,
          path: thread.path,
          line: thread.line,
          diffHunk: c.diffHunk,
          isResolved: thread.isResolved
        })
      }
    }
    // Oldest → newest inside a review, like GitHub thread flow
    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return items
  }, [reviewThreads])

  const inlineByReviewId = useMemo(() => {
    const map = new Map<string, InlineItem[]>()
    const unattached: InlineItem[] = []

    for (const thread of reviewThreads) {
      for (const c of thread.comments) {
        const item: InlineItem = {
          commentId: c.id,
          threadId: thread.id,
          body: c.body,
          created_at: c.created_at,
          path: thread.path,
          line: thread.line,
          diffHunk: c.diffHunk,
          isResolved: thread.isResolved
        }

        const reviewId = c.reviewId ?? null
        if (!reviewId) {
          unattached.push(item)
        } else {
          const list = map.get(reviewId) ?? []
          list.push(item)
          map.set(reviewId, list)
        }
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
    unattached.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return { map, unattached }
  }, [reviewThreads])

  const sortedReviews = useMemo(() => {
    return [...reviews].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [reviews])

  if (sortedReviews.length === 0 && inlineItems.length === 0) {
    return (
      <div className={cn('text-center py-6 text-sm text-muted-foreground', className)}>
        <FileSearch className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No reviews yet
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {sortedReviews.map((review) => (
        <ReviewSubmissionCard
          key={review.id}
          review={review}
          inlineItems={inlineByReviewId.map.get(review.id) ?? []}
        />
      ))}

      {inlineByReviewId.unattached.length > 0 && (
        <div className="rounded-lg border border-border-muted bg-surface">
          <div className="px-3 py-2 border-b border-border-muted flex items-center gap-2">
            <span className="text-xs font-semibold">Unattached thread comments</span>
            <span className="text-[10px] text-muted-foreground">
              {inlineByReviewId.unattached.length}
            </span>
          </div>
          <div className="p-3 space-y-3 bg-background">
            {inlineByReviewId.unattached.map((item) => (
              <CommentNode
                key={item.commentId}
                filePath={item.path}
                comment={{
                  id: item.commentId,
                  threadId: item.threadId,
                  body: item.body,
                  created_at: item.created_at,
                  path: item.path,
                  line: item.line,
                  diffHunk: item.diffHunk,
                  isResolved: item.isResolved
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewSubmissionCard({
  review,
  inlineItems
}: {
  review: PRReview
  inlineItems: InlineItem[]
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasInline = inlineItems.length > 0

  const state = (review.state || '').toLowerCase()

  return (
    <div className="rounded-lg overflow-hidden border border-border-muted bg-background">
      <div className="p-2.5 bg-surface border-b border-border-muted">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={review.author.avatar_url} alt={review.author.login} />
            <AvatarFallback className="text-[9px]">
              {review.author.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="text-xs font-medium truncate max-w-[160px]">{review.author.login}</span>
          <ReviewStateBadge state={state} />

          {hasInline && (
            <span className="text-[10px] text-muted-foreground">
              {inlineItems.length} thread comment(s)
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(review.created_at)}
            </span>
            {hasInline && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsExpanded((v) => !v)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span className="ml-1">{isExpanded ? 'Hide' : 'Show'} threads</span>
              </Button>
            )}
          </div>
        </div>

        {review.body && (
          <div className="mt-2 text-xs text-foreground-muted">
            <MarkdownContent content={review.body} />
          </div>
        )}
      </div>

      {isExpanded && hasInline && (
        <div className="p-3 space-y-3">
          {inlineItems.map((item) => (
            <CommentNode
              key={item.commentId}
              filePath={item.path}
              comment={{
                id: item.commentId,
                threadId: item.threadId,
                body: item.body,
                created_at: item.created_at,
                path: item.path,
                line: item.line,
                diffHunk: item.diffHunk,
                isResolved: item.isResolved
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
