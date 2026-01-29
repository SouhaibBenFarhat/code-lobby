/**
 * ReviewPreviewModal - Preview and submit Claude-generated PR reviews
 *
 * Features:
 * - Sticky sidebar with file navigation and comment counts
 * - Inline comment editing (edit and delete)
 * - Scroll progress indicators
 * - File tree with collapsible sections
 * - Inline diff view with comments positioned at the correct lines
 * - Editable summary
 * - Verdict selection (Approve, Request Changes, Comment)
 */

import type { PRFile, ReviewCommentInput } from '@data'
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DiffComment,
  DiffViewer,
  MarkdownEditor,
  ScrollArea
} from '@ui-kit'
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  // Refs for scroll tracking
  const contentRef = useRef<HTMLDivElement>(null)
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const [activeFileInView, setActiveFileInView] = useState<string | null>(null)

  // Reset state when modal opens with new review
  useEffect(() => {
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

  // Check if there's more content to scroll
  useEffect(() => {
    const checkScroll = () => {
      if (contentRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = contentRef.current
        setShowScrollIndicator(
          scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 50
        )
      }
    }

    checkScroll()
    const el = contentRef.current
    el?.addEventListener('scroll', checkScroll)
    return () => el?.removeEventListener('scroll', checkScroll)
  }, [])

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

  // Set first file as active initially
  useEffect(() => {
    if (filesWithComments.length > 0 && !activeFileInView) {
      setActiveFileInView(filesWithComments[0].file)
    }
  }, [filesWithComments, activeFileInView])

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

  // Update a comment's body
  const updateComment = useCallback((commentId: string, newBody: string) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: newBody } : c)))
  }, [])

  // Scroll to file
  const scrollToFile = useCallback((file: string) => {
    const element = document.getElementById(`file-${file.replace(/[^a-zA-Z0-9]/g, '-')}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveFileInView(file)
    // Expand if collapsed
    setExpandedFiles((prev) => new Set([...prev, file]))
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

  // Convert ReviewComment[] to DiffComment[] for DiffViewer
  const convertToDiffComments = useCallback((reviewComments: ReviewComment[]): DiffComment[] => {
    return reviewComments.map((c) => ({
      id: c.id,
      line: c.line,
      content: c.body
    }))
  }, [])

  // Custom render function for comments in diff view
  const renderDiffComment = useCallback(
    (comment: DiffComment) => (
      <InlineComment
        id={comment.id}
        body={String(comment.content || '')}
        onChange={(newBody) => updateComment(comment.id, newBody)}
        onDelete={() => deleteComment(comment.id)}
      />
    ),
    [updateComment, deleteComment]
  )

  if (!review) {
    return null
  }

  const _totalComments = comments.length
  const totalFiles = filesWithComments.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-border">
          <DialogTitle>Review Preview</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {repoFullName} · {prTitle}
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Sticky Sidebar - File Navigation */}
          {totalFiles > 0 && (
            <div className="w-56 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col">
              <div className="p-3 border-b border-border">
                <div className="text-xs font-medium text-muted-foreground">
                  Files ({totalFiles})
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filesWithComments.map((fileData) => (
                    <button
                      key={fileData.file}
                      type="button"
                      onClick={() => scrollToFile(fileData.file)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors',
                        'hover:bg-muted',
                        activeFileInView === fileData.file && 'bg-primary/10 text-primary'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3 h-3 flex-shrink-0" />
                        <span className="flex-1 truncate font-mono">
                          {fileData.file.split('/').pop()}
                        </span>
                        <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">
                          {fileData.comments.length}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5 pl-5">
                        {fileData.file.includes('/')
                          ? fileData.file.substring(0, fileData.file.lastIndexOf('/'))
                          : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Summary */}
              <div className="space-y-2">
                <label htmlFor="review-summary" className="text-sm font-medium">
                  Review Summary
                </label>
                <MarkdownEditor
                  value={summary}
                  onChange={setSummary}
                  placeholder="Enter your review summary..."
                  height={120}
                  id="review-summary"
                  data-testid="review-summary-editor"
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
                      <div
                        key={fileData.file}
                        id={`file-${fileData.file.replace(/[^a-zA-Z0-9]/g, '-')}`}
                        className="border-b border-border last:border-b-0"
                      >
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

                        {/* File Content with Comments - now using @ui-kit DiffViewer */}
                        {expandedFiles.has(fileData.file) && (
                          <div className="bg-background">
                            {fileData.patch ? (
                              <DiffViewer
                                patch={fileData.patch}
                                fileName={fileData.file}
                                comments={convertToDiffComments(fileData.comments)}
                                renderComment={renderDiffComment}
                              />
                            ) : (
                              <div className="p-3 space-y-2">
                                {fileData.comments.map((comment) => (
                                  <CommentCard
                                    key={comment.id}
                                    comment={comment}
                                    onChange={(newBody) => updateComment(comment.id, newBody)}
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

            {/* Scroll indicator */}
            {showScrollIndicator && (
              <div className="flex-shrink-0 px-6 py-2 bg-gradient-to-t from-background to-transparent text-center">
                <span className="text-xs text-muted-foreground animate-pulse">
                  ↓ Scroll for more comments
                </span>
              </div>
            )}
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
// INLINE COMMENT (used with DiffViewer renderComment)
// ═══════════════════════════════════════════════════════════════════════════

interface InlineCommentProps {
  id: string
  body: string
  onChange: (value: string) => void
  onDelete: () => void
}

function InlineComment({ body, onChange, onDelete }: InlineCommentProps): React.JSX.Element {
  // Calculate height: ~22px per line, min 60, max 250
  const lines = Math.max(body.split('\n').length, Math.ceil(body.length / 50))
  const height = Math.min(Math.max(lines * 22 + 50, 60), 250)
  // Key based on height bucket to force re-mount when size changes significantly
  const heightBucket = Math.floor(height / 30)

  return (
    <div className="mx-3 my-2">
      <MarkdownEditor
        key={`editor-${heightBucket}`}
        value={body}
        onChange={onChange}
        height={height}
        data-testid="edit-comment-editor"
      />
      <div className="flex justify-end mt-1">
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
  onChange: (value: string) => void
  onDelete: () => void
}

function CommentCard({ comment, onChange, onDelete }: CommentCardProps): React.JSX.Element {
  // Calculate height: ~22px per line, min 60, max 250
  const lines = Math.max(comment.body.split('\n').length, Math.ceil(comment.body.length / 50))
  const height = Math.min(Math.max(lines * 22 + 50, 60), 250)
  // Key based on height bucket to force re-mount when size changes significantly
  const heightBucket = Math.floor(height / 30)

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Line {comment.line}</div>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
          title="Remove this comment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <MarkdownEditor
        key={`editor-${heightBucket}`}
        value={comment.body}
        onChange={onChange}
        height={height}
        data-testid="edit-comment-editor"
      />
    </div>
  )
}
