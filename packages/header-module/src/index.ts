/**
 * @codelobby/header-module
 *
 * Header module for CodeLobby.
 * Currently re-exports the existing Header component.
 *
 * The slot registration is disabled for now because the existing App.tsx
 * renders the Header directly. When we fully migrate to the modular
 * architecture, we can enable the slot registration.
 */

// Re-export the existing component for direct use
export { Header } from '@/components/Header'

// Slot registration (disabled - App.tsx renders directly for now)
// import { registerToSlot } from '@codelobby/slot-system'
// import { HeaderWrapper } from './HeaderWrapper'
// 
// registerToSlot({
//   id: 'header',
//   slot: 'header',
//   component: HeaderWrapper,
//   order: 0
// })
