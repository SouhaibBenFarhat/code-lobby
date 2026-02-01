/**
 * PostAsCommentModal - Modal to post AI message content as a PR comment.
 *
 * Pre-fills the markdown editor with the message content and allows editing before posting.
 * Uses useSelectedPR hook directly to get PR data (same approach as PostCommentForm).
 */

import { useAddPRComment, useSelectedPR } from '@data'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  MarkdownEditor
} from '@ui-kit'
import { Loader2, MessageSquarePlus, Send } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

export interface PostAsCommentModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal is closed */
  onOpenChange: (open: boolean) => void
  /** Initial content to pre-fill the editor with */
  initialContent: string
}

export function PostAsCommentModal({
  open,
  onOpenChange,
  initialContent
}: PostAsCommentModalProps): React.JSX.Element {
  // Get PR from global state (same approach as PostCommentForm)
  const { data: pr } = useSelectedPR()
  const addCommentMutation = useAddPRComment()
  const [comment, setComment] = useState(initialContent)
  const [showSuccess, setShowSuccess] = useState(false)

  // Reset comment when modal opens with new content
  useEffect(() => {
    if (open) {
      setComment(initialContent)
      setShowSuccess(false)
    }
  }, [open, initialContent])

  const handleSubmit = useCallback(() => {
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
          setShowSuccess(true)
          setTimeout(() => {
            onOpenChange(false)
            setShowSuccess(false)
          }, 1500)
        }
      }
    )
  }, [pr, comment, addCommentMutation, onOpenChange])

  const isSubmitting = addCommentMutation.isPending
  const error = addCommentMutation.error?.message || null
  const canSubmit = comment.trim().length > 0 && !isSubmitting && !!pr

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            Post as Comment
          </DialogTitle>
          <DialogDescription>
            Edit the content below and post it as a comment on the PR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Success message */}
          {showSuccess && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-md">
              <MessageSquarePlus className="w-4 h-4" />
              <span>Comment posted successfully!</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              <span>{error}</span>
            </div>
          )}

          {/* No PR selected warning */}
          {!pr && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 px-3 py-2 rounded-md">
              <span>No PR selected. Please select a PR to post comments.</span>
            </div>
          )}

          <MarkdownEditor
            value={comment}
            onChange={setComment}
            placeholder="Edit your comment..."
            height={250}
            disabled={isSubmitting || !pr}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
