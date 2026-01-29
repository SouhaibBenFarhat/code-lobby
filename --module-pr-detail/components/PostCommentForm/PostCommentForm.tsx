/**
 * PostCommentForm - Form to post comments on a PR.
 *
 * Uses TanStack mutations for posting comments.
 * Features a GitHub-style markdown editor with preview.
 */

import { useAddPRComment } from '@data'
import { Button, cn, MarkdownEditor, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Loader2, MessageSquarePlus, Send, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useSelectedPR } from '../../hooks'

export interface PostCommentFormProps {
  /** Optional class name for styling */
  className?: string
  /** Callback fired after successful comment submission */
  onCommentPosted?: () => void
}

export function PostCommentForm({
  className,
  onCommentPosted
}: PostCommentFormProps): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const addCommentMutation = useAddPRComment()
  const [comment, setComment] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()

      if (!pr || !comment.trim()) return

      const repoFullName = `${pr.base.repo.owner.login}/${pr.base.repo.name}`

      addCommentMutation.mutate(
        {
          prNodeId: pr.id,
          body: comment.trim(),
          repoFullName,
          prNumber: pr.number
        },
        {
          onSuccess: () => {
            setComment('')
            setIsExpanded(false)
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2000)
            onCommentPosted?.()
          }
        }
      )
    },
    [pr, comment, addCommentMutation, onCommentPosted]
  )

  const handleCancel = useCallback(() => {
    setComment('')
    setIsExpanded(false)
  }, [])

  // Handle keyboard shortcuts when expanded
  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Submit on Cmd/Ctrl + Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (comment.trim()) {
          handleSubmit()
        }
      }
      // Cancel on Escape
      if (e.key === 'Escape') {
        handleCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, comment, handleSubmit, handleCancel])

  const isSubmitting = addCommentMutation.isPending
  const error = addCommentMutation.error?.message || null
  const canSubmit = comment.trim().length > 0 && !isSubmitting

  // Don't render if no PR is selected
  if (!pr) return null

  return (
    <div className={cn('space-y-2', className)}>
      {/* Success message */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-xs text-success animate-in fade-in slide-in-from-top-1 duration-200">
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Comment posted successfully!</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          <X className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {!isExpanded ? (
          /* Collapsed state - single line input look */
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2',
              'text-sm text-muted-foreground',
              'bg-muted/50 hover:bg-muted/70',
              'border border-border rounded-md',
              'transition-colors cursor-text text-left'
            )}
          >
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            <span>Add a comment...</span>
          </button>
        ) : (
          /* Expanded state - full markdown editor */
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <MarkdownEditor
              value={comment}
              onChange={setComment}
              placeholder="Leave a comment..."
              height={150}
              disabled={isSubmitting}
              data-testid="post-comment-editor"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
                  ? '⌘'
                  : 'Ctrl'}
                +Enter to submit, Esc to cancel
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      disabled={!canSubmit}
                      className={cn(
                        'h-7 px-3 gap-1.5 font-medium text-xs',
                        canSubmit && 'bg-primary hover:bg-primary/90'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Comment</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {canSubmit ? (
                      <p>Post comment to PR</p>
                    ) : (
                      <p className="text-muted-foreground">Enter a comment to submit</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
