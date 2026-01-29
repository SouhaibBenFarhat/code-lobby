/**
 * UpdateBranchButton - Update PR branch with base branch (sync with main).
 *
 * Always rendered when a PR is selected. Allows syncing the branch with base at any time.
 * Uses TanStack mutations for updating.
 */

import { useUpdatePRBranch } from '@data'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { GitPullRequestArrow, Loader2 } from 'lucide-react'

import { useSelectedPR } from '../../hooks'

/** Props for UpdateBranchButton - no props needed, subscribes to store */
export type UpdateBranchButtonProps = Record<string, never>

export function UpdateBranchButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const updateBranchMutation = useUpdatePRBranch()

  // Early return if no PR selected
  if (!pr) return null

  const isUpdating = updateBranchMutation.isPending
  const updateError = updateBranchMutation.error?.message || null

  const handleUpdate = () => {
    const [owner, repo] = pr.base.repo.full_name.split('/')
    updateBranchMutation.mutate({
      owner,
      repo,
      prNumber: pr.number
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 gap-1.5 font-medium"
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <GitPullRequestArrow className="w-3.5 h-3.5" />
          )}
          <span className="text-xs">{isUpdating ? 'Updating...' : 'Update branch'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {updateError ? (
          <>
            <p className="font-medium text-destructive">Update failed</p>
            <p className="text-xs text-muted-foreground">{updateError}</p>
          </>
        ) : (
          <>
            <p className="font-medium">Update branch</p>
            <p className="text-xs text-muted-foreground">
              Merge <span className="font-mono">{pr.base.ref}</span> into{' '}
              <span className="font-mono">{pr.head.ref}</span>
            </p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
