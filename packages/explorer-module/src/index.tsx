/**
 * @codelobby/explorer-module
 *
 * IDE-style file tree view of repositories and PRs.
 */

import { Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { IDEView } from './components/IDEView'

// Re-export components
export { IDEView } from './components/IDEView'

/**
 * ExplorerWrapper connects the IDEView to the shared store.
 */
function ExplorerWrapper() {
  const user = useSignal(Store.user)
  return <IDEView currentUser={user?.login || null} />
}

// Self-register to the left-panel slot (only visible in IDE view mode)
registerToSlot({
  id: 'explorer',
  slot: 'left-panel',
  component: ExplorerWrapper,
  order: 0,
  visible: () => {
    const viewMode = Store.viewMode.value
    const isAuthenticated = Store.isAuthenticated.value
    return viewMode === 'ide' && isAuthenticated
  }
})
