/**
 * @codelobby/canvas-module
 *
 * Canvas view with draggable repository cards using TanStack Query.
 */

import { useIsAuthenticated, useUser, useViewMode } from '@codelobby/data'
import { registerToSlot } from '@codelobby/slot-system'
import { PRGrid } from './components/PRGrid'

export { PRCard } from './components/PRCard'
export { PRGrid } from './components/PRGrid'
export { RepoCard } from './components/RepoCard'

function CanvasWrapper() {
  const { data: authData } = useUser()
  const { data: viewMode } = useViewMode()
  const { isAuthenticated } = useIsAuthenticated()

  // Only render in canvas mode when authenticated
  if (viewMode !== 'canvas' || !isAuthenticated) {
    return null
  }

  return <PRGrid currentUser={authData?.user?.login || null} />
}

// Self-register to the main slot (visibility handled in component)
registerToSlot({
  id: 'canvas',
  slot: 'main',
  component: CanvasWrapper,
  order: 0
})
