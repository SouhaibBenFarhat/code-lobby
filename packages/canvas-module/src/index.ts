/**
 * @codelobby/canvas-module
 *
 * Canvas module for CodeLobby.
 * Currently re-exports the existing PRGrid component.
 *
 * The slot registration is disabled for now because the existing App.tsx
 * renders the PRGrid directly. When we fully migrate to the modular
 * architecture, we can enable the slot registration.
 */

// Re-export the existing component for direct use
export { PRGrid } from '@/components/PRGrid'

// Slot registration (disabled - App.tsx renders directly for now)
// import { registerToSlot } from '@codelobby/slot-system'
// import { Store } from '@codelobby/shared-store'
// 
// registerToSlot({
//   id: 'canvas',
//   slot: 'main',
//   component: PRGridWrapper,
//   order: 0,
//   visible: () => Store.viewMode.value === 'canvas'
// })
