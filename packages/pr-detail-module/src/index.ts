/**
 * @codelobby/pr-detail-module
 *
 * PR Detail module for CodeLobby.
 * Currently re-exports the existing PRDetail component.
 *
 * The slot registration is disabled for now because the existing App.tsx
 * renders the PRDetail directly. When we fully migrate to the modular
 * architecture, we can enable the slot registration.
 */

// Re-export the existing component for direct use
export { PRDetail } from '@/components/PRDetail'

// Slot registration (disabled - App.tsx renders directly for now)
// import { registerToSlot } from '@codelobby/slot-system'
// import { Store } from '@codelobby/shared-store'
// 
// registerToSlot({
//   id: 'pr-detail',
//   slot: 'right-panel',
//   component: PRDetailWrapper,
//   order: 1,
//   visible: () => Store.prDetailOpen.value && Store.selectedPR.value !== null
// })
