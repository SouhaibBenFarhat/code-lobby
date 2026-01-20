/**
 * @codelobby/header-module
 *
 * Self-registering Header module for CodeLobby.
 * Registers to the 'header' slot on import.
 */

import { registerToSlot } from '@codelobby/slot-system'
import { Header } from './Header'

// Self-register to the 'header' slot
registerToSlot({
  id: 'header',
  slot: 'header',
  component: Header,
  order: 0
})

// Export for direct use in tests
export { Header }
