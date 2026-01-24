/**
 * @codelobby/app - Bootstrap
 *
 * This module initializes the application:
 * 1. Sets up network request tracking from main process (actual API calls)
 * 2. Initializes the data module (connects actions to IPC)
 * 3. Imports all UI modules (triggers their self-registration to slots)
 *
 * Call this once before rendering the App.
 */

// Initialize data module first (it handles IPC and populates the store)
import { initDataModule } from '@codelobby/data-module'
import { Actions, Store } from '@codelobby/shared-store'

// Import modules to trigger their self-registration to slots
// The order doesn't matter - each module registers itself to the appropriate slot
import '@codelobby/header-module'
import '@codelobby/explorer-module'
import '@codelobby/canvas-module'
import '@codelobby/pr-detail-module'
import '@codelobby/ai-chat-module'
import '@codelobby/network-module'

/**
 * Initialize all modules and data layer.
 * Call this once at app startup.
 */
export function bootstrap(): void {
  console.log('[bootstrap] Initializing CodeLobby...')

  // Initialize the data module (connects actions to store)
  initDataModule()

  // Listen for ACTUAL network requests from main process
  // This is the single source of truth for API calls that hit GitHub
  window.electron.onNetworkRequest((event) => {
    const requests = Store.networkRequests.value

    if (event.status === 'pending') {
      // New request started
      Store.networkRequests.value = [
        {
          id: event.id,
          method: event.method,
          status: 'pending',
          startTime: event.startTime,
          httpMethod: event.httpMethod,
          url: event.url,
          requestBody: event.requestBody
        },
        ...requests
      ].slice(0, 100) // Keep last 100
    } else {
      // Request completed (success or error)
      const existing = requests.find((r) => r.id === event.id)
      if (existing) {
        // Update existing pending request
        Store.networkRequests.value = requests.map((r) =>
          r.id === event.id
            ? {
                ...r,
                status: event.status,
                durationMs: event.durationMs,
                httpMethod: event.httpMethod || r.httpMethod,
                url: event.url || r.url,
                statusCode: event.statusCode,
                cost: event.cost,
                rateLimit: event.rateLimit,
                error: event.error,
                requestBody: event.requestBody || r.requestBody,
                responseBody: event.responseBody
              }
            : r
        )
      } else {
        // Add completed request (if pending wasn't received)
        Store.networkRequests.value = [
          {
            id: event.id,
            method: event.method,
            status: event.status,
            startTime: event.startTime,
            durationMs: event.durationMs,
            httpMethod: event.httpMethod,
            url: event.url,
            statusCode: event.statusCode,
            cost: event.cost,
            rateLimit: event.rateLimit,
            error: event.error,
            requestBody: event.requestBody,
            responseBody: event.responseBody
          },
          ...requests
        ].slice(0, 100)
      }
    }
  })

  // Validate the user's token (triggers initial data load)
  Actions.validateToken()

  console.log('[bootstrap] CodeLobby initialized')
}
