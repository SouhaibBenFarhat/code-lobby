/**
 * @codelobby/canvas-module
 *
 * Self-registering Canvas view module for CodeLobby.
 * Registers to the 'main' slot on import.
 * Only visible in Canvas view mode.
 */

import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { Canvas } from './Canvas'

// Self-register to the 'main' slot
// Only visible when viewMode is 'canvas'
registerToSlot({
  id: 'canvas',
  slot: 'main',
  component: Canvas,
  order: 0,
  visible: () => Store.viewMode.value === 'canvas'
})

// Export for direct use in tests
export { Canvas }
