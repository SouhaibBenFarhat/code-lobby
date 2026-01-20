/**
 * @codelobby/ai-chat-module
 *
 * Self-registering AI Chat module for CodeLobby.
 * Registers to the 'right-panel' slot on import.
 */

import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { AIChat } from './AIChat'

// Self-register to the 'right-panel' slot
// Only visible when AI panel is open
registerToSlot({
  id: 'ai-chat',
  slot: 'right-panel',
  component: AIChat,
  order: 2, // After PR Detail (order: 1)
  visible: () => Store.aiPanelOpen.value
})

// Export for direct use in tests
export { AIChat }
