/**
 * @codelobby/app - Bootstrap
 *
 * Simply imports all UI modules to trigger their self-registration to slots.
 * No data-module or IPC needed - everything is TanStack Query.
 */

// Import modules to trigger their self-registration to slots
import '@codelobby/header-module'
import '@codelobby/explorer-module'
import '@codelobby/canvas-module'
import '@codelobby/pr-detail-module'
import '@codelobby/ai-chat-module'
import '@codelobby/network-module'

/**
 * Initialize the app.
 * Just imports modules - data is handled by TanStack Query.
 */
export function bootstrap(): void {
  console.log('[bootstrap] CodeLobby initialized')
}
