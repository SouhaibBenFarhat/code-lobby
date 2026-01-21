/**
 * @codelobby/pr-detail-module
 *
 * PR detail panel showing comments, reviews, and CI status.
 * Fully self-contained using shared-store.
 *
 * Renders in:
 * - `main` slot when in IDE mode (selected PR details)
 * - `right-panel` slot when in Canvas mode (side panel)
 */

import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { GitPullRequest } from 'lucide-react'
import { PRDetail } from './components/PRDetail'

// Re-export components
export { PRDetail } from './components/PRDetail'

/**
 * PRDetailWrapper connects PRDetail to the shared store.
 * Used in Canvas mode (right panel).
 */
function PRDetailWrapper() {
  const selectedPR = useSignal(Store.selectedPR)

  if (!selectedPR) {
    return null
  }

  const handleClose = () => {
    Actions.selectPR(null)
  }

  return <PRDetail pr={selectedPR} onClose={handleClose} />
}

/**
 * IDEMainContent - Shows PR detail or placeholder in IDE mode.
 * This replaces the old inline rendering in IDEView.
 */
function IDEMainContent() {
  const selectedPR = useSignal(Store.selectedPR)

  if (!selectedPR) {
    // Placeholder when no PR is selected
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
    Actions.selectPR(null)
  }

  return <PRDetail pr={selectedPR} onClose={handleClose} />
}

// Register to main slot for IDE mode
registerToSlot({
  id: 'pr-detail-ide',
  slot: 'main',
  component: IDEMainContent,
  order: 10, // After canvas (if both were visible)
  visible: () => {
    const viewMode = Store.viewMode.value
    const isAuthenticated = Store.isAuthenticated.value
    return viewMode === 'ide' && isAuthenticated
  }
})

// Register to pr-detail-panel slot for Canvas mode
registerToSlot({
  id: 'pr-detail-canvas',
  slot: 'pr-detail-panel',
  component: PRDetailWrapper,
  order: 0,
  visible: () => {
    const viewMode = Store.viewMode.value
    const prDetailOpen = Store.prDetailOpen.value
    const selectedPR = Store.selectedPR.value
    return viewMode === 'canvas' && prDetailOpen && selectedPR !== null
  }
})
