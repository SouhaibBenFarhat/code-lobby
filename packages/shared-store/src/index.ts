/**
 * @codelobby/shared-store
 *
 * The "Buffet Table" - global reactive state for CodeLobby.
 *
 * - Data Module writes here (puts food on the table)
 * - UI Modules read from here (guests pick what they need)
 * - No direct communication between modules
 */

// Re-export everything
export * from './types'
export * from './store'
export * from './actions'

// Named exports for convenience
export { Store, useSignal, createSignal } from './store'
export { Actions, onAction } from './actions'
