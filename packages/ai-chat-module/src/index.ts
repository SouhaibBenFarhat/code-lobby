/**
 * @codelobby/ai-chat-module
 *
 * AI Chat module for CodeLobby.
 * Currently re-exports the existing AIChatPanel component.
 *
 * The slot registration is disabled for now because the existing App.tsx
 * renders the AIChatPanel directly. When we fully migrate to the modular
 * architecture, we can enable the slot registration.
 */

// Re-export the existing component for direct use
export { AIChatPanel } from '@/components/AIChat'

// Slot registration (disabled - App.tsx renders directly for now)
// import { registerToSlot } from '@codelobby/slot-system'
// import { Store } from '@codelobby/shared-store'
// 
// registerToSlot({
//   id: 'ai-chat',
//   slot: 'right-panel',
//   component: AIChatWrapper,
//   order: 2,
//   visible: () => Store.aiPanelOpen.value
// })
