/**
 * ReviewTree - Timeline display for PR reviews
 *
 * Displays reviews as a card-based timeline (like CommentItem):
 * - Vertical timeline line with start/end markers
 * - Each review is a card with timeline dot and connector
 * - Expandable to show inline comments with diffs
 */

import { cn } from '@ui-kit'
import { CheckCircle2, FileSearch, MessageSquare, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import type { ReviewerFeedback } from '../types'
import { ReviewerNode } from './ReviewerNode'
import type { FileComments, ReviewerData } from './types'

export interface ReviewTreeProps {
  /** Raw reviewer feedback data */
  reviewers: ReviewerFeedback[]
  /** Optional className */
  className?: string
}

/**
 * Transform ReviewerFeedback into ReviewerData with files grouped
 */
function transformToReviewerData(feedback: ReviewerFeedback): ReviewerData {
  // Group comments by file path
  const fileMap = new Map<string, FileComments>()

  for (const comment of feedback.inlineComments) {
    const existing = fileMap.get(comment.path)
    if (existing) {
      existing.comments.push(comment)
      if (comment.isResolved) {
        existing.resolvedCount++
      } else {
        existing.unresolvedCount++
      }
    } else {
      const fileName = comment.path.split('/').pop() || comment.path
      fileMap.set(comment.path, {
        path: comment.path,
        fileName,
        comments: [comment],
        unresolvedCount: comment.isResolved ? 0 : 1,
        resolvedCount: comment.isResolved ? 1 : 0
      })
    }
  }

  // Sort comments within each file by line number
  for (const file of fileMap.values()) {
    file.comments.sort((a, b) => {
      const byLine = (a.line || 0) - (b.line || 0)
      if (byLine !== 0) return byLine

      // Tie-breakers for stability (GitHub API order may change when resolving threads)
      const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (byCreatedAt !== 0) return byCreatedAt

      return a.id.localeCompare(b.id)
    })
  }

  // Convert to array and sort files stably.
  //
  // Note: We intentionally do NOT sort by unresolved/resolved counts here.
  // Resolving a thread changes those counts and would otherwise reorder the list,
  // which feels jarring in the review UI.
  const files = Array.from(fileMap.values()).sort((a, b) => {
    const byPath = a.path.localeCompare(b.path)
    if (byPath !== 0) return byPath

    // Tie-breaker: earliest line number in the file (stable across resolve toggles)
    const aFirstLine = a.comments[0]?.line ?? 0
    const bFirstLine = b.comments[0]?.line ?? 0
    return aFirstLine - bFirstLine
  })

  const totalComments = feedback.inlineComments.length
  const totalUnresolved = feedback.inlineComments.filter((c) => !c.isResolved).length
  const totalResolved = feedback.inlineComments.filter((c) => c.isResolved).length

  return {
    login: feedback.login,
    avatar_url: feedback.avatar_url,
    isBot: feedback.isBot,
    reviewState: feedback.reviewState,
    reviewBody: feedback.reviewBody,
    reviewDate: feedback.reviewDate,
    files,
    totalComments,
    totalUnresolved,
    totalResolved
  }
}

export function ReviewTree({ reviewers, className }: ReviewTreeProps): React.JSX.Element {
  // Transform data for tree display
  const reviewerData = useMemo(() => reviewers.map(transformToReviewerData), [reviewers])

  // Get timeline dot styling based on review state
  const getTimelineDotClasses = (reviewState: string | undefined) => {
    switch (reviewState) {
      case 'approved':
        return 'border-success'
      case 'changes_requested':
        return 'border-destructive'
      default:
        return 'border-primary'
    }
  }

  // Get connector line color based on review state
  const getConnectorColor = (reviewState: string | undefined) => {
    switch (reviewState) {
      case 'approved':
        return 'bg-success-subtle'
      case 'changes_requested':
        return 'bg-destructive-subtle'
      default:
        return 'bg-info-subtle'
    }
  }

  // Get timeline icon based on review state
  const getTimelineIcon = (reviewState: string | undefined) => {
    switch (reviewState) {
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />
      case 'changes_requested':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-primary" />
    }
  }

  if (reviewerData.length === 0) {
    return (
      <div className={cn('text-center py-6 text-sm text-muted-foreground', className)}>
        <FileSearch className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No reviews yet
      </div>
    )
  }

  return (
    <div className={cn('relative ml-2', className)}>
      {/* Timeline line */}
      <div className="absolute left-[15px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-primary/50 via-primary/30 to-primary/50 rounded-full" />
      {/* Start marker */}
      <div className="absolute left-[11px] top-0 w-[11px] h-[11px] rounded-full bg-info-subtle border-2 border-primary" />

      <div className="space-y-0 pt-4">
        {reviewerData.map((reviewer) => (
          <div key={reviewer.login} className="relative pl-12 pb-5 group">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute left-[4px] top-3 w-[26px] h-[26px] rounded-full border-[3px] bg-background flex items-center justify-center shadow-sm transition-transform group-hover:scale-110',
                getTimelineDotClasses(reviewer.reviewState ?? undefined)
              )}
            >
              {getTimelineIcon(reviewer.reviewState ?? undefined)}
            </div>

            {/* Connector line from dot to card */}
            <div
              className={cn(
                'absolute left-[30px] top-[22px] w-[18px] h-[2px]',
                getConnectorColor(reviewer.reviewState ?? undefined)
              )}
            />

            <ReviewerNode reviewer={reviewer} defaultExpanded={reviewerData.length <= 2} />
          </div>
        ))}
      </div>

      {/* End marker */}
      <div className="absolute left-[11px] bottom-0 w-[11px] h-[11px] rounded-full bg-info-subtle border-2 border-primary" />
    </div>
  )
}
