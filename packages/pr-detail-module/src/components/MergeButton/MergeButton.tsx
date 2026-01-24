/**
 * MergeButton - PR merge button with confirmation popover and method selection.
 */

import type { MergeMethod, PullRequest } from '@codelobby/shared-store'
import { Button, Col, cn, Row, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { AlertCircle, Check, GitMerge, Loader2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

export interface MergeButtonProps {
  pr: PullRequest
  onMergeComplete?: () => void
}

export function MergeButton({ pr, onMergeComplete }: MergeButtonProps): React.JSX.Element {
  const [isMerging, setIsMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('SQUASH')
  const [showConfirm, setShowConfirm] = useState(false)

  const mergeable = pr.mergeable
  const mergeState = pr.mergeStateStatus
  const reviewDecision = pr.reviewDecision

  // Determine if merge is possible and why not
  const getMergeStatus = useMemo(() => {
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
    if (pr.draft || mergeState === 'DRAFT') {
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
  }, [mergeable, mergeState, reviewDecision, pr.draft])

  const handleMerge = useCallback(async () => {
    setIsMerging(true)
    setMergeError(null)

    try {
      const result = await window.electron.mergePR(
        pr.id, // GraphQL node ID
        mergeMethod
      )

      if (result.success) {
        setShowConfirm(false)
        onMergeComplete?.()
      } else {
        setMergeError(result.error || 'Failed to merge PR')
      }
    } catch (error) {
      setMergeError((error as Error).message)
    } finally {
      setIsMerging(false)
    }
  }, [pr.id, mergeMethod, onMergeComplete])

  const { canMerge, isComputing, reason, variant } = getMergeStatus

  // Button states
  const isDisabled = !canMerge || isMerging || isComputing

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={canMerge ? 'default' : variant}
            size="sm"
            className={cn(
              'h-7 px-3 gap-1.5 font-medium',
              canMerge && 'bg-success hover:bg-success/90 text-success-foreground',
              isComputing && 'animate-pulse'
            )}
            onClick={() => canMerge && setShowConfirm(true)}
            disabled={isDisabled}
          >
            {isMerging || isComputing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitMerge className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">{isMerging ? 'Merging...' : 'Merge'}</span>
          </Button>
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

      {/* Merge confirmation popover */}
      {showConfirm && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 p-3 bg-popover border border-border rounded-lg shadow-lg">
          <Row gutter="md" className="flex-col">
            <Col span="full">
              <Row gutter="sm" align="center" justify="between">
                <Col>
                  <span className="text-sm font-medium">Confirm Merge</span>
                </Col>
                <Col span="auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowConfirm(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </Col>
              </Row>
            </Col>

            <Col span="full">
              <p className="text-xs text-muted-foreground">
                This will merge <span className="font-mono">{pr.head.ref}</span> into{' '}
                <span className="font-mono">{pr.base.ref}</span>
              </p>
            </Col>

            {/* Merge method selection */}
            <Col span="full">
              <fieldset className="border-0 p-0 m-0">
                <Row gutter="xs" className="flex-col">
                  <Col span="full">
                    <legend className="text-xs font-medium">Merge method</legend>
                  </Col>
                  <Col span="full">
                    <Row gutter="xs">
                      {(['SQUASH', 'MERGE', 'REBASE'] as MergeMethod[]).map((method) => (
                        <Col key={method}>
                          <Button
                            variant={mergeMethod === method ? 'default' : 'outline'}
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => setMergeMethod(method)}
                          >
                            {method === 'SQUASH'
                              ? 'Squash'
                              : method === 'MERGE'
                                ? 'Merge'
                                : 'Rebase'}
                          </Button>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
              </fieldset>
            </Col>

            {mergeError && (
              <Col span="full">
                <Row
                  gutter="sm"
                  align="start"
                  className="p-2 bg-destructive/10 rounded text-xs text-destructive"
                >
                  <Col span="auto">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  </Col>
                  <Col>
                    <span>{mergeError}</span>
                  </Col>
                </Row>
              </Col>
            )}

            <Col span="full">
              <Row gutter="sm">
                <Col>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowConfirm(false)}
                    disabled={isMerging}
                  >
                    Cancel
                  </Button>
                </Col>
                <Col>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-success hover:bg-success/90"
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
                </Col>
              </Row>
            </Col>
          </Row>
        </div>
      )}
    </div>
  )
}
