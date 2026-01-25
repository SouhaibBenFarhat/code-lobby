/**
 * ApproveButton - PR approval button with status feedback.
 *
 * Uses TanStack mutations for approval.
 */

import { useSubmitPRReview } from '@codelobby/data'
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { Check, CheckCheck, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCurrentUser, useSelectedPR } from '../../hooks'

// Props interface kept for API consistency (no props needed - subscribes to store)
export type ApproveButtonProps = Record<string, never>

export function ApproveButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const currentUser = useCurrentUser()
  const reviewMutation = useSubmitPRReview()
  const [showSuccess, setShowSuccess] = useState(false)

  // Derive state unconditionally (before hooks that depend on them)
  const reviewDecision = pr?.reviewDecision
  const isOwnPR = currentUser === pr?.user.login
  const isAlreadyApproved = reviewDecision === 'APPROVED'
  const isDraft = pr?.draft
  const reviews = pr?.reviews

  // Check if user has already approved (from reviews array) - useMemo must be called unconditionally
  const userHasApproved = useMemo(() => {
    if (!currentUser || !reviews) return false
    return reviews.some(
      (review) => review.author.login === currentUser && review.state === 'approved'
    )
  }, [currentUser, reviews])

  // Determine button state - useMemo must be called unconditionally
  const getButtonState = useMemo(() => {
    if (!pr) {
      return {
        canApprove: false,
        reason: 'No PR selected',
        variant: 'secondary' as const
      }
    }

    if (isDraft) {
      return {
        canApprove: false,
        reason: 'Cannot approve draft PR',
        variant: 'secondary' as const
      }
    }

    if (isOwnPR) {
      return {
        canApprove: false,
        reason: 'Cannot approve your own PR',
        variant: 'secondary' as const
      }
    }

    if (userHasApproved || isAlreadyApproved) {
      return {
        canApprove: false,
        reason: 'Already approved',
        variant: 'outline' as const,
        isApproved: true
      }
    }

    return {
      canApprove: true,
      reason: 'Approve this PR',
      variant: 'outline' as const
    }
  }, [pr, isDraft, isOwnPR, userHasApproved, isAlreadyApproved])

  const handleApprove = () => {
    if (!pr) return

    reviewMutation.mutate(
      { prNodeId: pr.id, event: 'APPROVE' },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 2000)
        }
      }
    )
  }

  const isSubmitting = reviewMutation.isPending
  const error = reviewMutation.error?.message || null

  // Early return AFTER all hooks
  if (!pr) return null

  const { canApprove, reason, variant, isApproved } = getButtonState

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={canApprove || isApproved || showSuccess ? 'default' : variant}
          size="sm"
          className={cn(
            'h-7 px-3 gap-1.5 font-medium',
            canApprove && 'bg-green-600 hover:bg-green-700 text-white',
            (isApproved || showSuccess) && 'bg-green-600 hover:bg-green-600 text-white'
          )}
          onClick={handleApprove}
          disabled={!canApprove || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isApproved || showSuccess ? (
            <CheckCheck className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span className="text-xs">{isSubmitting ? 'Approving...' : 'Approve'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {canApprove ? (
          <p className="font-medium">Approve Pull Request</p>
        ) : (
          <>
            <p className="font-medium">Cannot Approve</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
