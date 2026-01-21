/**
 * @codelobby/header-module
 *
 * Self-contained header module with all components.
 */

import type { ViewMode } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { Header } from './components/Header'

export { AboutDialog } from './components/AboutDialog'
export { EventStream } from './components/EventStream'
// Re-export components for external use
export { Header } from './components/Header'
export { LogsViewer } from './components/LogsViewer'
export { RepoSelector } from './components/RepoSelector'

/**
 * HeaderWrapper connects the Header component to the shared store.
 */
function HeaderWrapper() {
  const user = useSignal(Store.user)
  const viewMode = useSignal(Store.viewMode)
  const isAIPanelOpen = useSignal(Store.aiPanelOpen)

  const handleLogout = () => {
    Actions.signOut()
  }

  const handleViewModeChange = (mode: ViewMode) => {
    Actions.setViewMode(mode)
  }

  const handleToggleAIPanel = () => {
    Actions.toggleAIPanel()
  }

  return (
    <Header
      user={user}
      onLogout={handleLogout}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      isAIPanelOpen={isAIPanelOpen}
      onToggleAIPanel={handleToggleAIPanel}
    />
  )
}

// Self-register to the header slot
registerToSlot({
  id: 'header',
  slot: 'header',
  component: HeaderWrapper,
  order: 0
})
