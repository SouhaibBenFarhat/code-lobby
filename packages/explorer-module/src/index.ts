/**
 * @codelobby/explorer-module
 *
 * Explorer module for CodeLobby.
 * Currently re-exports the existing IDEView component.
 *
 * The slot registration is disabled for now because the existing App.tsx
 * renders the IDEView directly. When we fully migrate to the modular
 * architecture, we can enable the slot registration.
 */

// Re-export the existing component for direct use
export { IDEView } from '@/components/IDEView'

// Slot registration (disabled - App.tsx renders directly for now)
// import { registerToSlot } from '@codelobby/slot-system'
// import { Store } from '@codelobby/shared-store'
// 
// registerToSlot({
//   id: 'explorer',
//   slot: 'left-panel',
//   component: IDEViewWrapper,
//   order: 0,
//   visible: () => Store.viewMode.value === 'ide'
// })
