/**
 * @codelobby/header-module
 *
 * Self-contained header module using TanStack Query.
 */

import {
  useAIPanel,
  useCurrentUser,
  useSetAIPanel,
  useSetViewMode,
  useSignOut,
  useViewMode,
  type ViewMode
} from '@codelobby/data'
import { registerToSlot } from '@codelobby/slot-system'
import { Header } from './components/Header'

export { AboutDialog } from './components/AboutDialog'
export { EventStream } from './components/EventStream'
export { Header } from './components/Header'
export { LogsViewer } from './components/LogsViewer'
export { RepoSelector } from './components/RepoSelector'

/**
 * HeaderWrapper connects the Header component to TanStack Query.
 */
function HeaderWrapper() {
  const { data: user } = useCurrentUser()
  const { data: viewMode = 'canvas' } = useViewMode()
  const { data: aiPanelData } = useAIPanel()
  const isAIPanelOpen = aiPanelData?.isOpen ?? false

  const setViewMode = useSetViewMode()
  const setAIPanel = useSetAIPanel()
  const signOut = useSignOut()

  const handleLogout = () => {
    signOut.mutate()
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode.mutate(mode)
  }

  const handleToggleAIPanel = () => {
    setAIPanel.mutate({ isOpen: !isAIPanelOpen })
  }

  return (
    <Header
      user={user ?? null}
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
