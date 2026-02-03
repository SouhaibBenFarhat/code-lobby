/**
 * ReviewTree - Tree-based display for PR reviews
 *
 * Displays reviews in a hierarchical structure:
 * - Reviewer (root)
 *   - Review Summary
 *   - Files
 *     - Comments (with diff hunks)
 *
 * Benefits over flat list:
 * - Progressive disclosure reduces visual clutter
 * - File grouping provides better context
 * - Collapsible sections let users focus on what matters
 */

import { Col, cn, Row, TreeView } from '@ui-kit'
import { CheckCircle2, FileSearch, Users, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import type { ReviewerFeedback } from '../types'
import { ReviewerNode } from './ReviewerNode'
import type { FileComments, ReviewerData } from './types'

export interface ReviewTreeProps {
  /** Raw reviewer feedback data */
  reviewers: ReviewerFeedback[]
  /** PR URL for "View in GitHub" links */
  prUrl: string
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
    file.comments.sort((a, b) => (a.line || 0) - (b.line || 0))
  }

  // Convert to array and sort files by unresolved count (most unresolved first)
  const files = Array.from(fileMap.values()).sort(
    (a, b) => b.unresolvedCount - a.unresolvedCount || a.path.localeCompare(b.path)
  )

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

export function ReviewTree({ reviewers, prUrl, className }: ReviewTreeProps): React.JSX.Element {
  // Transform data for tree display
  const reviewerData = useMemo(() => reviewers.map(transformToReviewerData), [reviewers])

  // Calculate summary stats
  const stats = useMemo(() => {
    const approved = reviewerData.filter((r) => r.reviewState === 'approved').length
    const changesRequested = reviewerData.filter(
      (r) => r.reviewState === 'changes_requested'
    ).length
    const totalUnresolved = reviewerData.reduce((sum, r) => sum + r.totalUnresolved, 0)
    const totalComments = reviewerData.reduce((sum, r) => sum + r.totalComments, 0)
    return { approved, changesRequested, totalUnresolved, totalComments }
  }, [reviewerData])

  if (reviewerData.length === 0) {
    return (
      <Row
        gutter="sm"
        justify="center"
        align="center"
        className={cn('flex-col py-6 text-sm text-muted-foreground', className)}
      >
        <Col span="auto">
          <FileSearch className="w-5 h-5 opacity-50" />
        </Col>
        <Col span="auto">No reviews yet</Col>
      </Row>
    )
  }

  return (
    <div className={className}>
      {/* Summary header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>
            {reviewerData.length} reviewer{reviewerData.length !== 1 ? 's' : ''}
          </span>
          {stats.totalComments > 0 && (
            <span className="text-muted-foreground/60">
              • {stats.totalComments} comment{stats.totalComments !== 1 ? 's' : ''}
            </span>
          )}
          {stats.totalUnresolved > 0 && (
            <span className="text-warning">• {stats.totalUnresolved} unresolved</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {stats.approved > 0 && (
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {stats.approved}
            </span>
          )}
          {stats.changesRequested > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {stats.changesRequested}
            </span>
          )}
        </div>
      </div>

      {/* Reviewer tree nodes */}
      <div className="space-y-3">
        {reviewerData.map((reviewer) => (
          <TreeView key={reviewer.login}>
            <ReviewerNode
              reviewer={reviewer}
              prUrl={prUrl}
              defaultExpanded={reviewerData.length <= 3}
            />
          </TreeView>
        ))}
      </div>
    </div>
  )
}
