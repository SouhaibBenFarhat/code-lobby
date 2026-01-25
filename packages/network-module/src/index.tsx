/**
 * @codelobby/network-module
 *
 * Network monitoring module - displays API calls, costs, and timing information.
 * Self-contained module using TanStack Query.
 */

import { useToggleNetworkPanel } from '@codelobby/data'
import { registerToSlot } from '@codelobby/slot-system'
import { NetworkPanel } from './components'
import { useNetworkTracking } from './hooks'

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  CopyButtonProps,
  ListFooterProps,
  NetworkPanelHeaderProps,
  NetworkPanelProps,
  NetworkRequestItemProps,
  NetworkRequestListProps,
  NetworkSearchInputProps,
  NetworkStatsProps
} from './components'
// Components
export {
  CopyButton,
  ListFooter,
  NetworkPanel,
  NetworkPanelHeader,
  NetworkRequestItem,
  NetworkRequestList,
  NetworkSearchInput,
  NetworkStats
} from './components'
// Hooks
export { useNetworkTracking } from './hooks'
// Utils
export {
  calculateTotals,
  filterRequests,
  formatDuration,
  formatJsonBody,
  getMethodColor
} from './utils'

// ═══════════════════════════════════════════════════════════════════════════
// SLOT SYSTEM INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NetworkPanelWrapper connects NetworkPanel to TanStack Query.
 * Visibility and height are controlled by App.tsx.
 * Also subscribes to TanStack Query cache to track all API calls.
 */
function NetworkPanelWrapper(): React.JSX.Element {
  const toggleNetworkPanel = useToggleNetworkPanel()

  // Subscribe to TanStack Query cache to track all API calls
  useNetworkTracking()

  const handleClose = (): void => {
    toggleNetworkPanel.mutate()
  }

  return (
    <div className="bg-background h-full overflow-hidden">
      <NetworkPanel onClose={handleClose} />
    </div>
  )
}

// Self-register to the network-panel slot
registerToSlot({
  id: 'network-panel',
  slot: 'network-panel',
  component: NetworkPanelWrapper,
  order: 0
})
