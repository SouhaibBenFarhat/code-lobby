/**
 * @codelobby/user-profile-module
 *
 * Self-contained user profile panel using TanStack Query.
 * Shows user avatar, contributions, and activity heatmap.
 */

import { useIsAuthenticated, useSetUserProfilePanel, useViewMode } from '@data'
import { registerToSlot } from '@slot-system'
import { UserProfilePanel } from './components/UserProfilePanel'

export { UserProfilePanel } from './components/UserProfilePanel'

function UserProfileWrapper() {
  const { data: viewMode } = useViewMode()
  const { isAuthenticated } = useIsAuthenticated()
  const setUserProfilePanel = useSetUserProfilePanel()

  // Visibility and the open/close slide lifecycle are owned by App.tsx (same as
  // the ai-chat and network modules). Staying mounted regardless of the open
  // flag lets the content ride the shell's slide-out instead of vanishing on
  // close. Gating on `isOpen` here would unmount the content on the first frame
  // of the close, defeating App's usePanelPresence slide deferral.
  if (viewMode !== 'ide' || !isAuthenticated) {
    return null
  }

  return <UserProfilePanel onClose={() => setUserProfilePanel.mutate({ isOpen: false })} />
}

// Self-register to the user-profile slot
registerToSlot({
  id: 'user-profile',
  slot: 'user-profile',
  component: UserProfileWrapper,
  order: 0
})
