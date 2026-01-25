/**
 * ConvertToDraftButton - Converts an open PR to draft.
 *
 * Uses TanStack mutations for converting to draft.
 */

import { useConvertPRToDraft } from '@codelobby/data'
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { FileEdit, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSelectedPR } from '../../hooks'

/** Props for ConvertToDraftButton - no props needed, subscribes to store */
export type ConvertToDraftButtonProps = Record<string, never>

export function ConvertToDraftButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const convertMutation = useConvertPRToDraft()
  const [showSuccess, setShowSuccess] = useState(false)

  // Derive state from PR - must be computed unconditionally
  const isDraft = pr?.draft ?? false
  const isOpen = pr?.state === 'OPEN'
  const isMerged = pr?.state === 'MERGED'
  const isClosed = pr?.state === 'CLOSED'

  // Only show for open non-draft PRs that aren't merged
  const shouldShow = isOpen && !isDraft && !isMerged

  // Determine button state - useMemo must be called unconditionally
  const getButtonState = useMemo(() => {
    if (!pr) {
      return {
        canConvert: false,
        reason: 'No PR selected'
      }
    }

    if (isMerged) {
      return {
        canConvert: false,
        reason: 'Cannot convert a merged PR to draft'
      }
    }

    if (isClosed) {
      return {
        canConvert: false,
        reason: 'Cannot convert a closed PR to draft'
      }
    }

    if (isDraft) {
      return {
        canConvert: false,
        reason: 'PR is already a draft'
      }
    }

    if (!isOpen) {
      return {
        canConvert: false,
        reason: 'PR must be open to convert to draft'
      }
    }

    return {
      canConvert: true,
      reason: 'Convert this PR to draft'
    }
  }, [pr, isOpen, isDraft, isMerged, isClosed])

  const handleConvert = () => {
    if (!pr) return

    convertMutation.mutate(pr.id, {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    })
  }

  const isSubmitting = convertMutation.isPending
  const error = convertMutation.error?.message || null

  // Early returns AFTER all hooks
  if (!pr) return null
  if (!shouldShow) return null

  const { canConvert, reason } = getButtonState

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={showSuccess ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-7 px-3 gap-1.5 font-medium',
            canConvert && 'hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500/50',
            showSuccess && 'bg-yellow-600 hover:bg-yellow-600 text-white'
          )}
          onClick={handleConvert}
          disabled={!canConvert || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileEdit className="w-3.5 h-3.5" />
          )}
          <span className="text-xs">
            {isSubmitting ? 'Converting...' : showSuccess ? 'Converted!' : 'Convert to Draft'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {canConvert ? (
          <p className="font-medium">Convert to Draft</p>
        ) : (
          <>
            <p className="font-medium">Cannot Convert</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
