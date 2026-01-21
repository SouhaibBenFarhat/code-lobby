/**
 * @codelobby/canvas-module
 *
 * Canvas view with draggable repository cards.
 * Fully self-contained with its own components using shared-store.
 */

import { Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { PRGrid } from './components/PRGrid'

export { PRCard } from './components/PRCard'
// Re-export components
export { PRGrid } from './components/PRGrid'
export { RepoCard } from './components/RepoCard'

/**
 * CanvasWrapper connects PRGrid to the shared store.
 */
function CanvasWrapper() {
  const user = useSignal(Store.user)
  return <PRGrid currentUser={user?.login || null} />
}

// Self-register to the main slot (only visible in canvas view mode)
registerToSlot({
  id: 'canvas',
  slot: 'main',
  component: CanvasWrapper,
  order: 0,
  visible: () => {
    const viewMode = Store.viewMode.value
    const isAuthenticated = Store.isAuthenticated.value
    return viewMode === 'canvas' && isAuthenticated
  }
})
