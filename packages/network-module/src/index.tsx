/**
 * @codelobby/network-module
 *
 * Network monitoring module - displays API calls, costs, and timing information.
 * Self-contained module that registers to the slot system.
 *
 * Architecture:
 * - Reads network requests from shared-store
 * - Displays in a resizable panel similar to AI Chat
 * - No cross-imports with other UI modules
 * - Communication via Actions (events)
 */

import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { NetworkPanel } from './components'

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
 * NetworkPanelWrapper connects NetworkPanel to the shared store.
 * This wrapper allows the component to be used with the slot system.
 */
function NetworkPanelWrapper(): React.JSX.Element | null {
  const networkPanelOpen = useSignal(Store.networkPanelOpen)

  // Don't render if panel is closed
  if (!networkPanelOpen) {
    return null
  }

  const handleClose = (): void => {
    Actions.toggleNetworkPanel()
  }

  return <NetworkPanel onClose={handleClose} />
}

// Self-register to the network-panel slot
registerToSlot({
  id: 'network-panel',
  slot: 'network-panel',
  component: NetworkPanelWrapper,
  order: 0,
  visible: () => {
    const networkPanelOpen = Store.networkPanelOpen.value
    const isAuthenticated = Store.isAuthenticated.value
    return networkPanelOpen && isAuthenticated
  }
})
