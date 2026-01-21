/**
 * @codelobby/shared-store
 *
 * The "Buffet Table" - global reactive state for CodeLobby.
 *
 * - Data Module writes here (puts food on the table)
 * - UI Modules read from here (guests pick what they need)
 * - No direct communication between modules
 */

export * from './actions'
export { Actions, onAction } from './actions'
export * from './store'

// Named exports for convenience
export { createSignal, Store, useSignal } from './store'
// Re-export everything
export * from './types'
