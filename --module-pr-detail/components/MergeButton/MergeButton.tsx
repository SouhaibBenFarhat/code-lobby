/**
 * MergeButton - PR merge button with confirmation popover and method selection.
 *
 * Uses TanStack mutations for merging.
 */

import { type MergeMethod, useMergePR } from '@data'
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
import { AlertCircle, Check, GitMerge, Loader2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSelectedPR } from '../../hooks'

/** Props for MergeButton - no props needed, subscribes to store */
export type MergeButtonProps = Record<string, never>

export function MergeButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const mergeMutation = useMergePR()
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('SQUASH')
  const [showConfirm, setShowConfirm] = useState(false)

  // Derive state unconditionally (before hooks)
  const mergeable = pr?.mergeable
  const mergeState = pr?.mergeStateStatus
  const reviewDecision = pr?.reviewDecision
  const isDraft = pr?.draft

  // Determine if merge is possible and why not - useMemo must be called unconditionally
  const getMergeStatus = useMemo(() => {
    // No PR selected
    if (!pr) {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'No PR selected',
        variant: 'secondary' as const
      }
    }

    // Computing state
    if (mergeable === 'UNKNOWN' || mergeState === 'UNKNOWN') {
      return {
        canMerge: false,
        isComputing: true,
        reason: 'Checking merge status...',
        variant: 'secondary' as const
      }
    }

    // Draft PRs cannot be merged
    if (isDraft || mergeState === 'DRAFT') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Cannot merge draft PR',
        variant: 'secondary' as const
      }
    }

    // Has conflicts
    if (mergeable === 'CONFLICTING' || mergeState === 'DIRTY') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Has merge conflicts',
        variant: 'destructive' as const
      }
    }

    // Branch protection blocking
    if (mergeState === 'BLOCKED') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Blocked by branch protection',
        variant: 'secondary' as const
      }
    }

    // Behind base branch
    if (mergeState === 'BEHIND') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Branch is behind base',
        variant: 'secondary' as const
      }
    }

    // Failing required status checks
    if (mergeState === 'UNSTABLE') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Required checks failing',
        variant: 'destructive' as const
      }
    }

    // Review requirements
    if (reviewDecision === 'CHANGES_REQUESTED') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Changes requested',
        variant: 'secondary' as const
      }
    }

    if (reviewDecision === 'REVIEW_REQUIRED') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Review required',
        variant: 'secondary' as const
      }
    }

    // Pre-receive hooks pending
    if (mergeState === 'HAS_HOOKS') {
      return {
        canMerge: false,
        isComputing: false,
        reason: 'Waiting for hooks...',
        variant: 'secondary' as const
      }
    }

    // All checks passed - can merge
    if (mergeState === 'CLEAN' && mergeable === 'MERGEABLE') {
      return {
        canMerge: true,
        isComputing: false,
        reason: reviewDecision === 'APPROVED' ? 'Approved' : 'Ready to merge',
        variant: 'default' as const
      }
    }

    // Default case
    return {
      canMerge: mergeable === 'MERGEABLE',
      isComputing: false,
      reason: mergeable === 'MERGEABLE' ? 'Ready to merge' : 'Cannot merge',
      variant: mergeable === 'MERGEABLE' ? ('default' as const) : ('secondary' as const)
    }
  }, [pr, mergeable, mergeState, reviewDecision, isDraft])

  const handleMerge = () => {
    if (!pr) return

    mergeMutation.mutate(
      { prNodeId: pr.id, mergeMethod },
      {
        onSuccess: () => setShowConfirm(false),
        onError: () => {
          // Error is already captured in mergeMutation.error
          // Just ensure popover stays open so user sees the error
        }
      }
    )
  }

  // Early return AFTER all hooks
  if (!pr) return null

  const { canMerge, isComputing, reason, variant } = getMergeStatus
  const isMerging = mergeMutation.isPending
  const mergeError = mergeMutation.error?.message || null

  // Button states
  const isDisabled = !canMerge || isMerging || isComputing

  return (
    <Popover open={showConfirm} onOpenChange={setShowConfirm}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={canMerge ? 'default' : variant}
              size="sm"
              className={cn(
                'h-7 px-3 gap-1.5 font-medium',
                canMerge && 'bg-success hover:bg-success/90 text-success-foreground',
                isComputing && 'animate-pulse'
              )}
              disabled={isDisabled}
            >
              {isMerging || isComputing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitMerge className="w-3.5 h-3.5" />
              )}
              <span className="text-xs">{isMerging ? 'Merging...' : 'Merge'}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          {canMerge ? (
            <p className="font-medium">Merge Pull Request</p>
          ) : (
            <>
              <p className="font-medium">Cannot Merge</p>
              <p className="text-xs text-muted-foreground">{reason}</p>
            </>
          )}
        </TooltipContent>
      </Tooltip>

      <PopoverContent side="bottom" align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Confirm Merge</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowConfirm(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This will merge <span className="font-mono">{pr.head.ref}</span> into{' '}
            <span className="font-mono">{pr.base.ref}</span>
          </p>

          {/* Merge method selection */}
          <fieldset className="border-0 p-0 m-0">
            <legend className="text-xs font-medium mb-1.5">Merge method</legend>
            <div className="flex gap-1.5">
              {(['SQUASH', 'MERGE', 'REBASE'] as MergeMethod[]).map((method) => (
                <Button
                  key={method}
                  variant={mergeMethod === method ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setMergeMethod(method)}
                >
                  {method === 'SQUASH' ? 'Squash' : method === 'MERGE' ? 'Merge' : 'Rebase'}
                </Button>
              ))}
            </div>
          </fieldset>

          {mergeError && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{mergeError}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
              disabled={isMerging}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-success hover:bg-success/90"
              onClick={handleMerge}
              disabled={isMerging}
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Merging...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
