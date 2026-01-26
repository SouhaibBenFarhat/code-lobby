/**
 * @codelobby/explorer-module
 *
 * IDE-style file tree view using TanStack Query.
 */

import { useIsAuthenticated, useUser, useViewMode } from '@data'
import { registerToSlot } from '@slot-system'
import { IDEView } from './components/IDEView'

export { IDEView } from './components/IDEView'

function ExplorerWrapper() {
  const { data: authData } = useUser()
  const { data: viewMode } = useViewMode()
  const { isAuthenticated } = useIsAuthenticated()

  // Only render in IDE mode when authenticated
  if (viewMode !== 'ide' || !isAuthenticated) {
    return null
  }

  return <IDEView currentUser={authData?.user?.login || null} />
}

// Self-register to the left-panel slot (visibility handled in component)
registerToSlot({
  id: 'explorer',
  slot: 'left-panel',
  component: ExplorerWrapper,
  order: 0
})
