/**
 * @codelobby/app - Bootstrap
 *
 * This module initializes the application:
 * 1. Initializes the data module (connects actions to IPC)
 * 2. Imports all UI modules (triggers their self-registration to slots)
 *
 * Call this once before rendering the App.
 */

// Initialize data module first (it handles IPC and populates the store)
import { initDataModule } from '@codelobby/data-module'

// Import modules to trigger their self-registration to slots
// The order doesn't matter - each module registers itself to the appropriate slot
import '@codelobby/header-module'
import '@codelobby/explorer-module'
import '@codelobby/canvas-module'
import '@codelobby/pr-detail-module'
import '@codelobby/ai-chat-module'

/**
 * Initialize all modules and data layer.
 * Call this once at app startup.
 */
export function bootstrap(): void {
  console.log('[bootstrap] Initializing CodeLobby...')

  // Initialize the data module (connects actions to store)
  initDataModule()

  // Validate the user's token
  import('@codelobby/shared-store').then(({ Actions }) => {
    Actions.validateToken()
  })

  console.log('[bootstrap] CodeLobby initialized')
}
