/**
 * @codelobby/pr-detail-module
 *
 * PR detail panel using TanStack Query.
 */

import {
  useIsAuthenticated,
  usePRDetailPanel,
  useSelectedPRId,
  useSelectPR,
  useSetPRDetailPanel,
  useViewMode
} from '@data'
import { registerToSlot } from '@slot-system'
import { GitPullRequest } from 'lucide-react'
import { PRDetail } from './components/PRDetail'

export { PRDetail } from './components/PRDetail'
export { useCurrentUser, useSelectedPR } from './hooks'

function _PRDetailWrapper() {
  const { data: selectedPRId } = useSelectedPRId()
  const selectPR = useSelectPR()

  if (!selectedPRId) {
    return null
  }

  const handleClose = () => {
    selectPR.mutate(null)
  }

  return <PRDetail onClose={handleClose} />
}

function IDEMainContent() {
  const { data: selectedPRId } = useSelectedPRId()
  const { data: viewMode } = useViewMode()
  const { isAuthenticated } = useIsAuthenticated()
  const selectPR = useSelectPR()

  // Only render in IDE mode when authenticated
  if (viewMode !== 'ide' || !isAuthenticated) {
    return null
  }

  if (!selectedPRId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center">
            <GitPullRequest className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Select a Pull Request</p>
            <p className="text-sm text-muted-foreground/70 max-w-[300px]">
              Click on a PR in the explorer to view its details, CI status, comments, and reviews
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleClose = () => {
    selectPR.mutate(null)
  }

  return <PRDetail onClose={handleClose} />
}

function CanvasPRDetail() {
  const { data: selectedPRId } = useSelectedPRId()
  const { data: viewMode } = useViewMode()
  const { data: prDetailPanel } = usePRDetailPanel()
  const selectPR = useSelectPR()
  const setPRDetailPanel = useSetPRDetailPanel()

  // Only render in canvas mode with panel open and PR selected
  if (viewMode !== 'canvas' || !prDetailPanel?.isOpen || !selectedPRId) {
    return null
  }

  const handleClose = () => {
    // In canvas mode, close both deselects the PR and closes the panel
    selectPR.mutate(null)
    setPRDetailPanel.mutate({ isOpen: false })
  }

  return <PRDetail onClose={handleClose} />
}

// Register to main slot for IDE mode
registerToSlot({
  id: 'pr-detail-ide',
  slot: 'main',
  component: IDEMainContent,
  order: 10
})

// Register to pr-detail-panel slot for Canvas mode
registerToSlot({
  id: 'pr-detail-canvas',
  slot: 'pr-detail-panel',
  component: CanvasPRDetail,
  order: 0
})
