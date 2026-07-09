/**
 * CommentNode - Displays a single inline comment with diff hunk
 *
 * Design:
 * - FileHeader with file path and line info
 * - Code context before the commented line
 * - The commented line (highlighted)
 * - Comment embedded right after the commented line
 * - Code context after the commented line
 */

import {
  useReplyToReviewComment,
  useResolveReviewThread,
  useSelectedPRId,
  useUnresolveReviewThread
} from '@data'
import {
  Button,
  type DiffComment,
  DiffViewer,
  FileHeader,
  formatRelativeTime,
  MarkdownContent,
  MarkdownEditor,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { CheckCheck, Circle, Loader2, MessageSquare, Send, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InlineComment } from './types'

export interface CommentNodeProps {
  comment: InlineComment
  /** File path for diff highlighting */
  filePath: string
}

/**
 * Find the last line number in a diff hunk.
 * GitHub structures diffHunks so the last line is where the comment applies.
 */
function findLastLineNumber(diffHunk: string | undefined): number | undefined {
  if (!diffHunk) return undefined

  const lines = diffHunk.split('\n')
  let newLineNum = 0
  let lastLineNum: number | undefined

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        newLineNum = Number.parseInt(match[1], 10)
      }
    } else if (line.startsWith('+') || line.startsWith(' ')) {
      // This line has the current newLineNum
      lastLineNum = newLineNum
      newLineNum++
    }
    // Deletions don't have a newLineNum
  }

  return lastLineNum
}

export function CommentNode({ comment, filePath }: CommentNodeProps): React.JSX.Element {
  const hasDiff = !!comment.diffHunk
  const { data: selectedPRId } = useSelectedPRId()

  // Mutations for resolve/unresolve
  const resolveThread = useResolveReviewThread()
  const unresolveThread = useUnresolveReviewThread()
  const isToggling = resolveThread.isPending || unresolveThread.isPending

  // Mutation for replying to the inline review comment
  const replyMutation = useReplyToReviewComment()
  const [replyBody, setReplyBody] = useState('')
  const [replySuccess, setReplySuccess] = useState(false)
  const replyEditorId = `review-reply-${comment.id}`

  const handleToggleResolved = () => {
    if (!selectedPRId || isToggling) return

    const params = {
      threadId: comment.threadId,
      repoFullName: selectedPRId.repoFullName,
      prNumber: selectedPRId.prNumber
    }

    if (comment.isResolved) {
      unresolveThread.mutate(params)
    } else {
      resolveThread.mutate(params)
    }
  }

  const isSubmittingReply = replyMutation.isPending
  const replyError = replyMutation.error?.message ?? null
  const canSubmitReply = replyBody.trim().length > 0 && !isSubmittingReply

  const handleCancelReply = useCallback(() => {
    setReplyBody('')
  }, [])

  const handleSubmitReply = useCallback(() => {
    if (!selectedPRId || !replyBody.trim() || isSubmittingReply) return

    replyMutation.mutate(
      {
        repoFullName: selectedPRId.repoFullName,
        prNumber: selectedPRId.prNumber,
        threadId: comment.threadId,
        body: replyBody.trim()
      },
      {
        onSuccess: () => {
          setReplyBody('')
          setReplySuccess(true)
          setTimeout(() => setReplySuccess(false), 2000)
        }
      }
    )
  }, [comment.threadId, isSubmittingReply, replyBody, replyMutation, selectedPRId])

  // Keyboard shortcuts when reply editor is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || active.id !== replyEditorId) return

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (replyBody.trim()) handleSubmitReply()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelReply()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCancelReply, handleSubmitReply, replyBody, replyEditorId])

  // Find the actual line number from the hunk (last line is where comment applies)
  const commentLineInHunk = useMemo(() => findLastLineNumber(comment.diffHunk), [comment.diffHunk])

  // Use the line from the hunk, or fall back to comment.line
  const effectiveLine = commentLineInHunk ?? comment.line

  // Build info: line number, resolved status, time (for file header)
  const infoContent = (
    <span className="flex items-center gap-2 text-[10px]">
      {comment.line && <span className="font-mono">Line {comment.line}</span>}
      {comment.isResolved && (
        <span className="flex items-center gap-1 text-success">
          <CheckCheck className="w-3 h-3" />
          Resolved
        </span>
      )}
      <span className="text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
    </span>
  )

  // Resolve/Unresolve button component for use in comment
  const resolveButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleResolved()
          }}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : comment.isResolved ? (
            <Circle className="w-3 h-3 mr-1" />
          ) : (
            <CheckCheck className="w-3 h-3 mr-1" />
          )}
          {comment.isResolved ? 'Unresolve' : 'Resolve'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {comment.isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
      </TooltipContent>
    </Tooltip>
  )

  const replyEditor = (
    <div className="mt-2 space-y-2">
      <MarkdownEditor
        value={replyBody}
        onChange={setReplyBody}
        placeholder="Write a reply..."
        height={120}
        disabled={isSubmittingReply}
        id={replyEditorId}
        data-testid="review-comment-reply-editor"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
          +Enter to reply, Esc to cancel
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation()
              handleCancelReply()
            }}
            disabled={isSubmittingReply}
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
          {resolveButton}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={(e) => {
              e.stopPropagation()
              handleSubmitReply()
            }}
            disabled={!canSubmitReply}
          >
            {isSubmittingReply ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Replying...
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                Reply
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  // Build inline comment for embedding in DiffViewer
  // Note: We can't use useMemo here because resolveButton changes with isToggling state
  const buildInlineComments = (): DiffComment[] => {
    if (!effectiveLine) return []
    return [
      {
        id: comment.id,
        line: effectiveLine,
        content: (
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-foreground flex-1 min-w-0 text-xs">
                <MarkdownContent content={comment.body} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-1 mt-1">
              <div className="flex items-center gap-2 min-h-5">
                {replySuccess && <span className="text-[10px] text-success">Reply posted</span>}
                {replyError && <span className="text-[10px] text-destructive">{replyError}</span>}
              </div>
            </div>
            {replyEditor}
          </div>
        )
      }
    ]
  }

  // Custom render for inline comment styling
  const renderComment = (diffComment: DiffComment) => (
    <div className="mx-2 my-1 px-3 py-2 rounded-md border border-border-muted bg-surface">
      {diffComment.content}
    </div>
  )

  return (
    <div className="rounded-md border border-border-muted overflow-hidden text-xs">
      {/* File header */}
      <FileHeader
        filePath={filePath}
        showChevron={false}
        interactive={false}
        className="py-1.5 border-b border-border-muted"
        info={infoContent}
      />

      {/* Code diff with embedded comment - show 10 lines of context around the comment */}
      {hasDiff ? (
        <DiffViewer
          patch={comment.diffHunk || null}
          fileName={filePath}
          className="text-[10px]"
          comments={buildInlineComments()}
          renderComment={renderComment}
          focusLine={effectiveLine ?? undefined}
          contextLines={10}
        />
      ) : (
        /* Fallback if no diff */
        <div className="px-3 py-2 bg-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-foreground flex-1 min-w-0 text-xs">
                <MarkdownContent content={comment.body} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-1 mt-1">
              <div className="flex items-center gap-2 min-h-5">
                {replySuccess && <span className="text-[10px] text-success">Reply posted</span>}
                {replyError && <span className="text-[10px] text-destructive">{replyError}</span>}
              </div>
            </div>
            {replyEditor}
          </div>
        </div>
      )}
    </div>
  )
}
