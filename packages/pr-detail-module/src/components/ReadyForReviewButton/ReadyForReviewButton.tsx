/**
 * ReadyForReviewButton - Marks a draft PR as ready for review.
 *
 * Uses TanStack mutations for marking ready.
 */

import { useMarkPRReady } from '@codelobby/data'
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { Eye, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSelectedPR } from '../../hooks'

/** Props for ReadyForReviewButton - no props needed, subscribes to store */
export type ReadyForReviewButtonProps = Record<string, never>

export function ReadyForReviewButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const markReadyMutation = useMarkPRReady()
  const [showSuccess, setShowSuccess] = useState(false)

  // Derive state from PR - must be computed unconditionally
  const isDraft = pr?.draft ?? false
  const isOpen = pr?.state === 'OPEN'

  // Only show for draft PRs that are open
  const shouldShow = isDraft && isOpen

  // Determine button state - useMemo must be called unconditionally
  const getButtonState = useMemo(() => {
    if (!pr) {
      return {
        canMarkReady: false,
        reason: 'No PR selected'
      }
    }

    if (!isOpen) {
      return {
        canMarkReady: false,
        reason: 'PR must be open to mark ready for review'
      }
    }

    if (!isDraft) {
      return {
        canMarkReady: false,
        reason: 'PR is already ready for review'
      }
    }

    return {
      canMarkReady: true,
      reason: 'Mark this PR ready for review'
    }
  }, [pr, isOpen, isDraft])

  const handleMarkReady = () => {
    if (!pr) return

    markReadyMutation.mutate(pr.id, {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    })
  }

  const isSubmitting = markReadyMutation.isPending
  const error = markReadyMutation.error?.message || null

  // Early returns AFTER all hooks
  if (!pr) return null
  if (!shouldShow) return null

  const { canMarkReady, reason } = getButtonState

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={showSuccess ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-7 px-3 gap-1.5 font-medium',
            canMarkReady && 'hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/50',
            showSuccess && 'bg-green-600 hover:bg-green-600 text-white'
          )}
          onClick={handleMarkReady}
          disabled={!canMarkReady || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span className="text-xs">
            {isSubmitting ? 'Marking...' : showSuccess ? 'Ready!' : 'Ready for Review'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {canMarkReady ? (
          <p className="font-medium">Mark Ready for Review</p>
        ) : (
          <>
            <p className="font-medium">Cannot Mark Ready</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
