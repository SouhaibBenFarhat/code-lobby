/**
 * ApproveButton - PR approval button with status feedback.
 */

import type { PullRequest } from '@codelobby/shared-store'
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { Check, CheckCheck, Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

export interface ApproveButtonProps {
  pr: PullRequest
  currentUser: string | null
  onApproveComplete?: () => void
}

export function ApproveButton({
  pr,
  currentUser,
  onApproveComplete
}: ApproveButtonProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const reviewDecision = pr.reviewDecision
  const isOwnPR = currentUser === pr.user.login
  const isAlreadyApproved = reviewDecision === 'APPROVED'
  const isDraft = pr.draft

  // Check if user has already approved (from reviews array)
  const userHasApproved = useMemo(() => {
    if (!currentUser || !pr.reviews) return false
    return pr.reviews.some(
      (review) => review.author.login === currentUser && review.state === 'approved'
    )
  }, [currentUser, pr.reviews])

  // Determine button state
  const getButtonState = useMemo(() => {
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
  }, [isDraft, isOwnPR, userHasApproved, isAlreadyApproved])

  const handleApprove = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await window.electron.submitPRReview(pr.id, 'APPROVE')

      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        onApproveComplete?.()
      } else {
        setError(result.error || 'Failed to approve PR')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [pr.id, onApproveComplete])

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
