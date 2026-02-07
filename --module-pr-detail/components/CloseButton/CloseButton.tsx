/**
 * CloseButton - PR close button with confirmation popover and optional comment.
 *
 * Uses TanStack mutations for closing.
 */

import { useClosePR } from '@data'
import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Loader2, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSelectedPR } from '../../hooks'

/** Props for CloseButton - no props needed, subscribes to store */
export type CloseButtonProps = Record<string, never>

export function CloseButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const closeMutation = useClosePR()
  const [showConfirm, setShowConfirm] = useState(false)
  const [comment, setComment] = useState('')

  // Derive state from PR - must be computed unconditionally
  const isClosed = pr?.state === 'CLOSED'
  const isMerged = pr?.state === 'MERGED'

  // Determine button state - useMemo must be called unconditionally
  const getButtonState = useMemo(() => {
    if (!pr) {
      return {
        canClose: false,
        reason: 'No PR selected',
        variant: 'secondary' as const
      }
    }

    if (isMerged) {
      return {
        canClose: false,
        reason: 'PR is already merged',
        variant: 'secondary' as const
      }
    }

    if (isClosed) {
      return {
        canClose: false,
        reason: 'PR is already closed',
        variant: 'secondary' as const,
        isClosed: true
      }
    }

    return {
      canClose: true,
      reason: 'Close this PR without merging',
      variant: 'outline' as const
    }
  }, [pr, isClosed, isMerged])

  const handleClose = () => {
    if (!pr) return

    closeMutation.mutate(
      { prNodeId: pr.id, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setShowConfirm(false)
          setComment('')
        }
      }
    )
  }

  const isSubmitting = closeMutation.isPending
  const error = closeMutation.error?.message || null

  // Reset comment when popover closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setShowConfirm(open)
      if (!open) {
        setComment('')
        closeMutation.reset() // Reset mutation state (including error)
      }
    },
    [closeMutation]
  )

  // Early return AFTER all hooks
  if (!pr) return null

  const { canClose, reason, variant, isClosed: isAlreadyClosed } = getButtonState

  // If can't close, show disabled button with tooltip
  if (!canClose) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn(
              'h-7 px-3 gap-1.5 font-medium',
              isAlreadyClosed && 'text-muted-foreground'
            )}
            disabled
          >
            <XCircle className="w-3.5 h-3.5" />
            <span className="text-xs">{isAlreadyClosed ? 'Closed' : 'Close'}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          <p className="font-medium">Cannot Close</p>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Show popover with confirmation and optional comment
  return (
    <Popover open={showConfirm} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 gap-1.5 font-medium hover:bg-destructive-subtle hover:text-destructive hover:border-destructive/50"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-xs">Close</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">Close Pull Request</p>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Close Pull Request?</h4>
            <p className="text-xs text-muted-foreground">
              This will close the PR without merging. You can reopen it later if needed.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="close-comment" className="text-xs font-medium text-muted-foreground">
              Closing comment (optional)
            </label>
            <textarea
              id="close-comment"
              placeholder="Add a comment explaining why this PR is being closed..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-2 bg-destructive-subtle border border-destructive-border rounded text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  Close PR
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
