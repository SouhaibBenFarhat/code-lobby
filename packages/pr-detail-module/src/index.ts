/**
 * @codelobby/pr-detail-module
 *
 * Self-registering PR Detail panel module for CodeLobby.
 * Registers to the 'right-panel' slot on import.
 * Only visible when a PR is selected.
 */

import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { PRDetail } from './PRDetail'

// Self-register to the 'right-panel' slot
// Only visible when a PR is selected and the panel is open
registerToSlot({
  id: 'pr-detail',
  slot: 'right-panel',
  component: PRDetail,
  order: 1, // Before AI Chat (order: 2)
  visible: () => Store.prDetailOpen.value && Store.selectedPR.value !== null
})

// Export for direct use in tests
export { PRDetail }
