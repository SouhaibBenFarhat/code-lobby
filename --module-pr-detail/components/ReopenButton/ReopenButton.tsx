/**
 * ReopenButton - PR reopen button for closed PRs.
 *
 * Uses TanStack mutations for reopening.
 */

import { useReopenPR } from '@data'
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Loader2, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSelectedPR } from '../../hooks'

/** Props for ReopenButton - no props needed, subscribes to store */
export type ReopenButtonProps = Record<string, never>

export function ReopenButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const reopenMutation = useReopenPR()
  const [showSuccess, setShowSuccess] = useState(false)

  // Derive state from PR - must be computed unconditionally
  const isClosed = pr?.state === 'CLOSED'
  const isMerged = pr?.state === 'MERGED'

  // Only show for closed (not merged) PRs
  const shouldShow = isClosed && !isMerged

  // Determine button state - useMemo must be called unconditionally
  const getButtonState = useMemo(() => {
    if (!pr) {
      return {
        canReopen: false,
        reason: 'No PR selected'
      }
    }

    if (isMerged) {
      return {
        canReopen: false,
        reason: 'Cannot reopen a merged PR'
      }
    }

    if (!isClosed) {
      return {
        canReopen: false,
        reason: 'PR is already open'
      }
    }

    return {
      canReopen: true,
      reason: 'Reopen this PR'
    }
  }, [pr, isClosed, isMerged])

  const handleReopen = () => {
    if (!pr) return

    reopenMutation.mutate(pr.id, {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    })
  }

  const isSubmitting = reopenMutation.isPending
  const error = reopenMutation.error?.message || null

  // Early returns AFTER all hooks
  if (!pr) return null
  if (!shouldShow) return null

  const { canReopen, reason } = getButtonState

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={showSuccess ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-7 px-3 gap-1.5 font-medium',
            canReopen && 'hover:bg-interactive-hover hover:text-primary hover:border-primary',
            showSuccess && 'bg-green-600 hover:bg-green-600 text-white'
          )}
          onClick={handleReopen}
          disabled={!canReopen || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          <span className="text-xs">
            {isSubmitting ? 'Reopening...' : showSuccess ? 'Reopened!' : 'Reopen'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {canReopen ? (
          <p className="font-medium">Reopen Pull Request</p>
        ) : (
          <>
            <p className="font-medium">Cannot Reopen</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
