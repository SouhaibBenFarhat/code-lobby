/**
 * @codelobby/user-profile-module
 *
 * Self-contained user profile panel using TanStack Query.
 * Shows user avatar, contributions, and activity heatmap.
 */

import { useIsAuthenticated, useUserProfilePanel, useViewMode } from '@data'
import { registerToSlot } from '@slot-system'
import { UserProfilePanel } from './components/UserProfilePanel'

export { UserProfilePanel } from './components/UserProfilePanel'

function UserProfileWrapper() {
  const { data: viewMode } = useViewMode()
  const { isAuthenticated } = useIsAuthenticated()
  const { data: panelData } = useUserProfilePanel()

  // Only render in IDE mode when authenticated and panel is open
  if (viewMode !== 'ide' || !isAuthenticated || !panelData?.isOpen) {
    return null
  }

  return <UserProfilePanel />
}

// Self-register to the user-profile slot
registerToSlot({
  id: 'user-profile',
  slot: 'user-profile',
  component: UserProfileWrapper,
  order: 0
})
