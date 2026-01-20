/**
 * @codelobby/explorer-module
 *
 * Self-registering Explorer module for CodeLobby.
 * Registers to the 'left-panel' slot on import.
 * Only visible in IDE view mode.
 */

import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { Explorer } from './Explorer'

// Self-register to the 'left-panel' slot
// Only visible when viewMode is 'ide'
registerToSlot({
  id: 'explorer',
  slot: 'left-panel',
  component: Explorer,
  order: 0,
  visible: () => Store.viewMode.value === 'ide'
})

// Export for direct use in tests
export { Explorer }
