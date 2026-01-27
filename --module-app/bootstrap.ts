/**
 * @codelobby/app - Bootstrap
 *
 * Simply imports all UI modules to trigger their self-registration to slots.
 * No data-module or IPC needed - everything is TanStack Query.
 */

// Import modules to trigger their self-registration to slots
import '@header'
import '@explorer'
import '@canvas'
import '@pr-detail'
import '@ai-chat'
import '@network'

/**
 * Initialize the app.
 * Just imports modules - data is handled by TanStack Query.
 */
export function bootstrap(): void {
  // App initialized
}
