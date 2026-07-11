/**
 * @codelobby/header-module
 *
 * Self-contained header module using TanStack Query.
 */

import {
  useAboutModalOpen,
  useAIPanel,
  useDatabaseViewerOpen,
  useSetAboutModalOpen,
  useSetAIPanel,
  useSetDatabaseViewerOpen,
  useSetViewMode,
  useSignOut,
  useViewMode,
  type ViewMode
} from '@data'
import { registerToSlot } from '@slot-system'
import { AboutDialog } from './components/AboutDialog'
import { DatabaseViewer } from './components/DatabaseViewer'
import { Header } from './components/Header'

export { AboutDialog } from './components/AboutDialog'
export { ContributionsModal } from './components/ContributionsModal'
export { EventStream } from './components/EventStream'
export { Header } from './components/Header'
export { LogsViewer } from './components/LogsViewer'
export { RepoSelector } from './components/RepoSelector'

/**
 * HeaderWrapper connects the Header component to TanStack Query.
 */
function HeaderWrapper() {
  const { data: viewMode = 'canvas' } = useViewMode()
  const { data: aiPanelData } = useAIPanel()
  const isAIPanelOpen = aiPanelData?.isOpen ?? false

  // About modal is opened from the native "About CodeLobby" menu item.
  // useAboutModalOpen subscribes to the menu IPC event and flips this state.
  const { data: isAboutOpen = false } = useAboutModalOpen()
  const setAboutModalOpen = useSetAboutModalOpen()

  // Database Viewer is opened from the native "Database Viewer" menu item (View menu).
  const { data: isDatabaseViewerOpen = false } = useDatabaseViewerOpen()
  const setDatabaseViewerOpen = useSetDatabaseViewerOpen()

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
    <>
      <Header
        onLogout={handleLogout}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isAIPanelOpen={isAIPanelOpen}
        onToggleAIPanel={handleToggleAIPanel}
      />
      <AboutDialog open={isAboutOpen} onOpenChange={(open) => setAboutModalOpen.mutate(open)} />
      <DatabaseViewer
        open={isDatabaseViewerOpen}
        onOpenChange={(open) => setDatabaseViewerOpen.mutate(open)}
      />
    </>
  )
}

// Self-register to the header slot
registerToSlot({
  id: 'header',
  slot: 'header',
  component: HeaderWrapper,
  order: 0
})
