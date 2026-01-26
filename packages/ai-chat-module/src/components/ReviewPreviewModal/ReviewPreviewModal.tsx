/**
 * ReviewPreviewModal - Preview and submit Claude-generated PR reviews
 *
 * Features:
 * - File tree with collapsible sections (files with comments expanded by default)
 * - Inline diff view with comments positioned at the correct lines
 * - Editable summary
 * - Verdict selection (Approve, Request Changes, Comment)
 * - Delete comments before submission
 */

import type { PRFile, ReviewCommentInput } from '@codelobby/data'
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@codelobby/ui-kit'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  FileCode,
  Loader2,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import type { ReviewComment, ReviewData, ReviewVerdict } from '../../types'
import { formatVerdict, getVerdictColor } from '../../utils/review-parser'

export interface ReviewPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  review: ReviewData | null
  prFiles: PRFile[]
  prTitle: string
  repoFullName: string
  onSubmit: (
    summary: string,
    verdict: ReviewVerdict,
    comments: ReviewCommentInput[]
  ) => Promise<{ success: boolean }>
  isSubmitting?: boolean
}

interface FileWithComments {
  file: string
  patch?: string
  comments: ReviewComment[]
}

export function ReviewPreviewModal({
  isOpen,
  onClose,
  review,
  prFiles,
  prTitle,
  repoFullName,
  onSubmit,
  isSubmitting = false
}: ReviewPreviewModalProps): React.JSX.Element | null {
  // Local state for editing
  const [summary, setSummary] = useState(review?.summary || '')
  const [verdict, setVerdict] = useState<ReviewVerdict>(review?.verdict || 'comment')
  const [comments, setComments] = useState<ReviewComment[]>(review?.comments || [])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset state when modal opens with new review
  React.useEffect(() => {
    if (isOpen && review) {
      setSummary(review.summary)
      setVerdict(review.verdict)
      setComments(review.comments)
      setSubmitError(null)
      // Expand files that have comments by default
      const filesWithComments = new Set(review.comments.map((c) => c.file))
      setExpandedFiles(filesWithComments)
    }
  }, [isOpen, review])

  // Group comments by file and merge with PR file data
  const filesWithComments = useMemo((): FileWithComments[] => {
    const fileMap = new Map<string, FileWithComments>()

    // First, add all files from the review comments
    for (const comment of comments) {
      if (!fileMap.has(comment.file)) {
        const prFile = prFiles.find((f) => f.path === comment.file)
        fileMap.set(comment.file, {
          file: comment.file,
          patch: prFile?.patch,
          comments: []
        })
      }
      fileMap.get(comment.file)?.comments.push(comment)
    }

    // Sort comments by line number within each file
    for (const fileData of fileMap.values()) {
      fileData.comments.sort((a, b) => a.line - b.line)
    }

    return Array.from(fileMap.values()).sort((a, b) => a.file.localeCompare(b.file))
  }, [comments, prFiles])

  // Toggle file expansion
  const toggleFile = useCallback((file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(file)) {
        next.delete(file)
      } else {
        next.add(file)
      }
      return next
    })
  }, [])

  // Delete a comment
  const deleteComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setSubmitError(null)

    const reviewComments: ReviewCommentInput[] = comments.map((c) => ({
      path: c.file,
      line: c.line,
      body: c.body
    }))

    try {
      const result = await onSubmit(summary, verdict, reviewComments)
      if (result.success) {
        onClose()
      } else {
        setSubmitError('Failed to submit review. Please try again.')
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }, [summary, verdict, comments, onSubmit, onClose])

  // Verdict button styles
  const getVerdictButtonClass = (v: ReviewVerdict) =>
    cn(
      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all',
      verdict === v
        ? v === 'approve'
          ? 'border-green-500 bg-green-500/10 text-green-500'
          : v === 'request_changes'
            ? 'border-orange-500 bg-orange-500/10 text-orange-500'
            : 'border-blue-500 bg-blue-500/10 text-blue-500'
        : 'border-border bg-background hover:bg-muted text-muted-foreground'
    )

  if (!review) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            Review Preview
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {repoFullName} · {prTitle}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Summary */}
          <div className="space-y-2">
            <label htmlFor="review-summary" className="text-sm font-medium">
              Review Summary
            </label>
            <textarea
              id="review-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter your review summary..."
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Verdict Selection */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Verdict</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVerdict('approve')}
                className={getVerdictButtonClass('approve')}
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdict('request_changes')}
                className={getVerdictButtonClass('request_changes')}
              >
                <X className="w-4 h-4" />
                <span>Request Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdict('comment')}
                className={getVerdictButtonClass('comment')}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>
          </div>

          {/* Files with Comments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Review Comments ({comments.length})</span>
              {comments.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No inline comments - only summary will be posted
                </span>
              )}
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {filesWithComments.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No inline comments to display
                </div>
              ) : (
                filesWithComments.map((fileData) => (
                  <div key={fileData.file} className="border-b border-border last:border-b-0">
                    {/* File Header */}
                    <button
                      type="button"
                      onClick={() => toggleFile(fileData.file)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      {expandedFiles.has(fileData.file) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <FileCode className="w-4 h-4 text-blue-500" />
                      <span className="flex-1 font-mono text-sm truncate">{fileData.file}</span>
                      <span className="text-xs text-muted-foreground">
                        {fileData.comments.length} comment
                        {fileData.comments.length !== 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* File Content with Comments */}
                    {expandedFiles.has(fileData.file) && (
                      <div className="bg-background">
                        {fileData.patch ? (
                          <DiffWithComments
                            patch={fileData.patch}
                            comments={fileData.comments}
                            onDeleteComment={deleteComment}
                          />
                        ) : (
                          <div className="p-3 space-y-2">
                            {fileData.comments.map((comment) => (
                              <CommentCard
                                key={comment.id}
                                comment={comment}
                                onDelete={() => deleteComment(comment.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="flex-shrink-0 mx-6 mb-2 flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              <span className={getVerdictColor(verdict)}>{formatVerdict(verdict)}</span>
              {comments.length > 0 && (
                <span>
                  {' '}
                  with {comments.length} inline comment{comments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !summary.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DIFF WITH INLINE COMMENTS
// ═══════════════════════════════════════════════════════════════════════════

interface DiffWithCommentsProps {
  patch: string
  comments: ReviewComment[]
  onDeleteComment: (id: string) => void
}

function DiffWithComments({
  patch,
  comments,
  onDeleteComment
}: DiffWithCommentsProps): React.JSX.Element {
  // Parse diff lines and inject comments at the right positions
  const lines = patch.split('\n')

  // Build a map of line numbers to comments
  const commentsByLine = new Map<number, ReviewComment[]>()
  for (const comment of comments) {
    const existing = commentsByLine.get(comment.line) || []
    existing.push(comment)
    commentsByLine.set(comment.line, existing)
  }

  // Track line numbers from the diff header
  let currentLine = 0

  return (
    <div className="font-mono text-xs overflow-x-auto">
      {lines.map((line, idx) => {
        // Parse diff header for line numbers: @@ -a,b +c,d @@
        const headerMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
        if (headerMatch) {
          currentLine = parseInt(headerMatch[1], 10) - 1
        }

        // Determine line type and increment line number for non-removed lines
        const isAddition = line.startsWith('+') && !line.startsWith('+++')
        const isDeletion = line.startsWith('-') && !line.startsWith('---')
        const isHeader =
          line.startsWith('@@') ||
          line.startsWith('diff') ||
          line.startsWith('index') ||
          line.startsWith('---') ||
          line.startsWith('+++')

        if (!isDeletion && !isHeader) {
          currentLine++
        }

        const lineComments = commentsByLine.get(currentLine) || []

        // Use line number + hash of content for stable key
        const lineKey = `${currentLine}-${idx}`

        return (
          <React.Fragment key={lineKey}>
            <div
              className={cn(
                'px-3 py-0.5 border-l-2 whitespace-pre',
                isAddition && 'bg-green-500/10 border-green-500',
                isDeletion && 'bg-red-500/10 border-red-500',
                isHeader && 'bg-muted/50 border-transparent text-muted-foreground',
                !isAddition && !isDeletion && !isHeader && 'border-transparent'
              )}
            >
              <span className="text-muted-foreground/60 mr-3 select-none w-8 inline-block text-right">
                {!isHeader && !isDeletion ? currentLine : ''}
              </span>
              {line || ' '}
            </div>
            {lineComments.map((comment) => (
              <InlineComment
                key={comment.id}
                comment={comment}
                onDelete={() => onDeleteComment(comment.id)}
              />
            ))}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE COMMENT (in diff)
// ═══════════════════════════════════════════════════════════════════════════

interface InlineCommentProps {
  comment: ReviewComment
  onDelete: () => void
}

function InlineComment({ comment, onDelete }: InlineCommentProps): React.JSX.Element {
  return (
    <div className="mx-3 my-2 bg-blue-500/10 border border-blue-500/30 rounded-lg overflow-hidden">
      <div className="flex items-start gap-2 p-3">
        <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm font-sans whitespace-pre-wrap">{comment.body}</div>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
          title="Remove this comment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMENT CARD (when no diff available)
// ═══════════════════════════════════════════════════════════════════════════

interface CommentCardProps {
  comment: ReviewComment
  onDelete: () => void
}

function CommentCard({ comment, onDelete }: CommentCardProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
      <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-1">Line {comment.line}</div>
        <div className="text-sm whitespace-pre-wrap">{comment.body}</div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
        title="Remove this comment"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
